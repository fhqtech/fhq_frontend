import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RoleCohortGap } from "./RoleCohortGap";
import { recruiterJourneysApi } from "@/services/recruiterJourneysApi";
import type { CohortGapResult } from "@/services/recruiterJourneysApi";

vi.mock("@/services/recruiterJourneysApi", () => ({
  recruiterJourneysApi: { cohortGap: vi.fn() },
}));

const cohortGap = recruiterJourneysApi.cohortGap as unknown as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => cohortGap.mockReset());

describe("RoleCohortGap", () => {
  it("prompts to set a target and never fetches when there is none", () => {
    render(<RoleCohortGap ws="ws1" programId="p1" hasTarget={false} />, { wrapper });
    expect(screen.getByText("Set a skill target")).toBeTruthy(); // exact = the title, not the description
    expect(cohortGap).not.toHaveBeenCalled();
  });

  it("shows an honest empty state when no candidate has evidence", async () => {
    cohortGap.mockResolvedValue({
      program_id: "p1",
      cohort: { enrolled: 4, with_evidence: 0, without_evidence: 4 },
      skills: [],
      summary: { avg_gap: 0, skills_total: 0 },
    } satisfies CohortGapResult);
    render(<RoleCohortGap ws="ws1" programId="p1" hasTarget />, { wrapper });
    expect(await screen.findByText(/appears once candidates complete a scored stage/)).toBeTruthy();
    expect(screen.queryByText(/avg gap/)).toBeNull();
  });

  it("renders worst-first skills with an honest assessed denominator and an unverified mark", async () => {
    cohortGap.mockResolvedValue({
      program_id: "p1",
      cohort: { enrolled: 4, with_evidence: 2, without_evidence: 2 },
      skills: [
        { canonical_id: "ifrs", skill_name: "IFRS", target: 70, avg_gap: 15, avg_demonstrated: 55, met_count: 1, contributors: 2 },
        { canonical_id: "gst", skill_name: "GST", target: 80, avg_gap: 5, avg_demonstrated: 80, met_count: 1, contributors: 2 },
      ],
      summary: { avg_gap: 10, skills_total: 2 },
    } satisfies CohortGapResult);
    render(<RoleCohortGap ws="ws1" programId="p1" hasTarget />, { wrapper });

    expect(await screen.findByText("IFRS")).toBeTruthy();
    expect(screen.getByText(/2 of 4 candidates assessed/)).toBeTruthy();
    expect(screen.getByText(/2 have no evidence yet/)).toBeTruthy();
    // honest, un-fabricated: reviewer v1 assessments are marked unverified
    expect(screen.getByText("Unverified")).toBeTruthy();
  });
});
