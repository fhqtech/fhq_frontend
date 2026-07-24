/**
 * P8 — post-interview integrity & coverage summary.
 *
 * Contract locked by these tests:
 *   - Default-OFF: renders nothing unless the `integrity` flag is on, so the
 *     running pilot is untouched.
 *   - When on with a grounded summary: renders the coverage lists, the
 *     expected-vs-submitted diff, the advisory line, and the turn-cited
 *     IntegrityNote children.
 *   - Honest-empty: when coverage is null it shows the honest empty copy and
 *     fabricates no defended/hollow/unprobed counts.
 *   - Advisory + never accusatory: the score line frames itself as advisory and
 *     the rendered copy contains none of the banned accusatory terms.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { ACCUSATORY_TERMS } from "@/lib/integrity";
import type { IntegritySummary } from "@/services/integritySummaryApi";

// Mock the query hook so the component renders synchronously without a
// QueryClientProvider or a real fetch.
const { mockUseIntegritySummary } = vi.hoisted(() => ({
  mockUseIntegritySummary: vi.fn(),
}));
vi.mock("@/queries/resultsQueries", () => ({
  useIntegritySummary: mockUseIntegritySummary,
}));
// Mark-fair is fire-and-forget; stub it so a click never hits the network.
vi.mock("@/services/integrityApi", () => ({
  integrityApi: { markFair: vi.fn().mockResolvedValue({}) },
}));

import { IntegrityCoverageSummary } from "./IntegrityCoverageSummary";

// Priya Sharma's indirect-tax defense — a calm, realistic finance fixture.
const fullSummary: IntegritySummary = {
  session_id: "sess-1",
  coverage: {
    defended: ["Statutory close"],
    hollow: ["GST reconciliation"],
    unprobed: ["Consolidation"],
  },
  expected_vs_submitted_diff: {
    concept: "GST input tax credit",
    target_level: 4,
    grounding_ratio: 0.4,
    flag: true,
    model_answer: "Walk through the three-way match before releasing payment.",
    submitted: "We matched the invoice to the purchase order and receipt.",
  },
  advisory_suspicion: 0.85,
  advisory: true,
  integrity_flags: [
    {
      turn: 3,
      quote: "We reconciled the ledgers the night before the filing deadline.",
      skill_name: null,
      canonical_id: null,
      note: "Flagged for review — the phrasing here resembled an external source. Advisory only.",
    },
  ],
};

function renderWith(flagOn: boolean, data: IntegritySummary | undefined) {
  mockUseIntegritySummary.mockReturnValue({ data });
  return render(
    <FlagProvider overrides={{ integrity: flagOn }}>
      <IntegrityCoverageSummary sessionId="sess-1" />
    </FlagProvider>,
  );
}

describe("IntegrityCoverageSummary — flag gating", () => {
  it("renders nothing when the integrity flag is off", () => {
    const { container } = renderWith(false, fullSummary);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("IntegrityCoverageSummary — grounded summary", () => {
  it("renders coverage, the diff, the advisory line, and integrity notes", () => {
    renderWith(true, fullSummary);

    // Coverage lists.
    expect(screen.getByText(/statutory close/i)).toBeInTheDocument();
    expect(screen.getByText(/gst reconciliation/i)).toBeInTheDocument();
    expect(screen.getByText(/consolidation/i)).toBeInTheDocument();

    // Expected-vs-submitted diff.
    expect(screen.getByText(/grounding 40%/i)).toBeInTheDocument();
    expect(screen.getByText(/sounds hollow vs the model answer/i)).toBeInTheDocument();

    // Advisory line + tabular score.
    expect(
      screen.getByText(/advisory signal, never an automatic decision/i),
    ).toBeInTheDocument();
    expect(screen.getByText("0.85")).toBeInTheDocument();

    // Turn-cited IntegrityNote child rendered.
    expect(screen.getByText(fullSummary.integrity_flags[0].quote)).toBeInTheDocument();
    expect(screen.getByText(/turn 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark as fair/i })).toBeInTheDocument();
  });
});

describe("IntegrityCoverageSummary — honest empty coverage", () => {
  it("shows the honest empty copy and fabricates no coverage counts", () => {
    renderWith(true, {
      ...fullSummary,
      coverage: null,
      expected_vs_submitted_diff: null,
      integrity_flags: [],
    });

    expect(
      screen.getByText(
        /coverage summary is available only for interviews that included a practical defense/i,
      ),
    ).toBeInTheDocument();
    // No fabricated defended/hollow/unprobed labels.
    expect(screen.queryByText(/defended:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hollow:/i)).not.toBeInTheDocument();
  });
});

describe("IntegrityCoverageSummary — advisory, never accusatory", () => {
  it("frames the score as advisory and uses no accusatory language", () => {
    const { container } = renderWith(true, fullSummary);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).toContain("advisory");
    for (const term of ACCUSATORY_TERMS) {
      expect(text).not.toContain(term);
    }
  });
});
