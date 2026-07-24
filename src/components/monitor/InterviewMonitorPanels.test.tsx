import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InterviewMonitorPanels } from "./InterviewMonitorPanels";
import type { MonitorSnapshot } from "@/hooks/useInterviewMonitor";

const snap: MonitorSnapshot = {
  skill_label: "GST reconciliation",
  question_index: 2,
  question_total: 5,
  depth: "mid",
  probe_question: "Why does your reconciliation skip the suspense account?",
  target_concept: "ITC suspense handling",
  rationale: "they skip the suspense account reconciliation",
  submission_reference: { preview_text: "ITC claimed 4,20,000 against the suspense ledger" },
  cheat_score: 0.31,
  coverage: { defended: ["GST"], hollow: ["TDS"], unprobed: ["Consolidation"] },
  expected_vs_submitted_diff: {
    concept: "ITC suspense",
    target_level: 4,
    model_answer: "reverses the ITC against the suspense ledger",
    submitted: "usually not claimable",
    grounding_ratio: 0.1,
    flag: true,
  },
};

describe("InterviewMonitorPanels", () => {
  it("renders the active probe, source excerpt, rationale and coverage for the recruiter", () => {
    render(<InterviewMonitorPanels snapshot={snap} status="live" />);
    expect(screen.getByText("GST reconciliation")).toBeInTheDocument();
    expect(screen.getByText(/question 2 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/why does your reconciliation skip/i)).toBeInTheDocument();
    expect(screen.getByText(/they skip the suspense account/i)).toBeInTheDocument(); // rationale (recruiter-only)
    expect(screen.getByText(/ITC claimed 4,20,000/i)).toBeInTheDocument();
    expect(screen.getByText(/cheat score 0.31/i)).toBeInTheDocument();
    expect(screen.getByText(/advisory only/i)).toBeInTheDocument();
    expect(screen.getByText(/consolidation/i)).toBeInTheDocument(); // unprobed coverage
    expect(screen.getByText(/target L4/i)).toBeInTheDocument();
    expect(screen.getByText(/sounds hollow vs the model answer/i)).toBeInTheDocument();
  });

  it("shows a waiting state before the first turn", () => {
    render(<InterviewMonitorPanels snapshot={null} status="waiting" />);
    expect(screen.getByText(/waiting for the first defense turn/i)).toBeInTheDocument();
  });

  it("shows a connecting state", () => {
    render(<InterviewMonitorPanels snapshot={null} status="connecting" />);
    expect(screen.getByText(/connecting to the live interview/i)).toBeInTheDocument();
  });
});
