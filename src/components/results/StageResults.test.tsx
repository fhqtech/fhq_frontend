/**
 * P5-3 — StageResults parity contract.
 *
 * StageResults is the consolidated, stage-agnostic results surface that renders
 * behind the `stage_results` flag. It is the flag-ON branch of InterviewResults'
 * success body — the flag swap itself lives in InterviewResults (reported in
 * sharedWiring), so this component does NOT self-gate.
 *
 * Parity target is the LEGACY InterviewResults success body (TAG + transcript +
 * scoring + trust surfaces), NOT InterviewDetails — InterviewDetails renders the
 * roster/config page and never rendered TAG/transcript/scoring (verified stale
 * premise). The single component must serve the screen AND fitment stages
 * identically; stage is a thin presentational eyebrow only.
 *
 * These tests mock the composed leaf children to sentinels (repo idiom, see
 * pages/Lists/index.test.tsx) so the unit asserts StageResults' OWN wiring —
 * that it composes the TAG, transcript, scoring, and trust surfaces against the
 * same session/results the legacy page did — without pulling in child internals
 * or the network.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StageResults, type StageResultsPayload } from "./StageResults";

// The TAG is SACRED — never re-implemented. Mock it to a sentinel that echoes
// the wiring props (mode, session, adapter output) so we prove the composition.
vi.mock("@/components/tag/TalentAnalysisGraph", () => ({
  TalentAnalysisGraph: (props: any) => (
    <div
      data-testid="tag-graph"
      data-mode={props.mode}
      data-session={props.sessionId ?? ""}
      data-role={props.data?.roleTitle ?? ""}
    >
      talent analysis graph
    </div>
  ),
}));
vi.mock("@/components/views/TagViewModal", () => ({
  TagViewModal: (props: any) =>
    props.isOpen ? <div data-testid="tag-modal">tag modal</div> : null,
}));
vi.mock("@/components/interview/TranscriptViewer", () => ({
  TranscriptViewer: (props: any) => (
    <div data-testid="transcript" data-session={props.sessionId}>
      transcript
    </div>
  ),
}));
vi.mock("@/components/interview/RatingPanel", () => ({
  RatingPanel: (props: any) => (
    <div data-testid="rating-panel" data-session={props.sessionId}>
      rating
    </div>
  ),
}));
vi.mock("@/components/assessment/FusedSkillProfile", () => ({
  FusedSkillProfile: (props: any) => (
    <div data-testid="fused-profile" data-candidate={props.candidateId}>
      fused profile
    </div>
  ),
}));
vi.mock("@/components/trust/TransferableBand", () => ({
  TransferableBand: (props: any) =>
    props.skills?.length ? (
      <div data-testid="transferable-band" data-count={props.skills.length}>
        transferable band
      </div>
    ) : null,
}));
vi.mock("@/components/trust/IntegrityNote", () => ({
  IntegrityNote: (props: any) => (
    <div data-testid="integrity-note" data-turn={props.flag.turn}>
      integrity note
    </div>
  ),
}));

const baseResults: StageResultsPayload = {
  session_id: "sess-123",
  interview_id: "int-9",
  overall_score: 82,
  recommendation: "ADVANCE_WITH_CONCERNS",
  summary:
    "Priya Sharma showed strong reconciliation instincts with a gap in deferred-tax treatment.",
  skill_scores: [
    {
      skill_id: "sk1",
      skill_name: "Statutory audit",
      score: 80,
      proficiency_level: "advanced",
      evidence: ["Walked the audit trail cleanly."],
      gaps: [],
    },
  ],
  graph_data: {
    nodes: [
      { id: "_role_center", type: "role_center" as any, label: "Senior tax analyst" },
      { id: "sk1", type: "skill", label: "Statutory audit", score: 80 },
    ],
    edges: [],
    annotations: [],
  },
  transferable_skills: [
    {
      source: "Taxation",
      skill_demonstrated: "Statutory audit",
      relevance_to_role: "Reconciling tax positions sharpens the audit trail.",
      score: 78,
    },
  ],
  critical_gaps: [],
  strengths: ["Reconciliation"],
  development_areas: ["Deferred tax"],
  generated_at: "2026-07-01T00:00:00Z",
  role: "Senior tax analyst",
  candidate_id: "cand-77",
  integrity_flags: [],
};

function renderStage(
  overrides: Partial<StageResultsPayload> = {},
  props: Record<string, unknown> = {},
) {
  const results = { ...baseResults, ...overrides } as StageResultsPayload;
  return render(
    <MemoryRouter>
      <StageResults
        results={results}
        sessionId={results.session_id}
        interviewId={results.interview_id}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("StageResults", () => {
  it("presents the three result surfaces with the Talent Analysis Graph as default", () => {
    renderStage();

    // The three tabs of the legacy results body.
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /talent analysis graph/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /transcript/i })).toBeInTheDocument();

    // Default surface is the TAG, in result mode, wired to the session + role.
    const tag = screen.getByTestId("tag-graph");
    expect(tag).toHaveAttribute("data-mode", "result");
    expect(tag).toHaveAttribute("data-session", "sess-123");
    expect(tag).toHaveAttribute("data-role", "Senior tax analyst");
  });

  it("serves the SCREEN stage and the FITMENT stage from one component (generic eyebrow)", () => {
    const screenRender = renderStage({}, { stage: "screen" });
    expect(screen.getByText("Screening")).toBeInTheDocument();
    screenRender.unmount();

    renderStage({}, { stage: "fitment" });
    expect(screen.getByText("Fitment")).toBeInTheDocument();
    // Same TAG wiring regardless of stage — proves no per-stage twin.
    expect(screen.getByTestId("tag-graph")).toHaveAttribute("data-mode", "result");
  });

  it("falls back to a generic Results eyebrow when no stage is supplied (no invented backend field)", () => {
    renderStage();
    expect(screen.getByText("Results", { exact: true })).toBeInTheDocument();
  });

  it("honours an explicit stageLabel override", () => {
    renderStage({}, { stageLabel: "Fitment interview" });
    expect(screen.getByText("Fitment interview")).toBeInTheDocument();
  });

  it("shows the overall summary, mapped hireability recommendation, and rating panel on the overview tab", async () => {
    const user = userEvent.setup();
    renderStage();

    await user.click(screen.getByRole("tab", { name: /overview/i }));

    expect(screen.getByText(/strong reconciliation instincts/i)).toBeInTheDocument();
    // ADVANCE_WITH_CONCERNS maps to the human-readable recommendation.
    expect(screen.getByText(/recommend with reservations/i)).toBeInTheDocument();
    expect(screen.getByTestId("rating-panel")).toHaveAttribute(
      "data-session",
      "sess-123",
    );
  });

  it("renders the transcript surface wired to the session", async () => {
    const user = userEvent.setup();
    renderStage();

    await user.click(screen.getByRole("tab", { name: /transcript/i }));

    expect(screen.getByTestId("transcript")).toHaveAttribute(
      "data-session",
      "sess-123",
    );
  });

  it("relays transferable strengths and integrity notes into the consolidated surface", () => {
    renderStage({
      integrity_flags: [{ turn: 3, quote: "…", reason: "needs a closer look" } as any],
    });

    expect(screen.getByTestId("transferable-band")).toHaveAttribute(
      "data-count",
      "1",
    );
    expect(screen.getByTestId("integrity-note")).toHaveAttribute("data-turn", "3");
  });

  it("renders the fused skill profile only when a candidate id is present", () => {
    const withCandidate = renderStage();
    expect(screen.getByTestId("fused-profile")).toHaveAttribute(
      "data-candidate",
      "cand-77",
    );
    withCandidate.unmount();

    renderStage({ candidate_id: undefined });
    expect(screen.queryByTestId("fused-profile")).not.toBeInTheDocument();
  });

  it("surfaces the blueprint-misconfiguration banner when every node is a blueprint error", () => {
    renderStage({
      graph_data: {
        nodes: [
          { id: "n1", type: "skill", label: "x", name: "Blueprint Error 1" } as any,
          { id: "n2", type: "skill", label: "y", name: "Blueprint Error 2" } as any,
        ],
        edges: [],
        annotations: [],
      },
    });

    expect(screen.getByText(/blueprint is misconfigured/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open blueprint editor/i }),
    ).toBeInTheDocument();
  });

  it("does not show the blueprint banner for a normal graph", () => {
    renderStage();
    expect(screen.queryByText(/blueprint is misconfigured/i)).not.toBeInTheDocument();
  });
});
