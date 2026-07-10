/**
 * P3-5 — the compare tray. A just-in-time slide-up that aligns 2–4 picked
 * candidates side by side on their demonstrated scores, so a recruiter decides
 * between shortlisted people without hopping between six tabs. Dismisses after
 * the call is made.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareTray } from "./CompareTray";
import type { TalentRow } from "@/lib/buildTalentIndex";

const row = (over: Partial<TalentRow>): TalentRow => ({
  candidateId: "c1",
  name: "Priya Sharma",
  email: "priya@ca.in",
  interviewCount: 1,
  bestScore: 80,
  latestActivity: "2026-05-01T00:00:00Z",
  types: ["preliminary"],
  scores: [],
  ...over,
});

describe("CompareTray", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CompareTray open={false} rows={[]} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a column per candidate with their best score", () => {
    render(
      <CompareTray
        open
        rows={[
          row({ candidateId: "c1", name: "Priya Sharma", bestScore: 80 }),
          row({ candidateId: "c2", name: "Arjun Mehta", bestScore: 91 }),
        ]}
        onClose={vi.fn()}
      />,
    );
    const region = screen.getByRole("region", { name: /compare/i });
    expect(within(region).getByText("Priya Sharma")).toBeInTheDocument();
    expect(within(region).getByText("Arjun Mehta")).toBeInTheDocument();
    expect(within(region).getByText("80")).toBeInTheDocument();
    expect(within(region).getByText("91")).toBeInTheDocument();
  });

  it("marks an unscored candidate rather than inventing a number", () => {
    render(<CompareTray open rows={[row({ bestScore: null })]} onClose={vi.fn()} />);
    expect(screen.getByText(/unscored/i)).toBeInTheDocument();
  });

  it("closes when dismissed", async () => {
    const onClose = vi.fn();
    render(<CompareTray open rows={[row({})]} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
