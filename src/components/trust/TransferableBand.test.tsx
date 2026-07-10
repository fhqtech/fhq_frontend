/**
 * P4-5 — TransferableBand render contract.
 *
 * The band surfaces the synthesiser's within-finance transferable strengths on
 * the recruiter-results page, soberly. It is default-off: it renders only when
 * the `transferable` flag is on. Given strengths it relays them as calm leads
 * ("strength in taxation likely transfers to audit"), never a hype claim, never
 * a scored number; given none it renders nothing at all — not an empty box.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { TransferableBand } from "./TransferableBand";
import type { TransferableSkill } from "@/types/interviewResults";

const strengths: TransferableSkill[] = [
  {
    source: "Taxation",
    skill_demonstrated: "Statutory audit",
    relevance_to_role: "Reconciling tax positions sharpens the audit trail this role reviews.",
    score: 78,
  },
  {
    source: "Management consulting",
    skill_demonstrated: "Financial planning and analysis",
    relevance_to_role: "Structured problem framing carries into the modelling this role owns.",
    score: 64,
  },
];

function renderOn(skills?: TransferableSkill[]) {
  return render(
    <FlagProvider overrides={{ transferable: true }}>
      <TransferableBand skills={skills} />
    </FlagProvider>,
  );
}

describe("TransferableBand", () => {
  it("renders each within-finance strength as a sober transfer lead", () => {
    renderOn(strengths);

    // Sentence-case heading, exposed as a labelled region.
    const region = screen.getByRole("region", { name: /transferable strengths/i });
    expect(region).toBeInTheDocument();

    // The two finance terms of each strength are shown.
    expect(screen.getByText("Taxation")).toBeInTheDocument();
    expect(screen.getByText("Statutory audit")).toBeInTheDocument();
    expect(screen.getByText("Management consulting")).toBeInTheDocument();
    expect(screen.getByText("Financial planning and analysis")).toBeInTheDocument();

    // Sober hedged framing, not a hype claim.
    expect(screen.getAllByText(/likely transfers to/i).length).toBe(2);

    // Relevance note is relayed.
    expect(
      screen.getByText(/reconciling tax positions sharpens the audit trail/i),
    ).toBeInTheDocument();
  });

  it("never renders the transferable score as a confident number", () => {
    const { container } = renderOn(strengths);
    // The scores (78, 64) carry no grounding, so no digits leak into the band.
    // (Relevance copy in this fixture contains no digits.)
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });

  it("renders nothing when there are no strengths (not an empty box)", () => {
    const { container } = renderOn([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when skills is undefined", () => {
    const { container } = renderOn(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every strength is filtered out as non-finance", () => {
    const { container } = renderOn([
      { source: "Chess", skill_demonstrated: "Analytical reasoning", relevance_to_role: "x", score: 90 },
      { source: "Cricket", skill_demonstrated: "Team leadership", relevance_to_role: "y", score: 80 },
    ]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the transferable flag is off (default-off)", () => {
    const { container } = render(
      <FlagProvider overrides={{ transferable: false }}>
        <TransferableBand skills={strengths} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing outside any FlagProvider (default-off)", () => {
    const { container } = render(<TransferableBand skills={strengths} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is calm — it never accuses the candidate", () => {
    const { container } = renderOn(strengths);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("cheat");
    expect(text).not.toContain("fraud");
    expect(text).not.toContain("fake");
  });
});
