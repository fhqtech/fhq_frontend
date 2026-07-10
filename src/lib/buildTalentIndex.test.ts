/**
 * P3-1 — the cross-role Talent index. Collapses the per-interview score rows
 * from /api/scores/all (a candidate appears once per interview they sat) into
 * one row per human: their best demonstrated score, how many roles they've been
 * through, and when they were last active. The spine of the Talent surface.
 */
import { describe, it, expect } from "vitest";
import { buildTalentIndex, filterTalent } from "./buildTalentIndex";
import type { CandidateScore } from "@/services/scoreAnalyticsApi";

const score = (over: Partial<CandidateScore>): CandidateScore => ({
  candidate_id: "c1",
  candidate_name: "Priya Sharma",
  candidate_email: "priya@example.com",
  interview_type: "preliminary",
  interview_id: "i1",
  ats_score: null,
  ats_method: null,
  ai_interview_score: null,
  human_score: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("buildTalentIndex", () => {
  it("collapses multiple interviews for one candidate into a single row", () => {
    const rows = buildTalentIndex([
      score({ interview_id: "i1", ai_interview_score: 72 }),
      score({ interview_id: "i2", interview_type: "fitment", human_score: 88 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].candidateId).toBe("c1");
    expect(rows[0].interviewCount).toBe(2);
  });

  it("takes the best displayable score, preferring human > ai > ats per row", () => {
    const rows = buildTalentIndex([
      score({ interview_id: "i1", ai_interview_score: 72, ats_score: 90 }),
      score({ interview_id: "i2", human_score: 81, ai_interview_score: 60 }),
    ]);
    // row1 displays 72 (human absent → ai), row2 displays 81 (human wins); best = 81
    expect(rows[0].bestScore).toBe(81);
  });

  it("keeps candidates separate and sorts by best score descending", () => {
    const rows = buildTalentIndex([
      score({ candidate_id: "c1", candidate_name: "Priya Sharma", ai_interview_score: 64 }),
      score({ candidate_id: "c2", candidate_name: "Arjun Mehta", ai_interview_score: 91 }),
    ]);
    expect(rows.map((r) => r.candidateId)).toEqual(["c2", "c1"]);
  });

  it("groups by email when candidate_id is missing", () => {
    const rows = buildTalentIndex([
      score({ candidate_id: "", candidate_email: "rohan@example.com", interview_id: "i1" }),
      score({ candidate_id: "", candidate_email: "rohan@example.com", interview_id: "i2" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].interviewCount).toBe(2);
  });

  it("reports the most recent activity across a candidate's interviews", () => {
    const rows = buildTalentIndex([
      score({ interview_id: "i1", updated_at: "2026-02-01T00:00:00Z" }),
      score({ interview_id: "i2", updated_at: "2026-05-09T00:00:00Z" }),
    ]);
    expect(rows[0].latestActivity).toBe("2026-05-09T00:00:00Z");
  });

  it("sorts a scoreless candidate (null best) last", () => {
    const rows = buildTalentIndex([
      score({ candidate_id: "c1", ai_interview_score: null }),
      score({ candidate_id: "c2", ai_interview_score: 50 }),
    ]);
    expect(rows.map((r) => r.candidateId)).toEqual(["c2", "c1"]);
    expect(rows[1].bestScore).toBeNull();
  });
});

describe("filterTalent", () => {
  const rows = buildTalentIndex([
    score({ candidate_id: "c1", candidate_name: "Priya Sharma", candidate_email: "priya@ca.in" }),
    score({ candidate_id: "c2", candidate_name: "Arjun Mehta", candidate_email: "arjun@ca.in" }),
  ]);

  it("returns all rows for an empty query", () => {
    expect(filterTalent(rows, "  ")).toHaveLength(2);
  });

  it("matches on name, case-insensitively", () => {
    expect(filterTalent(rows, "priya").map((r) => r.candidateId)).toEqual(["c1"]);
  });

  it("matches on email", () => {
    expect(filterTalent(rows, "arjun@").map((r) => r.candidateId)).toEqual(["c2"]);
  });
});
