/**
 * P0-1 — feature-flag resolution. The acceptance guarantee from the redesign
 * plan: every flag is default-off so a workspace that hasn't opted in renders
 * the legacy path, and an explicit override (admin/dev) beats the remote
 * (/flags) value beats the compile-time default.
 */
import { describe, it, expect } from "vitest";
import { resolveFlag } from "./resolve";
import { FLAG_REGISTRY } from "./registry";

describe("resolveFlag", () => {
  it("returns the registry default (off) when no source provides a value", () => {
    expect(resolveFlag("soft_delete")).toBe(false);
  });

  it("uses the remote value when present and no override exists", () => {
    expect(resolveFlag("soft_delete", { remote: { soft_delete: true } })).toBe(true);
  });

  it("lets an explicit override beat the remote value", () => {
    expect(
      resolveFlag("soft_delete", {
        overrides: { soft_delete: false },
        remote: { soft_delete: true },
      }),
    ).toBe(false);
  });

  it("ignores a remote value of the wrong type and falls back to the default", () => {
    expect(
      // a malformed /flags payload must never flip a flag on
      resolveFlag("role_home", { remote: { role_home: "yes" as unknown as boolean } }),
    ).toBe(false);
  });

  it("defaults every registered flag to off (legacy path)", () => {
    for (const key of Object.keys(FLAG_REGISTRY) as (keyof typeof FLAG_REGISTRY)[]) {
      expect(resolveFlag(key)).toBe(false);
    }
  });
});
