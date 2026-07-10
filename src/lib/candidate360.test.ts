/**
 * P5-2 — read-time candidate-360 fan-in composition.
 *
 * `composeCandidate360` fans one human's scattered records (scores, the fused
 * per-role TAG, the cross-mode fused profile, the journey stages) into a single
 * typed view AT READ TIME. It reuses the P5-1 canonical resolver to decide which
 * rows are the same human, so it inherits P5-1's tenancy guarantees (namespaced
 * join keys, another workspace's rows dropped). It performs ZERO writes — it is a
 * pure function — and it never invents a backend: when a field is absent from the
 * read payload it flags the gap rather than fabricating data.
 *
 * These tests lock: the fan-in composition, the empty/partial graceful states,
 * the documented provenance gap (role-tag claims carry no grounding evidence, so
 * every claim renders unverified per the P4 contract), and read-only purity.
 */
import { describe, it, expect } from "vitest";
import { composeCandidate360, type Candidate360Input } from "./candidate360";
import type { CandidateScore } from "@/services/scoreAnalyticsApi";
import type { RoleTag, GapResult, JourneyInstance } from "@/services/recruiterJourneysApi";
import type { ProfileResponse } from "@/services/assessmentsRecruiterApi";

const score = (over: Partial<CandidateScore>): CandidateScore => ({
  candidate_id: "c-priya",
  candidate_name: "Priya Sharma",
  candidate_email: "priya@example.in",
  interview_type: "preliminary",
  interview_id: "iv-1",
  ats_score: null,
  ats_method: null,
  ai_interview_score: null,
  human_score: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

const priyaRoleTag: RoleTag = {
  candidate_id: "c-priya",
  program_id: "prog-gst",
  skill_count: 2,
  evidence_count: 5,
  claims: [
    { canonical_id: "fin.tax.indirect.gst.compliance", skill_name: "GST compliance", value: 82, confidence: 0.7 },
    { canonical_id: "fin.acct.reconciliation", skill_name: "Reconciliation", value: 61, confidence: 0.5 },
  ],
};

const priyaJourney: JourneyInstance = {
  journey_instance_id: "jrn-priya",
  candidate_id: "c-priya",
  candidate_name: "Priya Sharma",
  candidate_email: "priya@example.in",
  current_stage_id: "practical",
  status: "active",
  stages: [
    { stage_id: "screen", type: "screen", title: "Screen", status: "complete" },
    { stage_id: "practical", type: "assignment", title: "Practical", status: "in_progress" },
    { stage_id: "decision", type: "decision", title: "Decision", status: "locked" },
  ],
  stage_progress: [{ stage_id: "screen", status: "passed", score: 82 }],
};

const baseInput = (over: Partial<Candidate360Input> = {}): Candidate360Input => ({
  candidateId: "c-priya",
  workspaceId: "ws-1",
  sources: {
    scores: [
      score({ interview_id: "iv-1", interview_type: "preliminary", ai_interview_score: 78, updated_at: "2026-02-01T00:00:00Z" }),
      score({ interview_id: "iv-2", interview_type: "fitment", human_score: 84, updated_at: "2026-03-01T00:00:00Z" }),
    ],
    roleTag: priyaRoleTag,
    gap: null,
    fusedProfile: null,
    journey: priyaJourney,
    ...over.sources,
  },
  ...over,
});

describe("composeCandidate360 — read-time fan-in", () => {
  it("fans one human's scattered records into a single resolved view", () => {
    const view = composeCandidate360(baseInput());
    expect(view.found).toBe(true);
    expect(view.identity?.candidateIds).toContain("c-priya");
    expect(view.identity?.emails).toContain("priya@example.in");
    // timeline includes both interviews (screen + fitment) and the journey stages
    const kinds = view.timeline.map((t) => t.kind);
    expect(kinds).toContain("screen");
    expect(kinds).toContain("fitment");
    expect(kinds).toContain("practical");
    // fused role-tag claims surface as claims + graph nodes
    expect(view.claims).toHaveLength(2);
    expect(view.graphNodes).toHaveLength(2);
    expect(view.graphNodes[0]).toMatchObject({ type: "skill", label: "GST compliance", score: 82 });
  });

  it("sorts the timeline most-recent first, dated events before undated stages", () => {
    const view = composeCandidate360(baseInput());
    const dated = view.timeline.filter((t) => t.at !== null);
    // fitment (2026-03) must precede screen (2026-02)
    expect(dated[0].kind).toBe("fitment");
    expect(dated[1].kind).toBe("screen");
    // undated journey stages come after the dated interview rows
    const firstUndatedIdx = view.timeline.findIndex((t) => t.at === null);
    const lastDatedIdx = view.timeline.map((t) => t.at !== null).lastIndexOf(true);
    expect(firstUndatedIdx).toBeGreaterThan(lastDatedIdx);
  });

  it("does not pull another candidate's records into this human", () => {
    const view = composeCandidate360(
      baseInput({
        sources: {
          scores: [
            score({ candidate_id: "c-priya", candidate_email: "priya@example.in", interview_id: "iv-1", ai_interview_score: 78 }),
            score({ candidate_id: "c-arjun", candidate_email: "arjun@example.in", candidate_name: "Arjun Mehta", interview_id: "iv-9", ai_interview_score: 90 }),
          ],
          roleTag: priyaRoleTag,
          journey: priyaJourney,
        },
      }),
    );
    // Only Priya's interview lands in the timeline; Arjun is a different human.
    expect(view.identity?.candidateIds).not.toContain("c-arjun");
    expect(view.timeline.some((t) => t.id.includes("iv-9"))).toBe(false);
  });

  it("bridges an email-only row into the human via a record carrying both keys", () => {
    const view = composeCandidate360(
      baseInput({
        sources: {
          scores: [
            score({ candidate_id: "c-priya", candidate_email: "priya@example.in", interview_id: "iv-1" }),
            // email-only fitment row (candidate_id blank) — joins via the shared email
            score({ candidate_id: "", candidate_email: "priya@example.in", interview_id: "iv-2", interview_type: "fitment", human_score: 84 }),
          ],
          roleTag: null,
          journey: null,
        },
      }),
    );
    expect(view.identity?.emails).toContain("priya@example.in");
    expect(view.timeline.some((t) => t.id.includes("iv-2"))).toBe(true);
  });

  it("prefers human > ai > ats for a timeline row's score", () => {
    const view = composeCandidate360(
      baseInput({
        sources: {
          scores: [score({ interview_id: "iv-1", ats_score: 40, ai_interview_score: 60, human_score: 88 })],
          roleTag: null,
          journey: null,
        },
      }),
    );
    expect(view.timeline[0].score).toBe(88);
  });
});

describe("composeCandidate360 — empty / partial graceful states", () => {
  it("resolves the seeded human but flags everything missing when sources are empty", () => {
    const view = composeCandidate360({
      candidateId: "c-priya",
      workspaceId: "ws-1",
      sources: { scores: [] },
    });
    expect(view.found).toBe(true);
    expect(view.timeline).toEqual([]);
    expect(view.claims).toEqual([]);
    expect(view.missing.claims).toBe(true);
    expect(view.missing.timeline).toBe(true);
    expect(view.missing.journey).toBe(true);
    expect(view.missing.gap).toBe(true);
    expect(view.nextAction).toBeNull();
  });

  it("returns a not-found view for a blank candidate id", () => {
    const view = composeCandidate360({ candidateId: "  ", workspaceId: "ws-1", sources: { scores: [] } });
    expect(view.found).toBe(false);
    expect(view.identity).toBeNull();
    expect(view.missing.identity).toBe(true);
  });

  it("falls back to the fused cross-mode profile when there is no role-tag", () => {
    const fusedProfile: ProfileResponse = {
      success: true,
      candidate_id: "c-priya",
      evidence_count: 3,
      claims: [
        { canonical_id: "fin.tax.indirect.gst.compliance", skill_name: "GST compliance", value: 74, confidence: 0.6, modes: ["case", "defense"], conflict: true },
      ],
    };
    const view = composeCandidate360(
      baseInput({ sources: { scores: [], roleTag: null, fusedProfile, journey: null } }),
    );
    expect(view.claims).toHaveLength(1);
    expect(view.claims[0].modes).toEqual(["case", "defense"]);
    expect(view.claims[0].conflict).toBe(true);
  });

  it("passes the gap read through and clears the gap-missing flag", () => {
    const gap: GapResult = {
      gaps: [{ canonical_id: "fin.acct.reconciliation", skill_name: "Reconciliation", target: 80, demonstrated: 61, gap: 19, met: false }],
      summary: { met_count: 0, total: 1, avg_gap: 19 },
    };
    const view = composeCandidate360(baseInput({ sources: { scores: [], roleTag: priyaRoleTag, gap, journey: null } }));
    expect(view.gap).toEqual(gap);
    expect(view.missing.gap).toBe(false);
  });
});

describe("composeCandidate360 — provenance (documented backend gap)", () => {
  it("marks every role-tag claim unverified because the payload carries no grounding evidence", () => {
    const view = composeCandidate360(baseInput({ sources: { scores: [], roleTag: priyaRoleTag, journey: null } }));
    expect(view.claims.every((c) => c.unverified)).toBe(true);
    expect(view.verifiedClaimCount).toBe(0);
    expect(view.missing.provenance).toBe(true);
  });
});

describe("composeCandidate360 — next-best-action (reuses journeyAction)", () => {
  it("surfaces a manual 'decide' on a decision stage", () => {
    const journey: JourneyInstance = {
      ...priyaJourney,
      current_stage_id: "decision",
      status: "active",
    };
    const view = composeCandidate360(baseInput({ sources: { scores: [], roleTag: null, journey } }));
    expect(view.nextAction).toEqual({ label: "Decide", terminal: false });
  });

  it("surfaces the terminal outcome for a hired journey", () => {
    const journey: JourneyInstance = { ...priyaJourney, status: "hired" };
    const view = composeCandidate360(baseInput({ sources: { scores: [], roleTag: null, journey } }));
    expect(view.nextAction?.terminal).toBe(true);
    expect(view.nextAction?.label).toBe("Hired");
  });
});

describe("composeCandidate360 — read-only (zero writes)", () => {
  it("never mutates its inputs (deep-frozen sources compose without throwing)", () => {
    const input = baseInput();
    // Deep-freeze every source array/object; any in-place write would throw.
    Object.freeze(input.sources);
    input.sources.scores.forEach((s) => Object.freeze(s));
    Object.freeze(input.sources.scores);
    Object.freeze(input.sources.roleTag);
    input.sources.roleTag?.claims.forEach((c) => Object.freeze(c));
    Object.freeze(input.sources.journey);
    input.sources.journey?.stages?.forEach((s) => Object.freeze(s));

    const before = input.sources.scores.length;
    expect(() => composeCandidate360(input)).not.toThrow();
    // Inputs are untouched.
    expect(input.sources.scores.length).toBe(before);
  });
});
