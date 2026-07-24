import { describe, it, expect } from "vitest";
import { gapResultToCsvRows } from "./gapCsv";
import type { GapResult } from "@/services/recruiterJourneysApi";

const gap: GapResult = {
  gaps: [
    { canonical_id: "acc.close", skill_name: "Month-end close", target: 80, demonstrated: 85, gap: 0, met: true },
    { canonical_id: "tax.gst", skill_name: "GST filing", target: 75, demonstrated: 40, gap: 35, met: false },
  ],
  summary: { met_count: 1, total: 2, avg_gap: 17.5 },
};

describe("gapResultToCsvRows", () => {
  it("emits a sentence-case header row", () => {
    const rows = gapResultToCsvRows(gap);
    expect(rows[0]).toEqual(["Skill", "Target", "Demonstrated", "Points short", "Meets bar"]);
  });

  it("emits one row per skill with met coerced to yes/no", () => {
    const rows = gapResultToCsvRows(gap);
    expect(rows[1]).toEqual(["Month-end close", 80, 85, 0, "yes"]);
    expect(rows[2]).toEqual(["GST filing", 75, 40, 35, "no"]);
  });

  it("appends a rounded summary", () => {
    const rows = gapResultToCsvRows(gap);
    const flat = rows.map((r) => r.join("|"));
    expect(flat).toContain("Skills meeting the bar|1 of 2|||");
    expect(flat).toContain("Average points short|18|||"); // 17.5 rounded
  });
});
