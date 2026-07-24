/**
 * P13 — ScorecardMatrix flag gate + honest-rendering contract.
 *
 * SAFETY for the live pilot: with `scorecard` off (or outside any FlagProvider)
 * this new surface renders nothing, so the pilot is untouched. With it on, the
 * grid must render honestly: an ungrounded score is never shown as verified, a
 * label-aligned row hedges its alignment, and a null-score cell shows the empty
 * placeholder rather than a fabricated 0.
 *
 * The scorecardApi is fully mocked — no network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import type { FlagValues } from "@/lib/flags/resolve";
import ScorecardMatrix from "./ScorecardMatrix";
import { scorecardApi } from "@/services/scorecardApi";
import type { Scorecard, ScorecardMatrixData } from "@/services/scorecardApi";

vi.mock("@/services/scorecardApi", () => ({
  scorecardApi: {
    getMatrix: vi.fn(),
    getScorecard: vi.fn(),
    getPrefillStatus: vi.fn(),
    saveScorecard: vi.fn(),
    addNote: vi.fn(),
    runPrefill: vi.fn(),
  },
}));

const getMatrix = scorecardApi.getMatrix as unknown as ReturnType<typeof vi.fn>;
const getScorecard = scorecardApi.getScorecard as unknown as ReturnType<typeof vi.fn>;
const getPrefillStatus = scorecardApi.getPrefillStatus as unknown as ReturnType<typeof vi.fn>;

const MATRIX: ScorecardMatrixData = {
  candidates: [
    { candidate_id: "c1", name: "Priya Sharma" },
    { candidate_id: "c2", name: "Arjun Mehta" },
  ],
  rows: [
    {
      canonical_id: "ifrs",
      skill_name: "IFRS reporting",
      aligned_by: "canonical",
      cells: {
        // ungrounded score (reviewer v1) — must never read as verified
        c1: { score: 82, grounded: false, aligned_by: "canonical", evidence: ["…"] },
        // null score — must render the placeholder, never a 0
        c2: { score: null, grounded: false, aligned_by: "canonical", evidence: [] },
      },
    },
    {
      canonical_id: null,
      skill_name: "GST reconciliation",
      aligned_by: "label",
      cells: {
        c1: { score: 55, grounded: false, aligned_by: "label", evidence: [] },
        c2: { score: 41, grounded: false, aligned_by: "label", evidence: [] },
      },
    },
  ],
  target_skills: { ifrs: 70 },
  degraded: [{ reason: "Some candidates have no scored interview yet.", affected: ["c2"] }],
};

const SCORECARD_C1: Scorecard = {
  program_id: "p1",
  candidate_id: "c1",
  rows: [
    {
      canonical_id: "ifrs",
      skill_id: "s_ifrs",
      skill_name: "IFRS reporting",
      rating: 82,
      note: "",
      ai_prefilled: false,
      grounded: false,
      evidence_refs: [],
    },
  ],
  notes: [{ author_email: "rohan.iyer@example.in", at: "2026-07-01T10:00:00Z", body: "Strong on close." }],
};

function renderMatrix(overrides: FlagValues) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FlagProvider overrides={overrides}>
        <MemoryRouter initialEntries={["/roles/p1/scorecards"]}>
          <Routes>
            <Route path="/roles/:programId/scorecards" element={<ScorecardMatrix />} />
          </Routes>
        </MemoryRouter>
      </FlagProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getMatrix.mockReset();
  getScorecard.mockReset();
  getPrefillStatus.mockReset();
  getScorecard.mockResolvedValue(SCORECARD_C1);
  getPrefillStatus.mockResolvedValue({ enabled: false });
});

describe("ScorecardMatrix — flag gate", () => {
  it("renders nothing when the scorecard flag is off (pilot untouched)", () => {
    getMatrix.mockResolvedValue(MATRIX);
    const { container } = renderMatrix({ scorecard: false });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("table")).toBeNull();
    expect(getMatrix).not.toHaveBeenCalled();
  });
});

describe("ScorecardMatrix — honest rendering", () => {
  it("renders the grid honestly: no verified affordance, hedged label row, empty placeholder over 0", async () => {
    getMatrix.mockResolvedValue(MATRIX);
    // evidence_contract on so ungrounded scores route through the contract.
    renderMatrix({ scorecard: true, evidence_contract: true });

    // Grid renders once the matrix resolves. Each candidate is a column header
    // button (the selected one also names the editor panel, hence getAllByText).
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThan(0);
    expect(screen.getByText("Arjun Mehta")).toBeInTheDocument();

    // An ungrounded (grounded:false) score is never shown as verified.
    expect(screen.queryByText("verified")).toBeNull();
    // …and it is honestly marked unverified under the evidence contract.
    expect(screen.getAllByText("unverified").length).toBeGreaterThan(0);

    // The label-aligned row hedges its alignment.
    expect(screen.getByText(/aligned by skill name, not canonical id/i)).toBeInTheDocument();

    // The null-score cell shows the placeholder, never a fabricated 0.
    expect(screen.getByText("no scored tag yet")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("hides the AI-prefill draft button when prefill is disabled", async () => {
    getMatrix.mockResolvedValue(MATRIX);
    renderMatrix({ scorecard: true });

    await screen.findByRole("table");
    await waitFor(() => expect(getPrefillStatus).toHaveBeenCalled());
    expect(screen.queryByText(/ai-prefill draft/i)).toBeNull();
  });
});
