/**
 * P2-2 — the typed-column pipeline board groups candidate journeys into one
 * column per stage, in template order. A journey lands in the column of its
 * current stage; a journey pointing at a stage not in the template is never
 * dropped (it falls into the last column) so no candidate disappears off the board.
 */
import { describe, it, expect } from "vitest";
import { groupJourneysByStage, appendStage } from "./stageColumns";

const stage = (id: string) => ({ stage_id: id, type: id, title: id });
const journey = (current_stage_id: string) => ({
  journey_instance_id: `${current_stage_id}-j`,
  current_stage_id,
});

describe("groupJourneysByStage", () => {
  it("returns one column per stage in template order, empty when no journeys", () => {
    const cols = groupJourneysByStage([stage("screen"), stage("fitment")], []);
    expect(cols.map((c) => c.stage.stage_id)).toEqual(["screen", "fitment"]);
    expect(cols.every((c) => c.journeys.length === 0)).toBe(true);
  });

  it("places a journey in the column of its current stage", () => {
    const cols = groupJourneysByStage([stage("screen"), stage("fitment")], [journey("fitment")]);
    expect(cols[0].journeys).toHaveLength(0);
    expect(cols[1].journeys.map((j) => j.journey_instance_id)).toEqual(["fitment-j"]);
  });

  it("never drops a journey whose stage is missing from the template", () => {
    const cols = groupJourneysByStage([stage("screen"), stage("fitment")], [journey("ghost")]);
    const total = cols.reduce((n, c) => n + c.journeys.length, 0);
    expect(total).toBe(1);
    // unmatched lands in the last column
    expect(cols[cols.length - 1].journeys.map((j) => j.journey_instance_id)).toEqual(["ghost-j"]);
  });
});

describe("appendStage", () => {
  it("appends a typed stage with order 0 and a default label", () => {
    const s = appendStage([], "screen");
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ order: 0, type: "screen", title: "Screen" });
  });

  it("keeps existing stages and increments order with a distinct id", () => {
    const next = appendStage(appendStage([], "screen"), "fitment");
    expect(next.map((x) => x.type)).toEqual(["screen", "fitment"]);
    expect(next[1]).toMatchObject({ order: 1, type: "fitment", title: "Fitment" });
    expect(next[1].stage_id).not.toBe(next[0].stage_id);
  });
});
