import { describe, it, expect } from "vitest";
import { stagesForPipeline } from "./OpenRoleFlow";

describe("stagesForPipeline", () => {
  it("screen-only starts with a single screen stage", () => {
    const s = stagesForPipeline("screen");
    expect(s.map((x) => x.type)).toEqual(["screen"]);
  });

  it("screen + interview adds an interview and a decision", () => {
    const s = stagesForPipeline("interview");
    expect(s.map((x) => x.type)).toEqual(["screen", "interview", "decision"]);
  });

  it("full loop is screen, assignment, interview, decision", () => {
    const s = stagesForPipeline("full");
    expect(s.map((x) => x.type)).toEqual(["screen", "assignment", "interview", "decision"]);
  });

  it("orders stages sequentially from 0", () => {
    const s = stagesForPipeline("full");
    expect(s.map((x) => x.order)).toEqual([0, 1, 2, 3]);
  });
});
