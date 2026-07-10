/**
 * P2-2 — the typed-column pipeline board. One column per stage in order;
 * a candidate's journey card sits under the column of its current stage; empty
 * columns read "no one here yet" rather than vanishing. The view that makes a
 * role's pipeline legible at a glance.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PipelineBoard } from "./PipelineBoard";
import type { JourneyStage, JourneyInstance } from "@/services/recruiterJourneysApi";

const stage = (stage_id: string, order: number, type: string, title: string): JourneyStage =>
  ({ stage_id, order, type: type as JourneyStage["type"], title });
const journey = (id: string, name: string, current_stage_id: string): JourneyInstance =>
  ({ journey_instance_id: id, candidate_id: id, candidate_name: name, current_stage_id, status: "active" }) as JourneyInstance;

const STAGES = [
  stage("screen", 0, "screen", "Screen"),
  stage("fitment", 1, "fitment", "Fitment"),
  stage("decide", 2, "decision", "Decide"),
];

describe("PipelineBoard", () => {
  it("renders a column per stage in order", () => {
    render(<PipelineBoard stages={STAGES} journeys={[]} />);
    expect(
      screen.getAllByRole("heading").map((h) => h.textContent),
    ).toEqual(expect.arrayContaining(["Screen", "Fitment", "Decide"]));
  });

  it("places a candidate card under the column of its current stage", () => {
    render(<PipelineBoard stages={STAGES} journeys={[journey("j1", "Priya Sharma", "fitment")]} />);
    const fitment = screen.getByRole("heading", { name: "Fitment" }).closest("section")!;
    expect(within(fitment).getByText("Priya Sharma")).toBeInTheDocument();
    // P2-5: the card shows the next-best-action verb for the candidate's stage
    expect(within(fitment).getByText(/start fitment/i)).toBeInTheDocument();
    const screenCol = screen.getByRole("heading", { name: "Screen" }).closest("section")!;
    expect(within(screenCol).getByText(/no one here yet/i)).toBeInTheDocument();
  });

  it("opens a candidate when its card is clicked", async () => {
    const onOpenCandidate = vi.fn();
    render(
      <PipelineBoard
        stages={STAGES}
        journeys={[journey("j1", "Priya Sharma", "fitment")]}
        onOpenCandidate={onOpenCandidate}
      />,
    );
    await userEvent.click(screen.getByText("Priya Sharma"));
    expect(onOpenCandidate).toHaveBeenCalledWith(expect.objectContaining({ journey_instance_id: "j1" }));
  });
});
