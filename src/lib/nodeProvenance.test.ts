/**
 * P4-2 — provenance formatters for the node-tap grounding panel.
 *
 * These pure helpers turn the backend `GraphNode.provenance` / `confidence`
 * fields (v2 evidence-verifier output) into the three things the node-tap panel
 * must show for a grounded skill: the grounding quote, the source stage, and the
 * grounding rate. Under the default v1 engine those fields are ABSENT, so every
 * helper degrades to null rather than inventing a number — the panel then falls
 * back to the P4-1 `unverified` state.
 */
import { describe, it, expect } from "vitest";
import {
  groundingQuote,
  groundingRatePercent,
  sourceStageLabel,
  verifiedCountLabel,
} from "./nodeProvenance";
import type { EvidenceNode } from "./nodeEvidence";

// Priya Sharma's direct-tax skill, verifier-checked under REVIEWER_ENGINE=v2.
const groundedV2: EvidenceNode = {
  score: 82,
  confidence: 0.9,
  provenance: {
    grounding_rate: 0.9,
    evidence_verified: 3,
    evidence_total: 3,
    method: "evidence_verifier:substring+fuzzy@0.85",
  },
  evidence: [
    "Walked through a deferred-tax computation under Ind AS 12 with a worked example.",
    "Reconciled advance tax against the final liability across two quarters.",
  ],
};

// Default-engine (v1) node: a score and free-text findings, but no machine
// grounding signal.
const v1Node: EvidenceNode = {
  score: 68,
  evidence: ["Discussed GST input-credit reconciliation for a mid-size manufacturer."],
};

describe("groundingQuote", () => {
  it("returns the first non-blank evidence quote, trimmed", () => {
    expect(groundingQuote({ evidence: ["  A worked example under Ind AS 12.  "] })).toBe(
      "A worked example under Ind AS 12.",
    );
  });

  it("skips leading blank entries", () => {
    expect(groundingQuote({ evidence: ["", "   ", "Reconciled TDS across two quarters."] })).toBe(
      "Reconciled TDS across two quarters.",
    );
  });

  it("returns null when there is no evidence array", () => {
    expect(groundingQuote({ evidence: null })).toBeNull();
    expect(groundingQuote({})).toBeNull();
    expect(groundingQuote(null)).toBeNull();
  });

  it("returns null when every entry is blank", () => {
    expect(groundingQuote({ evidence: ["", "  "] })).toBeNull();
  });
});

describe("groundingRatePercent", () => {
  it("prefers provenance.grounding_rate and returns a whole-number percent", () => {
    expect(groundingRatePercent(groundedV2)).toBe(90);
  });

  it("falls back to confidence when provenance has no rate", () => {
    expect(groundingRatePercent({ confidence: 0.75 })).toBe(75);
  });

  it("rounds to the nearest whole percent", () => {
    expect(groundingRatePercent({ confidence: 0.666 })).toBe(67);
  });

  it("keeps an explicit zero as 0, not a fallthrough", () => {
    expect(groundingRatePercent({ provenance: { grounding_rate: 0 }, confidence: 0.9 })).toBe(0);
  });

  it("clamps out-of-range values into [0,100]", () => {
    expect(groundingRatePercent({ confidence: 1.4 })).toBe(100);
    expect(groundingRatePercent({ confidence: -0.2 })).toBe(0);
  });

  it("returns null when there is no machine grounding signal (the v1 default)", () => {
    expect(groundingRatePercent(v1Node)).toBeNull();
    expect(groundingRatePercent({})).toBeNull();
    expect(groundingRatePercent(null)).toBeNull();
  });
});

describe("verifiedCountLabel", () => {
  it("summarises the verified-of-total counts", () => {
    expect(verifiedCountLabel(groundedV2)).toBe("3 of 3 findings verified");
  });

  it("uses the singular noun for a single finding", () => {
    expect(
      verifiedCountLabel({ provenance: { evidence_verified: 1, evidence_total: 1 } }),
    ).toBe("1 of 1 finding verified");
  });

  it("returns null when the counts are absent", () => {
    expect(verifiedCountLabel({ provenance: { method: "evidence_verifier:x" } })).toBeNull();
    expect(verifiedCountLabel(v1Node)).toBeNull();
    expect(verifiedCountLabel(null)).toBeNull();
  });
});

describe("sourceStageLabel", () => {
  it("maps the evidence_verifier method to a plain-English, sentence-case stage", () => {
    const label = sourceStageLabel(groundedV2);
    expect(label).toBe("Evidence verifier (transcript match)");
    // Sentence case, not Title Case / ALL CAPS.
    expect(label).not.toMatch(/[A-Z]{2,}/);
  });

  it("surfaces an unrecognised method verbatim rather than inventing a label", () => {
    expect(sourceStageLabel({ provenance: { method: "manual_review" } })).toBe("manual_review");
  });

  it("returns null when there is no method (the v1 default)", () => {
    expect(sourceStageLabel(v1Node)).toBeNull();
    expect(sourceStageLabel({ provenance: {} })).toBeNull();
    expect(sourceStageLabel(null)).toBeNull();
  });
});
