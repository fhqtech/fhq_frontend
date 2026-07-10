/**
 * P3-6 — keyboard triage key map. Turns a raw key into a triage intent so the
 * Talent surface (and later the roster) can be cleared hands-on-keyboard: move
 * focus, pick, compare, get help. Pure and surface-agnostic; the component owns
 * what each intent does. Nothing is required — the mouse path stays intact.
 */
import { describe, it, expect } from "vitest";
import { resolveTriageAction } from "./triageKeys";

describe("resolveTriageAction", () => {
  it("maps j/k (and arrows) to focus movement", () => {
    expect(resolveTriageAction("j")).toBe("next");
    expect(resolveTriageAction("ArrowDown")).toBe("next");
    expect(resolveTriageAction("k")).toBe("prev");
    expect(resolveTriageAction("ArrowUp")).toBe("prev");
  });

  it("maps x to toggling the focused row's selection", () => {
    expect(resolveTriageAction("x")).toBe("toggle");
    expect(resolveTriageAction(" ")).toBe("toggle");
  });

  it("maps enter/o to opening the focused row", () => {
    expect(resolveTriageAction("Enter")).toBe("open");
    expect(resolveTriageAction("o")).toBe("open");
  });

  it("maps c to compare and ? to help", () => {
    expect(resolveTriageAction("c")).toBe("compare");
    expect(resolveTriageAction("?")).toBe("help");
  });

  it("maps escape to clear", () => {
    expect(resolveTriageAction("Escape")).toBe("clear");
  });

  it("is case-insensitive for letter keys", () => {
    expect(resolveTriageAction("J")).toBe("next");
    expect(resolveTriageAction("X")).toBe("toggle");
  });

  it("returns null for unmapped keys", () => {
    expect(resolveTriageAction("q")).toBeNull();
    expect(resolveTriageAction("1")).toBeNull();
  });
});
