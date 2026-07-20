import { describe, it, expect } from "vitest";
import { graphSkillsFromNodes } from "./miniGraphSkills";

describe("graphSkillsFromNodes", () => {
  it("filters to real skill node types and maps category via status", () => {
    const skills = graphSkillsFromNodes([
      { id: "role", type: "role_center", label: "Tax Manager" },
      { id: "gst", type: "core", label: "GST", score: 88 },
      { id: "rep", type: "regular", label: "Reporting", score: 34 },
      { id: "x", type: "regular", label: "Consolidation", score: 0, demonstrated_proficiency: "Not Discussed" },
      { id: "chess", type: "transferable", label: "Strategy", score: 70 },
    ]);
    // role_center is excluded; every other node survives
    expect(skills.map((s) => s.skill_id)).toEqual(["gst", "rep", "x", "chess"]);
    const byId = Object.fromEntries(skills.map((s) => [s.skill_id, s.category]));
    expect(byId.gst).toBe("strong_match");
    expect(byId.rep).toBe("gap");
    expect(byId.x).toBe("not_assessed");
    expect(byId.chess).toBe("transferable");
  });

  it("returns an empty array for no nodes", () => {
    expect(graphSkillsFromNodes([])).toEqual([]);
    expect(graphSkillsFromNodes(undefined as any)).toEqual([]);
  });
});
