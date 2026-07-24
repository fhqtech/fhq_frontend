/**
 * P5-2 — READ-TIME candidate-360 fan-in (behind the `candidate_360` flag).
 *
 * There is no canonical human id in the backend: one person is scattered across
 * six collections joined by three partial keys (see lib/canonicalCandidate.ts /
 * the P5 fan-in map). This module takes the raw read payloads a recruiter can
 * already fetch — the score rows (`/api/scores/all`), the fused per-role TAG
 * (`…/candidates/{cid}/tag`), the cross-mode fused profile
 * (`/api/assessments/recruiter/profile/{cid}`), the gap read, and the candidate's
 * journey — and fans them into ONE human's view at read time.
 *
 * It reuses the P5-1 resolver to decide which rows are the same person, so it
 * inherits P5-1's tenancy defenses: join keys are namespaced by workspace and a
 * different explicit workspace's rows are dropped. It performs ZERO writes (it is
 * a pure function) and never invents a backend — when a field is absent from the
 * payload it is flagged in `missing`, not fabricated. The durable canonical map +
 * merge/unmerge is the deferred write (P5-4), out of scope here.
 *
 * DOCUMENTED GAP (do not invent): the fused role-tag / profile claims reach the
 * frontend WITHOUT per-skill grounding evidence or provenance, so every claim is
 * `unverified` under the P4 evidence contract (lib/nodeEvidence). The view surfaces
 * that honestly (verifiedClaimCount 0, missing.provenance) rather than showing a
 * confident number it cannot ground. Per-node grounding, when the backend supplies
 * it, still renders on node-tap inside the reused TAG (TagSidePanel → P4 panels).
 *
 * PII: this module derives identity from ids/emails only and never logs.
 */
import {
  resolveCanonicalCandidates,
  findCanonical,
  type CandidateRecord,
  type CandidateRecordSource,
  type CanonicalCandidate,
} from "./canonicalCandidate";
import { isUnverifiedScore } from "./nodeEvidence";
import { journeyAction } from "./journeyAction";
import type { CandidateScore } from "@/services/scoreAnalyticsApi";
import type { RoleTag, GapResult, JourneyInstance } from "@/services/recruiterJourneysApi";
import type { ProfileResponse } from "@/services/assessmentsRecruiterApi";
import type { TagGraphNode } from "@/components/tag/TalentAnalysisGraph";

/** The kind of a timeline event — drives its label/icon in the view. */
export type Candidate360TimelineKind = "screen" | "fitment" | "practical" | "stage" | "decision";

/** One event on the candidate's stage timeline (an interview or a journey stage). */
export interface Candidate360TimelineItem {
  /** Stable id, derived from the source doc (interview or journey stage). */
  id: string;
  kind: Candidate360TimelineKind;
  title: string;
  /** ISO timestamp, or null when the source row carries none (journey stages). */
  at: string | null;
  /** Displayable score for this event, or null when unscored. */
  score: number | null;
  /** Stage / interview status when the source carries one. */
  status: string | null;
  /** Which collection this event fanned in from (the drill target). */
  source: CandidateRecordSource;
}

/** One fused skill claim, plus its P4 evidence-contract verdict. */
export interface Candidate360Claim {
  canonicalId: string | null;
  skillName: string;
  value: number;
  confidence: number;
  /** Contributing assessment modes (fused-profile only; empty for role-tag). */
  modes: string[];
  /** True when modes disagree on this skill (fused-profile only). */
  conflict: boolean;
  /** Grounding quotes, if the payload carries them (absent under the live backend). */
  evidence: string[];
  /** P4 contract: a numeric score with no grounding evidence renders unverified. */
  unverified: boolean;
}

/** Fields ABSENT from the read payload — surfaced as graceful gaps, never invented. */
export interface Candidate360Missing {
  /** The drill key resolved to no group (cross-tenant or absent). */
  identity: boolean;
  claims: boolean;
  timeline: boolean;
  /** No claim carries grounding evidence (the live-backend provenance gap). */
  provenance: boolean;
  gap: boolean;
  journey: boolean;
}

/** The composed, read-only candidate-360 view. */
export interface Candidate360View {
  found: boolean;
  /** Null when the drill key resolved to no group. */
  identity: CanonicalCandidate | null;
  workspaceId: string | null;
  timeline: Candidate360TimelineItem[];
  claims: Candidate360Claim[];
  /** Legacy TAG node shape for TalentAnalysisGraph (reuse, do not fork). */
  graphNodes: TagGraphNode[];
  gap: GapResult | null;
  /**
   * True when a gap read is present but nothing backs it: no claims and every
   * target skill reads demonstrated 0 — i.e. evidence capture is off, so the gap
   * would fabricate a full miss on every skill. The UI shows an honest degraded
   * panel instead of zero-gap rows.
   */
  gapUngrounded: boolean;
  nextAction: { label: string; terminal: boolean } | null;
  /** Count of provenance-grounded claims (0 under the live backend — see gap note). */
  verifiedClaimCount: number;
  missing: Candidate360Missing;
  /**
   * Spec 2: the practical-defense authenticity verdict, present when this
   * candidate's interview followed a practical and the defense was scored.
   * Rendered behind the `defense_authenticity` flag; absent otherwise.
   */
  defense?: import("@/components/trust/AuthenticityVerdict").DefenseReportView | null;
}

/** The raw read payloads the caller fetched (all optional / possibly empty). */
export interface Candidate360Sources {
  /** All score rows the recruiter can see (`/api/scores/all`), recruiter-scoped. */
  scores: CandidateScore[];
  /** Fused per-role TAG for the focused (candidate, program). */
  roleTag?: RoleTag | null;
  /** Gap-vs-target for the focused role (present only when the role has a target). */
  gap?: GapResult | null;
  /** Cross-mode fused profile keyed by candidate_id (fallback for claims). */
  fusedProfile?: ProfileResponse | null;
  /** The focused candidate's journey instance (stage timeline + next action). */
  journey?: JourneyInstance | null;
}

export interface Candidate360Input {
  /** The candidate_id from the drill-in route. */
  candidateId: string;
  /** The recruiter's active workspace — the tenancy scope for the fan-in. */
  workspaceId?: string | null;
  sources: Candidate360Sources;
}

function clean(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Per-row displayable score: a verified human read wins, then AI, then ATS. */
function displayScore(s: CandidateScore): number | null {
  return s.human_score ?? s.ai_interview_score ?? s.ats_score ?? null;
}

function stageKind(type?: string | null): Candidate360TimelineKind {
  switch (type) {
    case "fitment":
      return "fitment";
    case "screen":
      return "screen";
    case "assignment":
      return "practical";
    case "decision":
      return "decision";
    default:
      return "stage"; // interview, review, or an unknown stage type
  }
}

const EMPTY_VIEW = (
  candidateId: string,
  workspaceId: string | null,
): Candidate360View => ({
  found: false,
  identity: null,
  workspaceId,
  timeline: [],
  claims: [],
  graphNodes: [],
  gap: null,
  gapUngrounded: false,
  nextAction: null,
  verifiedClaimCount: 0,
  missing: {
    identity: true,
    claims: true,
    timeline: true,
    provenance: true,
    gap: true,
    journey: true,
  },
});

/**
 * Fan the scattered read payloads into one human's candidate-360 view. Pure and
 * deterministic; performs no writes and never mutates its inputs.
 */
export function composeCandidate360(input: Candidate360Input): Candidate360View {
  const workspaceId = clean(input.workspaceId) || null;
  const focusId = clean(input.candidateId);
  const { scores, roleTag, gap, fusedProfile, journey } = input.sources;

  if (!focusId) return EMPTY_VIEW(focusId, workspaceId);

  // (1) Normalize each source row into an identity record for the P5-1 resolver.
  // The focus candidate is seeded scoped to the caller's workspace so it always
  // resolves; data rows are untagged (they carry no workspace_id in the backend)
  // and adopt the caller's workspace, so the join stays inside the tenant.
  const records: CandidateRecord[] = [
    { source: "candidate_profiles", recordId: `focus:${focusId}`, candidateId: focusId, workspaceId },
  ];

  for (const s of scores ?? []) {
    records.push({
      source: "candidate_scores",
      recordId: `${clean(s.candidate_id) || "?"}_${clean(s.interview_id) || "?"}`,
      candidateId: s.candidate_id,
      email: s.candidate_email,
      name: s.candidate_name,
      workspaceId: null,
    });
  }
  if (roleTag) {
    records.push({
      source: "candidate_role_tags",
      recordId: `${clean(roleTag.candidate_id)}__${clean(roleTag.program_id)}`,
      candidateId: roleTag.candidate_id,
      workspaceId: null,
    });
  }
  if (fusedProfile) {
    records.push({
      source: "candidate_profiles",
      recordId: `fused:${clean(fusedProfile.candidate_id)}`,
      candidateId: fusedProfile.candidate_id,
      workspaceId: null,
    });
  }
  if (journey) {
    records.push({
      source: "candidate_journeys",
      recordId: clean(journey.journey_instance_id) || `jrn:${focusId}`,
      candidateId: journey.candidate_id,
      email: journey.candidate_email,
      name: journey.candidate_name,
      accountId: journey.account_id ?? null,
      workspaceId: null,
    });
  }

  // (2) Resolve to canonical identities and pick the focused human.
  const resolution = resolveCanonicalCandidates(records, { workspaceId });
  const identity = findCanonical(resolution, focusId);
  if (!identity) return EMPTY_VIEW(focusId, workspaceId);

  const idSet = new Set(identity.candidateIds);
  const emailSet = new Set(identity.emails);
  const belongs = (candidateId?: string | null, email?: string | null): boolean => {
    const cid = clean(candidateId);
    const em = clean(email).toLowerCase();
    return (cid !== "" && idSet.has(cid)) || (em !== "" && emailSet.has(em));
  };

  // (3) Timeline — the human's interviews (scored) + their journey stages.
  const timeline: Candidate360TimelineItem[] = [];
  for (const s of scores ?? []) {
    if (!belongs(s.candidate_id, s.candidate_email)) continue;
    const isFitment = s.interview_type === "fitment";
    timeline.push({
      id: `${clean(s.candidate_id) || "?"}_${clean(s.interview_id) || "?"}`,
      kind: isFitment ? "fitment" : "screen",
      title: isFitment ? "Fitment interview" : "Screening interview",
      at: clean(s.updated_at) || clean(s.created_at) || null,
      score: displayScore(s),
      status: null,
      source: "candidate_scores",
    });
  }
  if (journey) {
    const stageScore = new Map<string, number | null>();
    for (const p of journey.stage_progress ?? []) {
      stageScore.set(p.stage_id, p.score ?? null);
    }
    for (const st of journey.stages ?? []) {
      timeline.push({
        id: `${clean(journey.journey_instance_id)}:${clean(st.stage_id)}`,
        kind: stageKind(st.type),
        title: clean(st.title) || clean(st.stage_id),
        at: null,
        score: stageScore.get(st.stage_id) ?? null,
        status: clean(st.status) || null,
        source: "candidate_journeys",
      });
    }
  }
  // Most-recent first; dated rows before undated journey stages, order stable.
  const indexed = timeline.map((item, i) => ({ item, i }));
  indexed.sort((a, b) => {
    const aAt = a.item.at;
    const bAt = b.item.at;
    if (aAt && bAt) return bAt.localeCompare(aAt) || a.i - b.i;
    if (aAt) return -1;
    if (bAt) return 1;
    return a.i - b.i;
  });
  const sortedTimeline = indexed.map((x) => x.item);

  // (4) Claims — prefer the fused per-role TAG (canonical, role-scoped); fall back
  // to the cross-mode fused profile. No claim carries grounding evidence today, so
  // each is unverified per the P4 contract (documented gap).
  const claims: Candidate360Claim[] = [];
  if (roleTag?.claims?.length) {
    for (const c of roleTag.claims) {
      claims.push({
        canonicalId: c.canonical_id ?? null,
        skillName: c.skill_name,
        value: c.value,
        confidence: c.confidence,
        modes: [],
        conflict: false,
        evidence: [],
        unverified: isUnverifiedScore({ score: c.value, confidence: c.confidence, evidence: [] }),
      });
    }
  } else if (fusedProfile?.claims?.length) {
    for (const c of fusedProfile.claims) {
      claims.push({
        canonicalId: c.canonical_id ?? null,
        skillName: c.skill_name,
        value: c.value,
        confidence: c.confidence,
        modes: c.modes ?? [],
        conflict: !!c.conflict,
        evidence: [],
        unverified: isUnverifiedScore({ score: c.value, confidence: c.confidence, evidence: [] }),
      });
    }
  }

  const graphNodes: TagGraphNode[] = claims.map((c) => ({
    id: c.canonicalId || c.skillName,
    type: "skill",
    label: c.skillName,
    score: c.value,
    is_core: false,
    evidence: c.evidence,
  }));

  const verifiedClaimCount = claims.filter((c) => !c.unverified).length;

  // (5) Next-best-action — reuse the journey-board verb.
  let nextAction: { label: string; terminal: boolean } | null = null;
  if (journey) {
    const instStages = journey.stages ?? [];
    const na = journeyAction(
      {
        status: journey.status,
        current_stage_id: journey.current_stage_id,
        stages: instStages.map((s) => ({ stage_id: s.stage_id, type: s.type, status: s.status })),
      },
      instStages.map((s) => ({ stage_id: s.stage_id, type: s.type ?? "", title: clean(s.title) || s.stage_id })),
    );
    nextAction = { label: na.label, terminal: na.terminal };
  }

  const gapPresent = !!gap && (gap.gaps?.length ?? 0) > 0;
  // A gap with no claims where every skill reads demonstrated 0 is not a real
  // gap — it's the absence of evidence. Flag it so the UI degrades honestly.
  const gapUngrounded =
    gapPresent && claims.length === 0 && (gap!.gaps ?? []).every((g) => (g.demonstrated ?? 0) === 0);

  return {
    found: true,
    identity,
    workspaceId,
    timeline: sortedTimeline,
    claims,
    graphNodes,
    gap: gap ?? null,
    gapUngrounded,
    nextAction,
    verifiedClaimCount,
    missing: {
      identity: false,
      claims: claims.length === 0,
      timeline: sortedTimeline.length === 0,
      provenance: verifiedClaimCount === 0,
      gap: !gapPresent,
      journey: !journey,
    },
  };
}
