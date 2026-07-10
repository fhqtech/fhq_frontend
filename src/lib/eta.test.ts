/**
 * P1-1 — ETA phrasing. Long operations show "usually ready within {phrase}",
 * sourced from the server p50 (with a static fallback). The phrase is hedged
 * and sentence case, never a false-precision countdown.
 */
import { describe, it, expect } from "vitest";
import { etaPhrase } from "./eta";

describe("etaPhrase", () => {
  it("hedges to 'shortly' when there is no estimate", () => {
    expect(etaPhrase(undefined)).toBe("shortly");
    expect(etaPhrase(null)).toBe("shortly");
    expect(etaPhrase(0)).toBe("shortly");
  });

  it("rounds sub-minute estimates to tens of seconds", () => {
    expect(etaPhrase(30)).toBe("about 30 seconds");
    expect(etaPhrase(5)).toBe("about 10 seconds");
  });

  it("uses minutes at and above a minute, singular at one", () => {
    expect(etaPhrase(60)).toBe("about 1 minute");
    expect(etaPhrase(95)).toBe("about 2 minutes");
    expect(etaPhrase(120)).toBe("about 2 minutes");
  });
});
