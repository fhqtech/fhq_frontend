import { describe, it, expect } from "vitest";
import { shortlistScore, rankByFit } from "./shortlistRank";

describe("shortlistScore", () => {
  it("prefers nested scores.overall, falls back to flat overall_score", () => {
    expect(shortlistScore({ scores: { overall: 82 } })).toBe(82);
    expect(shortlistScore({ overall_score: 55 })).toBe(55);
    expect(shortlistScore({})).toBe(0);
  });
});

describe("rankByFit", () => {
  it("orders best-first and does not mutate the input", () => {
    const input = [{ overall_score: 40 }, { overall_score: 90 }, { scores: { overall: 70 } }];
    const ranked = rankByFit(input);
    expect(ranked.map(shortlistScore)).toEqual([90, 70, 40]);
    // input order is preserved
    expect(input.map(shortlistScore)).toEqual([40, 90, 70]);
  });
});
