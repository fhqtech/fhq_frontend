/**
 * B3 — the skill-gap summary. Two honest inputs collapse to one shape a card can
 * render: (a) the TAG's own status buckets from a completed interview — the
 * zero-setup gap every real result already carries — and (b) the explicit
 * gap-vs-target read when a role has authored target bars. Neither invents a
 * number the backend didn't produce.
 */
import { describe, it, expect } from "vitest";
import { summarizeFromNodes, summarizeFromGapResult } from "./skillGap";
import type { TagNode } from "@/components/tag/types";
import type { GapResult } from "@/services/recruiterJourneysApi";

const node = (label: string, score: number | undefined, type = "skill"): TagNode =>
  ({ id: label, label, score, type } as TagNode);

describe("summarizeFromNodes (TAG status buckets)", () => {
  it("returns null when there are no scored skill nodes", () => {
    expect(summarizeFromNodes([{ id: "r", label: "Role", type: "role_center" } as TagNode])).toBeNull();
  });

  it("counts skills met (strong) against the total scored, excluding role + transferable", () => {
    const s = summarizeFromNodes([
      node("GST compliance", 88),
      node("Financial reporting", 34),
      node("Tax audit", 61),
      { id: "t", label: "Chess", score: 90, type: "transferable" } as TagNode,
      { id: "r", label: "Role", type: "role_center" } as TagNode,
    ])!;
    expect(s.total).toBe(3); // transferable + role excluded
    expect(s.met).toBe(1); // only the 88 is strong (>=80)
    expect(s.mode).toBe("status");
  });

  it("lists the below-bar skills worst-first with their status", () => {
    const s = summarizeFromNodes([
      node("GST compliance", 88),
      node("Tax audit", 61),
      node("Financial reporting", 34),
    ])!;
    expect(s.gapItems.map((g) => g.skillName)).toEqual(["Financial reporting", "Tax audit"]);
    expect(s.gapItems[0].status).toBe("gap"); // 34 -> gap
    expect(s.gapItems[1].status).toBe("developing"); // 61 -> developing
  });

  it("excludes un-probed (not_assessed) skills from total, met and gaps", () => {
    const s = summarizeFromNodes([
      node("GST compliance", 88),
      {
        id: "u",
        label: "Consolidation",
        score: 0,
        type: "regular",
        demonstrated_proficiency: "Not Discussed",
      } as TagNode,
    ])!;
    expect(s.total).toBe(1); // only the probed skill counts toward the bar
    expect(s.met).toBe(1);
    expect(s.gapItems).toEqual([]); // an un-probed skill is not a gap
  });

  it("carries demonstrated + required proficiency onto gap items", () => {
    const s = summarizeFromNodes([
      {
        id: "g",
        label: "Financial reporting",
        score: 34,
        type: "regular",
        demonstrated_proficiency: "Awareness",
        required_proficiency: "Intermediate",
      } as TagNode,
    ])!;
    expect(s.gapItems[0].demonstratedProficiency).toBe("Awareness");
    expect(s.gapItems[0].requiredProficiency).toBe("Intermediate");
  });
});

describe("summarizeFromGapResult (explicit target bars)", () => {
  const gap: GapResult = {
    gaps: [
      { canonical_id: "a", skill_name: "GST compliance", target: 80, demonstrated: 85, gap: 0, met: true },
      { canonical_id: "b", skill_name: "Deferred tax", target: 70, demonstrated: 30, gap: 40, met: false },
      { canonical_id: "c", skill_name: "Consolidation", target: 60, demonstrated: 45, gap: 15, met: false },
    ],
    summary: { met_count: 1, total: 3, avg_gap: 18.33 },
  };

  it("carries the rollup and sorts unmet skills by largest gap", () => {
    const s = summarizeFromGapResult(gap);
    expect(s.met).toBe(1);
    expect(s.total).toBe(3);
    expect(s.avgGap).toBeCloseTo(18.33);
    expect(s.mode).toBe("target");
    expect(s.gapItems.map((g) => g.skillName)).toEqual(["Deferred tax", "Consolidation"]);
    expect(s.gapItems[0].target).toBe(70);
    expect(s.gapItems[0].score).toBe(30);
  });
});
