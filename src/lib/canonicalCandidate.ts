/**
 * P5-1 — READ-TIME canonical-candidate resolution (behind the `canonical_id` flag).
 *
 * The backend has NO canonical human id. One person is scattered across six
 * collections (candidates, candidate_profiles, candidate_accounts,
 * candidate_scores, candidate_role_tags, candidate_journeys), joined only by
 * three partial keys — normalized email, candidate_id, and the one genuine
 * many→one link candidate_accounts.profile_ids[]. This module fans those rows
 * into one human at READ TIME so the candidate-360 view can consume a single
 * identity. It performs ZERO writes: the durable canonical map + merge/unmerge
 * is deferred (P5-4). When two identities merely look like one person (same
 * name, no shared hard key) it emits a soft hint — it never auto-merges them.
 *
 * Tenancy (DPDP): candidate docs carry no workspace_id and /api/scores/all is
 * recruiter-scoped, so an unscoped email/candidate_id join can cross workspace
 * boundaries. Two defenses: (1) when the caller passes a workspaceId, records
 * from a different explicit workspace are dropped so a read never returns
 * another workspace's candidate; (2) every join key is namespaced by workspace,
 * so a merge can never fuse two tenants that happen to share an email. Untagged
 * (null-workspace) records adopt the caller's workspace. This module derives
 * identity from ids/emails only and never logs raw PII.
 *
 * The six records are not all typed on the frontend and no single backend read
 * returns them together, so this resolver is built against a typed input shape
 * (CandidateRecord) that the caller normalizes each source row into. The
 * absence of a unified backend payload is the documented gap (see the P5 map).
 */

/** The collection a scattered record came from. Doubles as the drill-in target. */
export type CandidateRecordSource =
  | "candidates"
  | "candidate_profiles"
  | "candidate_accounts"
  | "candidate_scores"
  | "candidate_role_tags"
  | "candidate_journeys";

/**
 * One scattered per-record row normalized into the identity signals it carries.
 * The caller maps each source doc into this shape; any field it lacks is null.
 */
export interface CandidateRecord {
  /** Which collection this row came from. */
  source: CandidateRecordSource;
  /** The doc id within that collection (e.g. `${candidate_id}_${interview_id}`). */
  recordId: string;
  /** candidate_id join key (the candidate_profiles / candidates doc id). */
  candidateId?: string | null;
  /** Raw email; normalized to `.toLowerCase().trim()` before joining. */
  email?: string | null;
  /** account_id (the candidate_accounts doc id). */
  accountId?: string | null;
  /** candidate_accounts.profile_ids[] — the genuine many→one link. */
  profileIds?: string[] | null;
  /** candidates.duplicateOfId self-pointer (dedup → the canonical candidate_id). */
  duplicateOfId?: string | null;
  /** Display name (candidate_profiles is the self-chosen canonical source). */
  name?: string | null;
  /** Tenant scope. Null = untagged; adopts the caller's workspace. */
  workspaceId?: string | null;
}

/** A back-reference to one source doc that resolved into this human. */
export interface CanonicalMemberRef {
  source: CandidateRecordSource;
  recordId: string;
}

/** One resolved human: a stable canonical id plus every member record + join key. */
export interface CanonicalCandidate {
  /**
   * Stable, order-independent id for this human. Preference: a non-duplicate
   * candidate_id (smallest), else any candidate_id, else the primary email,
   * else the account_id, else the sole member ref. Derived, never persisted.
   */
  canonicalId: string;
  /** Best display name (candidate_profiles-sourced when available). */
  name: string | null;
  /** Primary email (candidate_profiles-sourced when available), normalized. */
  email: string | null;
  /** Every candidate_id that resolves here (incl. profile_ids + dedup targets). */
  candidateIds: string[];
  /** Every account_id that resolves here (portal logins). */
  accountIds: string[];
  /** Every normalized email that resolves here. */
  emails: string[];
  /** The source docs that fan into this human — the candidate-360 drill set. */
  memberRecords: CanonicalMemberRef[];
  /** The tenant this human is scoped to (caller workspace, or null if unscoped). */
  workspaceId: string | null;
}

/**
 * A read-only "looks like the same person" hint between two DISTINCT canonical
 * identities. NOT a merge — the destructive merge/unmerge is deferred to P5-4.
 */
export interface SuggestedMerge {
  canonicalIds: [string, string];
  reason: "same-name";
  confidence: "low";
}

export interface CanonicalResolution {
  candidates: CanonicalCandidate[];
  suggestedMerges: SuggestedMerge[];
}

export interface ResolveOptions {
  /**
   * The caller's workspace/tenant. When set, records from a different explicit
   * workspace are dropped (no cross-tenant leak) and untagged records adopt it.
   */
  workspaceId?: string | null;
}

/** Treat empty / whitespace-only strings as absent. */
function clean(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function normEmail(v: string | null | undefined): string | null {
  const t = clean(v);
  return t ? t.toLowerCase() : null;
}

function normName(v: string | null | undefined): string | null {
  const t = clean(v);
  return t ? t.toLowerCase().replace(/\s+/g, " ") : null;
}

/** Display-name / email source priority: the self-chosen profile wins. */
const SOURCE_PRIORITY: Record<CandidateRecordSource, number> = {
  candidate_profiles: 0,
  candidate_accounts: 1,
  candidates: 2,
  candidate_journeys: 3,
  candidate_role_tags: 4,
  candidate_scores: 5,
};

/** Minimal union-find over string atoms. */
class UnionFind {
  private parent = new Map<string, string>();

  private ensure(x: string): void {
    if (!this.parent.has(x)) this.parent.set(x, x);
  }

  find(x: string): string {
    this.ensure(x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Path-compress.
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    // Deterministic root: smaller string wins, so grouping is order-independent.
    if (ra < rb) this.parent.set(rb, ra);
    else this.parent.set(ra, rb);
  }
}

/**
 * Group the scattered records into one canonical identity per human at read time.
 * Pure and deterministic: output order and every array field are sorted so the
 * same input (in any order) yields the same resolution. Performs no writes.
 */
export function resolveCanonicalCandidates(
  records: CandidateRecord[],
  options: ResolveOptions = {},
): CanonicalResolution {
  const callerWs = clean(options.workspaceId ?? null);

  // (1) Tenant filter: drop rows that explicitly belong to another workspace so
  // a scoped read never returns another tenant's candidate.
  const scoped = records.filter((r) => {
    const ws = clean(r.workspaceId ?? null);
    if (callerWs && ws && ws !== callerWs) return false;
    return true;
  });

  // Effective workspace for namespacing join keys. Untagged rows adopt the
  // caller's workspace; with no caller, they fall into a shared "*" bucket while
  // explicitly-tagged rows keep their own namespace (never cross-merged).
  const effWs = (r: CandidateRecord): string => clean(r.workspaceId ?? null) ?? callerWs ?? "*";

  const uf = new UnionFind();
  const nsCid = (ws: string, id: string) => `cid:${ws}:${id}`;
  const nsEmail = (ws: string, e: string) => `email:${ws}:${e}`;
  const nsAcct = (ws: string, a: string) => `acct:${ws}:${a}`;

  // Per-record representative atom, used to bucket rows after unions.
  const repAtom = new Map<CandidateRecord, string>();

  // (2) Build atoms and union every signal a record carries.
  for (const r of scoped) {
    const ws = effWs(r);
    const atoms: string[] = [];
    const cid = clean(r.candidateId);
    const email = normEmail(r.email);
    const acct = clean(r.accountId);

    if (cid) atoms.push(nsCid(ws, cid));
    if (email) atoms.push(nsEmail(ws, email));
    if (acct) atoms.push(nsAcct(ws, acct));
    // profile_ids[] ARE candidate_ids of this human (the many→one link).
    for (const pid of r.profileIds ?? []) {
      const p = clean(pid);
      if (p) atoms.push(nsCid(ws, p));
    }
    // dedup self-pointer: the duplicate candidate_id == its canonical target.
    const dup = clean(r.duplicateOfId);
    if (dup) atoms.push(nsCid(ws, dup));

    if (atoms.length === 0) {
      // No join signal — its own singleton group, keyed by the doc itself.
      const solo = `rec:${ws}:${r.source}:${r.recordId}`;
      uf.find(solo);
      repAtom.set(r, solo);
      continue;
    }
    // Union all of the record's atoms together, then remember one as its rep.
    for (let i = 1; i < atoms.length; i++) uf.union(atoms[0], atoms[i]);
    repAtom.set(r, atoms[0]);
  }

  // (3) Bucket records by the root of their representative atom.
  const groups = new Map<string, CandidateRecord[]>();
  for (const r of scoped) {
    const root = uf.find(repAtom.get(r)!);
    const bucket = groups.get(root);
    if (bucket) bucket.push(r);
    else groups.set(root, [r]);
  }

  // (4) Materialize each group into a CanonicalCandidate.
  const candidates: CanonicalCandidate[] = [];
  for (const bucket of groups.values()) {
    const candidateIds = new Set<string>();
    const duplicateIds = new Set<string>();
    const accountIds = new Set<string>();
    const emails = new Set<string>();
    let workspaceId: string | null = null;

    for (const r of bucket) {
      const cid = clean(r.candidateId);
      const dup = clean(r.duplicateOfId);
      if (cid) candidateIds.add(cid);
      if (dup) {
        candidateIds.add(dup);
        if (cid) duplicateIds.add(cid); // the row that points elsewhere is the dupe
      }
      for (const pid of r.profileIds ?? []) {
        const p = clean(pid);
        if (p) candidateIds.add(p);
      }
      const acct = clean(r.accountId);
      if (acct) accountIds.add(acct);
      const email = normEmail(r.email);
      if (email) emails.add(email);
      if (workspaceId === null) workspaceId = clean(r.workspaceId ?? null) ?? callerWs;
    }

    // Display name/email from the highest-priority source that carries one.
    const byPriority = [...bucket].sort(
      (a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source] || a.recordId.localeCompare(b.recordId),
    );
    const name = byPriority.map((r) => clean(r.name)).find((n): n is string => n !== null) ?? null;
    const email = byPriority.map((r) => normEmail(r.email)).find((e): e is string => e !== null) ?? null;

    // Canonical id: prefer a non-duplicate candidate_id, else any candidate_id,
    // else the primary email, else the account_id, else the sole member ref.
    const cids = [...candidateIds].sort();
    const primary = cids.filter((c) => !duplicateIds.has(c));
    const pool = primary.length ? primary : cids;
    let canonicalId: string;
    if (pool.length) canonicalId = pool[0];
    else if (emails.size) canonicalId = [...emails].sort()[0];
    else if (accountIds.size) canonicalId = [...accountIds].sort()[0];
    else canonicalId = `${byPriority[0].source}:${byPriority[0].recordId}`;

    const memberRecords: CanonicalMemberRef[] = bucket
      .map((r) => ({ source: r.source, recordId: r.recordId }))
      .sort((a, b) => a.source.localeCompare(b.source) || a.recordId.localeCompare(b.recordId));

    candidates.push({
      canonicalId,
      name,
      email,
      candidateIds: cids,
      accountIds: [...accountIds].sort(),
      emails: [...emails].sort(),
      memberRecords,
      workspaceId,
    });
  }

  candidates.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));

  return { candidates, suggestedMerges: buildSuggestedMerges(candidates) };
}

/**
 * Soft "looks like the same person" hints: DISTINCT canonical identities that
 * share a normalized name but no hard join key. Read-only — the actual merge is
 * deferred to P5-4. Each unordered pair is emitted once, low confidence.
 */
function buildSuggestedMerges(candidates: CanonicalCandidate[]): SuggestedMerge[] {
  const byName = new Map<string, string[]>();
  for (const c of candidates) {
    const key = normName(c.name);
    if (!key) continue;
    const bucket = byName.get(key);
    if (bucket) bucket.push(c.canonicalId);
    else byName.set(key, [c.canonicalId]);
  }

  const merges: SuggestedMerge[] = [];
  for (const ids of byName.values()) {
    const distinct = [...new Set(ids)].sort();
    if (distinct.length < 2) continue;
    for (let i = 0; i < distinct.length; i++) {
      for (let j = i + 1; j < distinct.length; j++) {
        merges.push({ canonicalIds: [distinct[i], distinct[j]], reason: "same-name", confidence: "low" });
      }
    }
  }
  return merges;
}

/**
 * Look up the resolved human that contains a given candidate_id or email.
 * The candidate-360 drill-in origin (a Talent row / a score row) hands its
 * candidate_id or email here to get the fanned-in identity. Returns null if the
 * key resolves to no group (e.g. filtered out by workspace scope).
 */
export function findCanonical(
  resolution: CanonicalResolution,
  key: string,
): CanonicalCandidate | null {
  const raw = clean(key);
  if (!raw) return null;
  const email = raw.toLowerCase();
  for (const c of resolution.candidates) {
    if (c.canonicalId === raw) return c;
    if (c.candidateIds.includes(raw)) return c;
    if (c.accountIds.includes(raw)) return c;
    if (c.emails.includes(email)) return c;
  }
  return null;
}
