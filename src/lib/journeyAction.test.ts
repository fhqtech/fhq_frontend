/**
 * P2-5 — the next-best-action verb for one candidate on the role board. Resolves
 * a candidate's journey + current stage into a single verb (start / advance /
 * decide / outcome), so a recruiter scans the board and knows the move per row.
 */
import { describe, it, expect } from "vitest";
import { journeyAction } from "./journeyAction";

const STAGES = [
  { stage_id: "screen", type: "screen", title: "Screen" },
  { stage_id: "fitment", type: "fitment", title: "Fitment" },
  { stage_id: "decide", type: "decision", title: "Decide" },
];

describe("journeyAction", () => {
  it("shows the outcome for a terminal journey", () => {
    expect(journeyAction({ status: "hired", current_stage_id: "decide" }, STAGES)).toEqual({
      label: "Hired",
      terminal: true,
    });
  });

  it("offers a manual decision on a decision stage (no engine start)", () => {
    expect(journeyAction({ status: "active", current_stage_id: "decide" }, STAGES).label).toBe("Decide");
  });

  it("offers Start for an engine-backed stage not yet started", () => {
    expect(journeyAction({ status: "active", current_stage_id: "screen" }, STAGES).label).toBe("Start screen");
  });

  it("offers Advance once the current stage is complete", () => {
    const j = {
      status: "active",
      current_stage_id: "screen",
      stages: [{ stage_id: "screen", type: "screen", status: "complete" }],
    };
    expect(journeyAction(j, STAGES).label).toBe("Advance");
  });
});
