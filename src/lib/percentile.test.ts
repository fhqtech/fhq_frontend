import { describe, it, expect } from "vitest";
import { percentileRank, cohortPercentile, ordinal, MIN_COHORT } from "./percentile";

describe("percentileRank", () => {
  it("ranks the top value near 100 (mid-rank on the tie with itself excluded)", () => {
    // value 90 vs cohort of 9 lower scores -> all below -> 100th
    expect(percentileRank(90, [10, 20, 30, 40, 50, 60, 70, 80, 85])).toBe(100);
  });

  it("ranks the bottom value near 0", () => {
    expect(percentileRank(5, [10, 20, 30, 40, 50, 60, 70, 80, 90])).toBe(0);
  });

  it("uses the mid-rank convention on ties", () => {
    // one below, two equal, one above, n=4 -> (1 + 0.5*2)/4 = 50
    expect(percentileRank(50, [40, 50, 50, 60])).toBe(50);
  });
});

describe("cohortPercentile", () => {
  const cohort = Array.from({ length: 10 }, (_, i) => i * 10); // 0..90, n=10

  it("returns ok with a percentile when the cohort meets MIN_COHORT", () => {
    const r = cohortPercentile(55, cohort);
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.n).toBe(10);
      expect(r.percentile).toBeGreaterThan(0);
    }
  });

  it("returns insufficient below MIN_COHORT", () => {
    const r = cohortPercentile(55, [10, 20, 30]);
    expect(r).toEqual({ status: "insufficient", n: 3 });
  });

  it("returns insufficient when the value is null", () => {
    const r = cohortPercentile(null, cohort);
    expect(r.status).toBe("insufficient");
  });

  it("drops null/NaN cohort entries before counting", () => {
    const dirty = [...cohort, null, undefined, NaN] as Array<number | null | undefined>;
    const r = cohortPercentile(55, dirty);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.n).toBe(10);
  });

  it("MIN_COHORT is 8", () => {
    expect(MIN_COHORT).toBe(8);
  });
});

describe("ordinal", () => {
  it("suffixes correctly including the 11-13 exception", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(72)).toBe("72nd");
  });
});
