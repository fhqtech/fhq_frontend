/**
 * P5-1 — read-time canonical-candidate resolution.
 *
 * There is no canonical human id in the backend: the six per-record collections
 * (candidates, candidate_profiles, candidate_accounts, candidate_scores,
 * candidate_role_tags, candidate_journeys) are joined by three partial keys —
 * normalized email, candidate_id, and candidate_accounts.profile_ids[]. This
 * resolver fans those scattered rows into one human AT READ TIME, with zero
 * writes: the destructive merge/unmerge is deferred to P5-4. A soft "looks like
 * the same person" hint is surfaced but never auto-merged.
 *
 * Tenancy is load-bearing: candidate docs carry no workspace_id and /api/scores/all
 * is recruiter-scoped, so an unscoped email/candidate_id join can cross workspace
 * boundaries. The resolver filters to the caller's workspace and namespaces every
 * join key by workspace so a merge can never leak another workspace's candidate.
 */
import { describe, it, expect } from "vitest";
import {
  resolveCanonicalCandidates,
  findCanonical,
  type CandidateRecord,
} from "./canonicalCandidate";

const rec = (over: Partial<CandidateRecord>): CandidateRecord => ({
  source: "candidate_profiles",
  recordId: "r1",
  candidateId: null,
  email: null,
  accountId: null,
  profileIds: null,
  duplicateOfId: null,
  name: null,
  workspaceId: null,
  ...over,
});

describe("resolveCanonicalCandidates — core join heuristics", () => {
  it("two rows with the same email resolve to one canonical id", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidate_scores", recordId: "s1", email: "priya@example.com" }),
      rec({ source: "candidate_journeys", recordId: "j1", email: "priya@example.com" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].memberRecords).toHaveLength(2);
    expect(candidates[0].emails).toEqual(["priya@example.com"]);
  });

  it("normalizes email (case + surrounding whitespace) when joining", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ recordId: "a", email: "  Priya@Example.com " }),
      rec({ recordId: "b", email: "priya@example.com" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].emails).toEqual(["priya@example.com"]);
  });

  it("joins rows that share a candidate_id even when emails differ", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidate_role_tags", recordId: "c1__p1", candidateId: "c1", email: "old@x.in" }),
      rec({ source: "candidate_scores", recordId: "c1_i9", candidateId: "c1", email: "new@x.in" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].canonicalId).toBe("c1");
    expect(candidates[0].emails.sort()).toEqual(["new@x.in", "old@x.in"]);
  });

  it("keeps distinct humans separate (different id AND different email)", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ recordId: "a", candidateId: "c1", email: "priya@x.in", name: "Priya Sharma" }),
      rec({ recordId: "b", candidateId: "c2", email: "arjun@x.in", name: "Arjun Mehta" }),
    ]);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.canonicalId).sort()).toEqual(["c1", "c2"]);
  });

  it("falls back to email as the canonical id when candidate_id is missing", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidate_scores", recordId: "s1", candidateId: "", email: "rohan@x.in" }),
      rec({ source: "candidate_scores", recordId: "s2", candidateId: null, email: "rohan@x.in" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].canonicalId).toBe("rohan@x.in");
  });

  it("links profiles via candidate_accounts.profile_ids[] (the genuine many→one)", () => {
    // Two recruiter-only profile rows with different emails, joined only by the
    // portal account that lists both profile ids.
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidate_profiles", recordId: "cA", candidateId: "cA", email: "a@x.in" }),
      rec({ source: "candidate_profiles", recordId: "cB", candidateId: "cB", email: "b@x.in" }),
      rec({
        source: "candidate_accounts",
        recordId: "acct-1",
        accountId: "acct-1",
        profileIds: ["cA", "cB"],
        email: "a@x.in",
      }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].candidateIds.sort()).toEqual(["cA", "cB"]);
    expect(candidates[0].accountIds).toEqual(["acct-1"]);
  });

  it("resolves the candidates dedup self-pointer (duplicateOfId → canonical)", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidates", recordId: "c-dup", candidateId: "c-dup", duplicateOfId: "c-main" }),
      rec({ source: "candidate_profiles", recordId: "c-main", candidateId: "c-main" }),
    ]);
    expect(candidates).toHaveLength(1);
    // The duplicate must not win the canonical id; the primary does.
    expect(candidates[0].canonicalId).toBe("c-main");
    expect(candidates[0].candidateIds.sort()).toEqual(["c-dup", "c-main"]);
  });

  it("exposes stable canonicalId + member record ids regardless of input order", () => {
    const rows: CandidateRecord[] = [
      rec({ source: "candidate_profiles", recordId: "c2", candidateId: "c2", email: "z@x.in" }),
      rec({ source: "candidate_scores", recordId: "c2_i1", candidateId: "c2", email: "z@x.in" }),
      rec({ source: "candidate_role_tags", recordId: "c2__p1", candidateId: "c2" }),
    ];
    const forward = resolveCanonicalCandidates(rows);
    const reversed = resolveCanonicalCandidates([...rows].reverse());
    expect(forward.candidates[0].canonicalId).toBe(reversed.candidates[0].canonicalId);
    expect(forward.candidates[0].memberRecords).toEqual(reversed.candidates[0].memberRecords);
    // member refs carry source + recordId so candidate-360 can drill to each doc
    expect(forward.candidates[0].memberRecords).toEqual([
      { source: "candidate_profiles", recordId: "c2" },
      { source: "candidate_role_tags", recordId: "c2__p1" },
      { source: "candidate_scores", recordId: "c2_i1" },
    ]);
  });

  it("prefers the candidate_profiles self-chosen name/email for display", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidate_scores", recordId: "s1", candidateId: "c1", name: "PRIYA S", email: "stale@x.in" }),
      rec({ source: "candidate_profiles", recordId: "c1", candidateId: "c1", name: "Priya Sharma", email: "priya@x.in" }),
    ]);
    expect(candidates[0].name).toBe("Priya Sharma");
    expect(candidates[0].email).toBe("priya@x.in");
  });

  it("gives a record with no join signal its own singleton group", () => {
    const { candidates } = resolveCanonicalCandidates([
      rec({ source: "candidate_scores", recordId: "orphan-1" }),
      rec({ source: "candidate_scores", recordId: "orphan-2" }),
    ]);
    expect(candidates).toHaveLength(2);
  });

  it("returns an empty resolution for empty input", () => {
    const res = resolveCanonicalCandidates([]);
    expect(res.candidates).toEqual([]);
    expect(res.suggestedMerges).toEqual([]);
  });
});

describe("resolveCanonicalCandidates — tenancy (must not leak / merge across workspaces)", () => {
  it("filters out records from another workspace when a caller workspace is given", () => {
    const { candidates } = resolveCanonicalCandidates(
      [
        rec({ recordId: "mine", candidateId: "c1", email: "priya@x.in", workspaceId: "ws-1" }),
        rec({ recordId: "theirs", candidateId: "c9", email: "priya@x.in", workspaceId: "ws-2" }),
      ],
      { workspaceId: "ws-1" },
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].candidateIds).toEqual(["c1"]);
  });

  it("never merges the same email across two explicit different workspaces", () => {
    // No caller scope passed — the join key is still namespaced by workspace,
    // so two tenants sharing an email stay two humans.
    const { candidates } = resolveCanonicalCandidates([
      rec({ recordId: "a", email: "shared@x.in", workspaceId: "ws-1" }),
      rec({ recordId: "b", email: "shared@x.in", workspaceId: "ws-2" }),
    ]);
    expect(candidates).toHaveLength(2);
  });

  it("adopts the caller workspace for untagged (null workspace) records so they still fan in", () => {
    const { candidates } = resolveCanonicalCandidates(
      [
        rec({ recordId: "tagged", candidateId: "c1", email: "priya@x.in", workspaceId: "ws-1" }),
        rec({ recordId: "untagged", candidateId: "c1", email: "priya@x.in", workspaceId: null }),
      ],
      { workspaceId: "ws-1" },
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].memberRecords).toHaveLength(2);
  });
});

describe("resolveCanonicalCandidates — soft 'looks like the same person' hint (read-only, deferred write)", () => {
  it("hints two separate humans that share a name but no hard join key, without merging", () => {
    const { candidates, suggestedMerges } = resolveCanonicalCandidates([
      rec({ recordId: "a", candidateId: "c1", email: "priya.old@x.in", name: "Priya Sharma" }),
      rec({ recordId: "b", candidateId: "c2", email: "priya.new@x.in", name: "priya sharma" }),
    ]);
    // Still two distinct canonical identities — no auto-merge (that is P5-4).
    expect(candidates).toHaveLength(2);
    expect(suggestedMerges).toHaveLength(1);
    expect(suggestedMerges[0].reason).toBe("same-name");
    expect([...suggestedMerges[0].canonicalIds].sort()).toEqual(["c1", "c2"]);
  });

  it("does not hint when the two rows already merged via a hard key", () => {
    const { candidates, suggestedMerges } = resolveCanonicalCandidates([
      rec({ recordId: "a", candidateId: "c1", email: "priya@x.in", name: "Priya Sharma" }),
      rec({ recordId: "b", candidateId: "c1", email: "priya@x.in", name: "Priya Sharma" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(suggestedMerges).toEqual([]);
  });
});

describe("findCanonical", () => {
  const resolution = resolveCanonicalCandidates([
    rec({ source: "candidate_profiles", recordId: "c1", candidateId: "c1", email: "priya@x.in", name: "Priya Sharma" }),
    rec({ source: "candidate_scores", recordId: "c1_i1", candidateId: "c1", email: "priya@x.in" }),
    rec({ source: "candidate_profiles", recordId: "c2", candidateId: "c2", email: "arjun@x.in", name: "Arjun Mehta" }),
  ]);

  it("finds the canonical identity by candidate_id", () => {
    expect(findCanonical(resolution, "c1")?.name).toBe("Priya Sharma");
  });

  it("finds the canonical identity by email (case-insensitive)", () => {
    expect(findCanonical(resolution, "ARJUN@x.in")?.canonicalId).toBe("c2");
  });

  it("returns null for an unknown key", () => {
    expect(findCanonical(resolution, "nobody@x.in")).toBeNull();
  });
});
