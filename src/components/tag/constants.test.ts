/**
 * Unit tests for TAG constants — score→status banding and the normalized→pixel
 * coordinate scaler. These encode the visual contract; a silent change here
 * miscolours or mispositions the marquee graph.
 */
import { describe, it, expect } from "vitest";
import { STATUS_OF_SCORE, scalePos, TAG_CANVAS } from "./constants";

describe("STATUS_OF_SCORE", () => {
  it("treats null/undefined as a gap", () => {
    expect(STATUS_OF_SCORE(null)).toBe("gap");
    expect(STATUS_OF_SCORE(undefined)).toBe("gap");
  });

  it("uses inclusive 80 / 50 band edges", () => {
    expect(STATUS_OF_SCORE(80)).toBe("strong");
    expect(STATUS_OF_SCORE(79.9)).toBe("developing");
    expect(STATUS_OF_SCORE(50)).toBe("developing");
    expect(STATUS_OF_SCORE(49.9)).toBe("gap");
    expect(STATUS_OF_SCORE(0)).toBe("gap");
  });
});

describe("scalePos", () => {
  it("scales normalized [0,1] coords across the reference canvas", () => {
    expect(scalePos({ x: 0.5, y: 0.5 })).toEqual({
      x: TAG_CANVAS.width * 0.5,
      y: TAG_CANVAS.height * 0.5,
    });
  });

  it("passes legacy pixel coords (>1) through unchanged", () => {
    expect(scalePos({ x: 600, y: 380 })).toEqual({ x: 600, y: 380 });
  });
});
