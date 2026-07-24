import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PipelineTable } from "./PipelineTable";
import type { JourneyStage, JourneyInstance } from "@/services/recruiterJourneysApi";

const stages: JourneyStage[] = [
  { stage_id: "s1", order: 0, type: "screen", title: "Screen" },
  { stage_id: "s2", order: 1, type: "interview", title: "Interview" },
];

const journeys: JourneyInstance[] = [
  {
    journey_instance_id: "j1",
    candidate_id: "c1",
    candidate_name: "Priya Sharma",
    current_stage_id: "s2",
    status: "active",
    stages: [{ stage_id: "s2", type: "interview", status: "unlocked" }],
    stage_progress: [{ stage_id: "s2", status: "in_progress", score: 72 }],
  },
];

describe("PipelineTable", () => {
  it("renders a row per journey with name and current stage", () => {
    render(<PipelineTable stages={stages} journeys={journeys} />);
    expect(screen.getByText("Priya Sharma")).toBeTruthy();
    expect(screen.getByText("Interview")).toBeTruthy();
  });

  it("derives the score from stage_progress into a ScoreChip", () => {
    render(<PipelineTable stages={stages} journeys={journeys} />);
    // 72 -> developing band, shown as the chip number.
    expect(screen.getByText("72")).toBeTruthy();
  });

  it("shows an empty state when there are no journeys", () => {
    render(<PipelineTable stages={stages} journeys={[]} />);
    expect(screen.getByText(/No candidates in this role yet/i)).toBeTruthy();
  });
});
