/**
 * P5-2 — the candidate-360 presentational surface.
 *
 * Contract locked here:
 *   - Renders the fanned-in identity (name / email) and the stage timeline.
 *   - Reuses the P4 `UnverifiedMark` for the honest provenance gap: role-tag
 *     claims carry no grounding evidence, so the trust panel says so rather than
 *     showing a confident, ungrounded number.
 *   - Graceful empty / not-found / loading / error states — never a blank box.
 *   - Sentence case, no emoji.
 *
 * The component is pure/presentational (it takes an already-composed view), so no
 * network, workspace, or router providers are needed — the data container and the
 * flag gate are tested separately.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { composeCandidate360, type Candidate360Input } from "@/lib/candidate360";
import type { CandidateScore } from "@/services/scoreAnalyticsApi";
import type { RoleTag, JourneyInstance } from "@/services/recruiterJourneysApi";
import { Candidate360Content } from "./Candidate360Content";

const score = (over: Partial<CandidateScore>): CandidateScore => ({
  candidate_id: "c-priya",
  candidate_name: "Priya Sharma",
  candidate_email: "priya@example.in",
  interview_type: "preliminary",
  interview_id: "iv-1",
  ats_score: null,
  ats_method: null,
  ai_interview_score: 78,
  human_score: null,
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
  ...over,
});

const roleTag: RoleTag = {
  candidate_id: "c-priya",
  program_id: "prog-gst",
  skill_count: 1,
  evidence_count: 3,
  claims: [{ canonical_id: "fin.tax.indirect.gst.compliance", skill_name: "GST compliance", value: 82, confidence: 0.7 }],
};

const journey: JourneyInstance = {
  journey_instance_id: "jrn-priya",
  candidate_id: "c-priya",
  candidate_name: "Priya Sharma",
  candidate_email: "priya@example.in",
  current_stage_id: "decision",
  status: "active",
  stages: [
    { stage_id: "screen", type: "screen", title: "Screen", status: "complete" },
    { stage_id: "decision", type: "decision", title: "Decision", status: "unlocked" },
  ],
};

const populated = (): Candidate360Input => ({
  candidateId: "c-priya",
  workspaceId: "ws-1",
  sources: {
    scores: [score({ interview_id: "iv-1", ai_interview_score: 78 }), score({ interview_id: "iv-2", interview_type: "fitment", human_score: 84 })],
    roleTag,
    journey,
  },
});

function renderContent(props: Partial<React.ComponentProps<typeof Candidate360Content>>) {
  return render(
    <MemoryRouter>
      <Candidate360Content view={composeCandidate360(populated())} roleTitle="Senior GST analyst" {...props} />
    </MemoryRouter>,
  );
}

describe("Candidate360Content — populated", () => {
  it("shows the fanned-in identity and stage timeline", () => {
    renderContent({});
    expect(screen.getByRole("heading", { name: /priya sharma/i })).toBeInTheDocument();
    expect(screen.getByText(/priya@example\.in/i)).toBeInTheDocument();
    expect(screen.getByText("Screening interview")).toBeInTheDocument();
    expect(screen.getByText("Fitment interview")).toBeInTheDocument();
  });

  it("reuses the P4 unverified mark for the provenance gap (no confident ungrounded number)", () => {
    renderContent({});
    // Every role-tag claim is ungrounded → the calm P4 marker appears.
    expect(screen.getAllByText(/unverified/i).length).toBeGreaterThan(0);
  });

  it("surfaces the next-best-action verb from the journey", () => {
    renderContent({});
    // current stage is a decision → manual "Decide".
    expect(screen.getByText(/decide/i)).toBeInTheDocument();
  });
});

describe("Candidate360Content — graceful states", () => {
  it("renders a not-found state when the candidate resolved to no group", () => {
    const view = composeCandidate360({ candidateId: "", workspaceId: "ws-1", sources: { scores: [] } });
    renderContent({ view });
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it("renders an empty timeline state without crashing when sources are empty", () => {
    const view = composeCandidate360({ candidateId: "c-priya", workspaceId: "ws-1", sources: { scores: [] } });
    renderContent({ view });
    // Identity still resolves (seeded); the timeline shows its empty affordance.
    expect(screen.getByText(/no stages/i)).toBeInTheDocument();
  });

  it("shows a skeleton while loading", () => {
    renderContent({ loading: true });
    expect(screen.getByText(/loading this candidate/i)).toBeInTheDocument();
  });

  it("shows an error banner on failure", () => {
    renderContent({ error: "Could not load this candidate" });
    expect(screen.getByText(/could not load this candidate/i)).toBeInTheDocument();
  });
});

// --- P11: gap-vs-target honesty --------------------------------------------

const gapOnly = (demonstrated: number): Candidate360Input => ({
  candidateId: "c-priya",
  workspaceId: "ws-1",
  sources: {
    scores: [score({ interview_id: "iv-1" })],
    roleTag: null,
    gap: {
      gaps: [
        {
          canonical_id: "fin.recon",
          skill_name: "Reconciliation",
          target: 80,
          demonstrated,
          gap: Math.max(0, 80 - demonstrated),
          met: demonstrated >= 80,
        },
      ],
      summary: { met_count: 0, total: 1, avg_gap: Math.max(0, 80 - demonstrated) },
    },
  },
});

describe("Candidate360Content — gap honesty (P11)", () => {
  it("degrades honestly and hides rows + Export when the gap is ungrounded", () => {
    renderContent({ view: composeCandidate360(gapOnly(0)) });
    expect(screen.getByText(/isn't measurable yet/)).toBeTruthy();
    expect(screen.queryByText("Export CSV")).toBeNull();
    expect(screen.queryByText("Reconciliation")).toBeNull();
  });

  it("renders the gap rows + Export when grounded", () => {
    renderContent({ view: composeCandidate360(gapOnly(61)) });
    // "Reconciliation" appears in both the summary and the per-skill row.
    expect(screen.getAllByText("Reconciliation").length).toBeGreaterThan(0);
    expect(screen.getByText("Export CSV")).toBeTruthy();
    expect(screen.queryByText(/isn't measurable yet/)).toBeNull();
  });
});
