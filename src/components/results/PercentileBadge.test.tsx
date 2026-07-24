import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PercentileBadge } from "./PercentileBadge";
import { scoreAnalyticsApi } from "@/services/scoreAnalyticsApi";
import type { CandidateScore } from "@/services/scoreAnalyticsApi";

vi.mock("@/services/scoreAnalyticsApi", () => ({
  scoreAnalyticsApi: { getAllScores: vi.fn() },
}));

const getAllScores = scoreAnalyticsApi.getAllScores as unknown as ReturnType<typeof vi.fn>;

function row(candidate_id: string, interview_id: string, score: number): CandidateScore {
  return {
    candidate_id,
    candidate_name: candidate_id,
    candidate_email: null,
    interview_type: "preliminary",
    interview_id,
    ats_score: null,
    ats_method: null,
    ai_interview_score: score,
    human_score: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => getAllScores.mockReset());

describe("PercentileBadge", () => {
  it("ranks the candidate against a sufficient same-round cohort", async () => {
    // self c1/iv1 = 85; 9 lower-scoring peers -> top of the cohort
    const scores = [
      row("c1", "iv1", 85),
      ...Array.from({ length: 9 }, (_, i) => row(`peer${i}`, `ivp${i}`, 40 + i)),
    ];
    getAllScores.mockResolvedValue(scores);

    render(<PercentileBadge candidateId="c1" interviewId="iv1" />, { wrapper });

    expect(await screen.findByText(/percentile/)).toBeTruthy();
    expect(screen.getByText(/among your 9 screening candidates/)).toBeTruthy();
  });

  it("renders nothing when there are too few peers to rank", async () => {
    getAllScores.mockResolvedValue([
      row("c1", "iv1", 85),
      row("p1", "ivp1", 50),
      row("p2", "ivp2", 60),
    ]);
    const { container } = render(<PercentileBadge candidateId="c1" interviewId="iv1" />, { wrapper });
    await waitFor(() => expect(getAllScores).toHaveBeenCalled());
    expect(screen.queryByText(/percentile/)).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders nothing without ids", () => {
    const { container } = render(<PercentileBadge />, { wrapper });
    expect(container.textContent).toBe("");
  });
});
