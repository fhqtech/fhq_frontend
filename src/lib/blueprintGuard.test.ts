import { describe, it, expect } from "vitest";
import { isBlueprintBroken } from "./blueprintGuard";

describe("isBlueprintBroken", () => {
  it("is broken when status is 'failed'", () => {
    expect(isBlueprintBroken("failed")).toBe(true);
  });

  it("is broken when status is 'error' (mirrors the backend 422 guard)", () => {
    expect(isBlueprintBroken("error")).toBe(true);
  });

  it("is not broken while generating", () => {
    expect(isBlueprintBroken("generating")).toBe(false);
  });

  it("is not broken when completed", () => {
    expect(isBlueprintBroken("completed")).toBe(false);
  });

  it("is not broken for null / undefined (fail-open, matches backend)", () => {
    expect(isBlueprintBroken(null)).toBe(false);
    expect(isBlueprintBroken(undefined)).toBe(false);
  });
});
