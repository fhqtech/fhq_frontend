/**
 * P1-5 — the sample TAG must be a valid, fully-positioned result graph so it
 * renders identically to a real one (result-mode nodes collapse to the centre
 * without a position). Locks the finance framing and a full status spread.
 */
import { describe, it, expect } from "vitest";
import { SAMPLE_ROLE_TAG } from "./sampleRoleTag";
import { nodeStatus } from "@/components/tag/adapters";

describe("SAMPLE_ROLE_TAG", () => {
  it("is a finance role with a centre and six skills", () => {
    expect(SAMPLE_ROLE_TAG.roleTitle).toBe("Senior tax associate");
    expect(SAMPLE_ROLE_TAG.nodes.find((n) => n.type === "role_center")).toBeDefined();
    expect(SAMPLE_ROLE_TAG.nodes.filter((n) => n.type !== "role_center")).toHaveLength(6);
  });

  it("gives every node a position inside the [0,1] canvas", () => {
    for (const n of SAMPLE_ROLE_TAG.nodes) {
      expect(n.position).toBeDefined();
      expect(n.position!.x).toBeGreaterThanOrEqual(0);
      expect(n.position!.x).toBeLessThanOrEqual(1);
      expect(n.position!.y).toBeGreaterThanOrEqual(0);
      expect(n.position!.y).toBeLessThanOrEqual(1);
    }
  });

  it("spreads across strong, developing, gap, and transferable so every status reads", () => {
    const statuses = new Set(
      SAMPLE_ROLE_TAG.nodes.filter((n) => n.type !== "role_center").map((n) => nodeStatus(n)),
    );
    expect(statuses.has("strong")).toBe(true);
    expect(statuses.has("developing")).toBe(true);
    expect(statuses.has("gap")).toBe(true);
    expect(statuses.has("transferable")).toBe(true);
  });
});
