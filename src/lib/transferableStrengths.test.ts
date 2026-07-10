/**
 * P4-5 — transferable-strength normaliser (pure).
 *
 * The synthesiser-sourced top-level `transferable_skills[]` reaches the frontend
 * typed (`InterviewResultsData.transferable_skills`) but is rendered nowhere
 * today. Before it can drive the recruiter-results band it must be normalised
 * into a sober, WITHIN-finance-only shape:
 *
 *   - blank / half-missing rows are dropped (no empty claims);
 *   - clearly non-finance sources/targets (chess, cricket, music, …) are dropped —
 *     the domain mandate is finance-only and the v1 reviewer prompt is known to
 *     leak hobbies into transferable skills (flagged to backend owners); this is
 *     the client-side safety net, not the authoritative fix;
 *   - the optional `score` is used ONLY to order strongest-first — it is never a
 *     grounded, evidence-backed number, so the band never renders it.
 *
 * Pure module: no React, no I/O.
 */
import { describe, it, expect } from "vitest";
import { toTransferableStrengths, type TransferableStrength } from "./transferableStrengths";
import type { TransferableSkill } from "@/types/interviewResults";

// A realistic within-finance payload — taxation strength transferring to audit,
// the canonical example from the domain rule.
const taxToAudit: TransferableSkill = {
  source: "Taxation",
  skill_demonstrated: "Statutory audit",
  relevance_to_role: "Reconciling tax positions sharpens the audit trail this role reviews.",
  score: 78,
};

const consultingToFpna: TransferableSkill = {
  source: "Management consulting",
  skill_demonstrated: "Financial planning and analysis",
  relevance_to_role: "Structured problem framing carries into the modelling this role owns.",
  score: 64,
};

describe("toTransferableStrengths", () => {
  it("returns an empty array for missing / non-array input", () => {
    expect(toTransferableStrengths(undefined)).toEqual([]);
    expect(toTransferableStrengths(null)).toEqual([]);
    expect(toTransferableStrengths([])).toEqual([]);
    // Defensive against untyped payloads.
    expect(toTransferableStrengths("nope" as unknown as TransferableSkill[])).toEqual([]);
  });

  it("normalises a within-finance row to {source, target, relevance}", () => {
    const out = toTransferableStrengths([taxToAudit]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject<Partial<TransferableStrength>>({
      source: "Taxation",
      target: "Statutory audit",
      relevance: "Reconciling tax positions sharpens the audit trail this role reviews.",
    });
  });

  it("drops rows missing a source or a demonstrated skill", () => {
    const out = toTransferableStrengths([
      { source: "", skill_demonstrated: "Statutory audit", relevance_to_role: "x", score: 50 },
      { source: "Taxation", skill_demonstrated: "   ", relevance_to_role: "x", score: 50 },
      taxToAudit,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("Taxation");
  });

  it("drops clearly non-finance sources (within-finance guard)", () => {
    const chess: TransferableSkill = {
      source: "Chess",
      skill_demonstrated: "Analytical reasoning",
      relevance_to_role: "Thinking several moves ahead.",
      score: 90,
    };
    const out = toTransferableStrengths([chess, taxToAudit]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("Taxation");
  });

  it("drops rows whose target leaks a non-finance domain", () => {
    const out = toTransferableStrengths([
      { source: "Taxation", skill_demonstrated: "Cricket captaincy", relevance_to_role: "x", score: 80 },
    ]);
    expect(out).toEqual([]);
  });

  it("orders strongest-first by score, keeping unscored rows last", () => {
    const unscored: TransferableSkill = {
      source: "Accounting",
      skill_demonstrated: "Cost audit",
      relevance_to_role: "Ledger fluency supports cost verification.",
      score: undefined as unknown as number,
    };
    const out = toTransferableStrengths([consultingToFpna, unscored, taxToAudit]);
    expect(out.map((s) => s.source)).toEqual(["Taxation", "Management consulting", "Accounting"]);
  });

  it("trims surrounding whitespace on source and target", () => {
    const out = toTransferableStrengths([
      { source: "  Taxation  ", skill_demonstrated: "  Statutory audit  ", relevance_to_role: "  ", score: 70 },
    ]);
    expect(out[0].source).toBe("Taxation");
    expect(out[0].target).toBe("Statutory audit");
    // Blank relevance normalises to undefined, not an empty string.
    expect(out[0].relevance).toBeUndefined();
  });

  it("never accuses and never fabricates — it only relays the two finance terms", () => {
    const out = toTransferableStrengths([taxToAudit, consultingToFpna]);
    for (const s of out) {
      expect(s.source.length).toBeGreaterThan(0);
      expect(s.target.length).toBeGreaterThan(0);
    }
  });
});
