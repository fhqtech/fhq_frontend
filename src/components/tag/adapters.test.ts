/**
 * Unit tests for the TAG data adapters — the blueprint/result/preview payloads
 * → unified TagData transform. Pure functions, no DOM. These guard the geometry
 * and status logic that drives the marquee TAG renderer.
 */
import { describe, it, expect } from "vitest";
import {
  tagFromBlueprint,
  tagFromPreview,
  tagFromResult,
  nodeStatus,
  computeStats,
  type PreviewSkillLite,
} from "./adapters";
import type { RawBlueprint, RawInterviewResults, TagNode } from "./types";

describe("tagFromBlueprint", () => {
  const bp: RawBlueprint = {
    role_title: "Tax Manager",
    skills: [
      { skill_id: "gst", name: "GST compliance", short_name: "GST" },
      { skill_id: "tds", name: "TDS filing" },
      { skill_id: "advisory", name: "Advisory work" },
    ],
    skill_layout: {
      core_skills: ["gst"],
      derived_skills: [{ skill_id: "advisory", derives_from: "gst" }],
    },
  };

  it("prepends a single role_center node", () => {
    const tag = tagFromBlueprint(bp);
    const centers = tag.nodes.filter((n) => n.type === "role_center");
    expect(centers).toHaveLength(1);
    expect(centers[0].label).toBe("Tax Manager");
    expect(tag.roleTitle).toBe("Tax Manager");
  });

  it("marks core skills and falls back regular otherwise", () => {
    const tag = tagFromBlueprint(bp);
    const gst = tag.nodes.find((n) => n.id === "gst")!;
    const tds = tag.nodes.find((n) => n.id === "tds")!;
    expect(gst.type).toBe("core");
    expect(gst.is_core).toBe(true);
    expect(tds.type).toBe("regular");
    expect(tds.is_core).toBe(false);
  });

  it("derives short_name from the first word when absent", () => {
    const tds = tagFromBlueprint(bp).nodes.find((n) => n.id === "tds")!;
    expect(tds.short_name).toBe("TDS"); // "TDS filing" → "TDS"
  });

  it("maps derived_skills to parent_skill_id", () => {
    const advisory = tagFromBlueprint(bp).nodes.find((n) => n.id === "advisory")!;
    expect(advisory.parent_skill_id).toBe("gst");
  });

  it("synthesizes one edge per skill, all rooted at the center", () => {
    const tag = tagFromBlueprint(bp);
    expect(tag.edges).toHaveLength(3);
    expect(tag.edges.every((e) => e.source === "_role_center")).toBe(true);
  });

  it("defaults the role title when none provided", () => {
    const tag = tagFromBlueprint({ skills: [] });
    expect(tag.roleTitle).toBe("Role");
  });
});

describe("tagFromPreview", () => {
  const skills: PreviewSkillLite[] = [
    { shortName: "GST", name: "GST compliance", skill_type: "technical" },
    { shortName: "Comms", name: "Communication", skill_type: "behavioral" },
  ];

  it("positions every skill node inside the normalized [0,1] canvas", () => {
    const tag = tagFromPreview("Tax Manager", skills);
    const skillNodes = tag.nodes.filter((n) => n.type !== "role_center");
    expect(skillNodes).toHaveLength(2);
    for (const n of skillNodes) {
      expect(n.position).toBeDefined();
      expect(n.position!.x).toBeGreaterThanOrEqual(0);
      expect(n.position!.x).toBeLessThanOrEqual(1);
      expect(n.position!.y).toBeGreaterThanOrEqual(0);
      expect(n.position!.y).toBeLessThanOrEqual(1);
    }
  });

  it("flags only technical skills as core", () => {
    const tag = tagFromPreview("Tax Manager", skills);
    const gst = tag.nodes.find((n) => n.label === "GST compliance")!;
    const comms = tag.nodes.find((n) => n.label === "Communication")!;
    expect(gst.is_core).toBe(true);
    expect(comms.is_core).toBe(false);
  });
});

describe("tagFromResult", () => {
  it("passes backend graph_data through and prefers the center node's label", () => {
    const results: RawInterviewResults = {
      graph_data: {
        nodes: [
          { id: "_role_center", type: "role_center", label: "Audit Lead", is_core: false },
          { id: "gaap", type: "core", label: "GAAP", is_core: true, score: 88 },
        ],
        edges: [{ source: "_role_center", target: "gaap", type: "integration" }],
      },
    };
    const tag = tagFromResult(results, "Fallback");
    expect(tag.roleTitle).toBe("Audit Lead");
    expect(tag.nodes).toHaveLength(2);
    expect(tag.edges).toHaveLength(1);
  });

  it("falls back to the provided title when no center node exists", () => {
    const tag = tagFromResult({ graph_data: { nodes: [] } }, "Fallback role");
    expect(tag.roleTitle).toBe("Fallback role");
  });
});

describe("nodeStatus + computeStats", () => {
  const node = (over: Partial<TagNode>): TagNode => ({
    id: "x",
    type: "core",
    label: "x",
    is_core: true,
    ...over,
  });

  it("buckets by score band (≥80 strong, ≥50 developing, else gap)", () => {
    expect(nodeStatus(node({ score: 90 }))).toBe("strong");
    expect(nodeStatus(node({ score: 65 }))).toBe("developing");
    expect(nodeStatus(node({ score: 20 }))).toBe("gap");
    expect(nodeStatus(node({ score: undefined }))).toBe("gap");
  });

  it("honours explicit node types over score", () => {
    expect(nodeStatus(node({ type: "role_center" }))).toBe("role_center");
    expect(nodeStatus(node({ type: "transferable", score: 10 }))).toBe("transferable");
  });

  it("marks un-probed skills not_assessed by proficiency or evidence sentinel", () => {
    expect(nodeStatus(node({ score: 0, demonstrated_proficiency: "Not Discussed" }))).toBe("not_assessed");
    expect(nodeStatus(node({ score: 0, evidence: ["Skill not covered during interview."] }))).toBe("not_assessed");
    // a bare score of 0/undefined without the sentinel stays a gap
    expect(nodeStatus(node({ score: 0 }))).toBe("gap");
  });

  it("excludes not_assessed nodes from computeStats counts", () => {
    const counts = computeStats([
      node({ score: 85 }),
      node({ score: 0, demonstrated_proficiency: "Not Discussed" }),
    ]);
    expect(counts).toEqual({ strong: 1, developing: 0, gap: 0, transferable: 0 });
  });

  it("tallies counts and excludes the role center", () => {
    const counts = computeStats([
      node({ type: "role_center" }),
      node({ score: 85 }),
      node({ score: 84 }),
      node({ score: 60 }),
      node({ score: 10 }),
      node({ type: "transferable" }),
    ]);
    expect(counts).toEqual({ strong: 2, developing: 1, gap: 1, transferable: 1 });
  });
});
