/**
 * P2-1 — the workspace-pulse action queue. The recruiter's home is a queue of
 * things awaiting their action, not a launcher: interviews with responses to
 * review (results) and live interviews (live), NBA-sorted. Draft/setup work is
 * deliberately excluded so an empty queue means "you're caught up". Built from
 * the same interview snapshots the dashboard already loads + the analytics
 * rollup for real completed counts.
 */
import { describe, it, expect } from "vitest";
import { buildActionQueue } from "./buildActionQueue";
import type { InterviewSnapshot } from "./nextBestAction";

const snap = (o: Partial<InterviewSnapshot> & { id: string }): InterviewSnapshot => ({
  status: "draft",
  ...o,
});

describe("buildActionQueue", () => {
  it("returns nothing for an empty list", () => {
    expect(buildActionQueue([])).toEqual([]);
  });

  it("puts an interview with completed responses in the results bucket", () => {
    const q = buildActionQueue([snap({ id: "a", status: "active" })], { a: { completedCandidates: 3 } });
    expect(q).toHaveLength(1);
    expect(q[0].bucket).toBe("results");
    expect(q[0].nba.href).toMatch(/#candidates$/);
  });

  it("puts a live interview with no responses yet in the live bucket", () => {
    const q = buildActionQueue([snap({ id: "b", status: "active" })]);
    expect(q).toHaveLength(1);
    expect(q[0].bucket).toBe("live");
    expect(q[0].nba.action).toBe("share");
  });

  it("excludes draft/setup work so an all-draft workspace reads as caught up", () => {
    const q = buildActionQueue([snap({ id: "c", status: "draft", candidateCount: 0 })]);
    expect(q).toEqual([]);
  });

  it("orders results before live, and within results by completed count desc", () => {
    const q = buildActionQueue(
      [
        snap({ id: "live1", status: "running" }),
        snap({ id: "few", status: "active" }),
        snap({ id: "many", status: "completed" }),
      ],
      { few: { completedCandidates: 2 }, many: { completedCandidates: 9 } },
    );
    expect(q.map((i) => i.id)).toEqual(["many", "few", "live1"]);
    expect(q.map((i) => i.bucket)).toEqual(["results", "results", "live"]);
  });

  it("uses the stats rollup join: the same snapshot flips from excluded to results once responses land", () => {
    const s = snap({ id: "d", status: "active" });
    expect(buildActionQueue([s])).toHaveLength(1); // live (active, 0 completed)
    expect(buildActionQueue([s])[0].bucket).toBe("live");
    const withStats = buildActionQueue([s], { d: { completedCandidates: 1 } });
    expect(withStats[0].bucket).toBe("results");
  });
});
