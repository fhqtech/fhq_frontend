/**
 * P4-4 — integrity-note pure helpers.
 *
 * The integrity surface is calm, evidence-backed and contestable. It is
 * "needs a closer look", NEVER a verdict — so it must never emit accusatory
 * language, and it must always be able to cite the specific transcript turn.
 *
 * DATA-SHAPE GAP (documented, not invented): no reviewer engine persists a
 * per-turn integrity flag today (see IntegrityFlag jsdoc). These helpers define
 * the typed shape the component renders against and lock the copy guardrail.
 */
import { describe, it, expect } from "vitest";
import { citeTurn, isAccusatory, ACCUSATORY_TERMS, type IntegrityFlag } from "./integrity";

// A realistic, calm fixture — Priya Sharma, indirect-tax answer.
const flag: IntegrityFlag = {
  turn: 7,
  quote: "We caught a mismatch in the GST reconciliation the night before filing.",
  skillName: "Indirect tax",
  note: "The same last-minute-rescue arc appears in three separate answers.",
};

describe("citeTurn", () => {
  it("renders a sentence-case reference to the specific turn", () => {
    expect(citeTurn(flag)).toBe("Turn 7");
  });

  it("cites whatever 1-indexed turn is supplied", () => {
    expect(citeTurn({ turn: 1 })).toBe("Turn 1");
    expect(citeTurn({ turn: 23 })).toBe("Turn 23");
  });
});

describe("isAccusatory / ACCUSATORY_TERMS", () => {
  it("flags every banned accusatory term", () => {
    for (const term of ACCUSATORY_TERMS) {
      expect(isAccusatory(`some copy with ${term} in it`)).toBe(true);
    }
  });

  it("flags the specific word the integrity copy must never use", () => {
    expect(isAccusatory("The candidate cheated on this answer.")).toBe(true);
    expect(isAccusatory("possible fraud")).toBe(true);
    expect(isAccusatory("this looks fabricated")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAccusatory("CHEATED")).toBe(true);
  });

  it("passes calm, contestable copy", () => {
    expect(isAccusatory("Needs a closer look")).toBe(false);
    expect(isAccusatory("This is a prompt to review, not a judgement.")).toBe(false);
    expect(isAccusatory("Mark as fair")).toBe(false);
    expect(isAccusatory(flag.note!)).toBe(false);
  });

  it("never lists 'cheat' as an allowed word", () => {
    expect(ACCUSATORY_TERMS).toContain("cheat");
  });
});
