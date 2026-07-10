/**
 * P4-1 — the TAG evidence contract classifier.
 *
 * The product pitch is "evidence on every score": a TAG node's score may only
 * render as a confident number when it is *grounded* — i.e. the reviewer emitted
 * a machine grounding signal (confidence / provenance) AND at least one piece of
 * evidence to show. Everything else is `unverified`.
 *
 * The decisive real-world fact this encodes: the default reviewer engine (v1)
 * emits neither confidence nor provenance (only free-text findings), so a v1
 * node is `unverified` even when it carries evidence text. Only the v2 engine's
 * verifier-checked grounding earns `verified`. These tests lock that contract.
 */
import { describe, it, expect } from "vitest";
import {
  classifyNodeEvidence,
  isGrounded,
  isUnverifiedScore,
  type EvidenceNode,
} from "./nodeEvidence";

// A fully grounded v2 node — Priya Sharma's direct-tax skill, verifier-checked.
const groundedV2: EvidenceNode = {
  score: 82,
  confidence: 0.9,
  provenance: {
    grounding_rate: 0.9,
    evidence_verified: 3,
    evidence_total: 3,
    method: "evidence_verifier:substring+fuzzy@0.85",
  },
  evidence: ["Walked through deferred-tax computation under Ind AS 12 with a worked example."],
};

// A default-engine (v1) node — has a score and free-text findings, but NO
// machine grounding signal. This is the honest state of most live nodes today.
const v1Node: EvidenceNode = {
  score: 68,
  evidence: ["Discussed GST input-credit reconciliation for a mid-size manufacturer."],
};

describe("isGrounded", () => {
  it("treats a v2 node with confidence + provenance + evidence as grounded", () => {
    expect(isGrounded(groundedV2)).toBe(true);
  });

  it("treats confidence + evidence (no provenance) as grounded", () => {
    expect(isGrounded({ score: 74, confidence: 0.75, evidence: ["Reconciled TDS across two quarters."] })).toBe(true);
  });

  it("treats provenance-with-verified-evidence + evidence as grounded", () => {
    expect(
      isGrounded({
        score: 71,
        provenance: { evidence_verified: 2, evidence_total: 3 },
        evidence: ["Explained transfer-pricing method selection."],
      }),
    ).toBe(true);
  });

  it("treats a v1 node (no confidence, no provenance) as ungrounded even WITH evidence text", () => {
    expect(isGrounded(v1Node)).toBe(false);
  });

  it("treats a grounding signal with zero verified evidence as ungrounded", () => {
    expect(
      isGrounded({
        score: 55,
        confidence: 0.8,
        provenance: { evidence_verified: 0, evidence_total: 2 },
        evidence: [],
      }),
    ).toBe(false);
  });

  it("treats explicit evidence_verified:0 as ungrounded even if evidence text is present", () => {
    expect(
      isGrounded({
        score: 60,
        confidence: 0.9,
        provenance: { evidence_verified: 0, evidence_total: 1 },
        evidence: ["Some finding the verifier could not match to the transcript."],
      }),
    ).toBe(false);
  });

  it("treats confidence of 0 (only signal) as ungrounded", () => {
    expect(isGrounded({ score: 40, confidence: 0, evidence: ["A finding."] })).toBe(false);
  });

  it("treats a grounding signal with only blank evidence strings as ungrounded", () => {
    expect(isGrounded({ score: 50, confidence: 0.7, evidence: ["", "   "] })).toBe(false);
  });

  it("treats a grounding signal with no evidence array as ungrounded", () => {
    expect(isGrounded({ score: 62, confidence: 0.9, evidence: null })).toBe(false);
  });

  it("treats a bare score with nothing else as ungrounded", () => {
    expect(isGrounded({ score: 45 })).toBe(false);
  });

  it("treats an empty / undefined node as ungrounded", () => {
    expect(isGrounded({})).toBe(false);
    expect(isGrounded(null)).toBe(false);
    expect(isGrounded(undefined)).toBe(false);
  });
});

describe("classifyNodeEvidence", () => {
  it("returns 'verified' for a grounded node", () => {
    expect(classifyNodeEvidence(groundedV2)).toBe("verified");
  });

  it("returns 'unverified' for a v1 / degraded node", () => {
    expect(classifyNodeEvidence(v1Node)).toBe("unverified");
  });

  it("returns 'unverified' when there is zero evidence", () => {
    expect(classifyNodeEvidence({ score: 30, confidence: 0.9, evidence: [] })).toBe("unverified");
  });

  it("classifies purely on grounding, independent of whether a score exists", () => {
    // No score, but grounded evidence present → still 'verified'.
    expect(
      classifyNodeEvidence({ confidence: 0.9, provenance: { evidence_verified: 1 }, evidence: ["A verified finding."] }),
    ).toBe("verified");
  });

  it("accepts a structural TagNode-shaped object", () => {
    const tagNodeShaped = {
      id: "skill_direct_tax",
      type: "core" as const,
      label: "Direct tax fundamentals",
      is_core: true,
      score: 82,
      confidence: 0.9,
      provenance: { evidence_verified: 3, evidence_total: 3 },
      evidence: ["Worked example under Ind AS 12."],
    };
    expect(classifyNodeEvidence(tagNodeShaped)).toBe("verified");
  });
});

describe("isUnverifiedScore", () => {
  it("is true when a numeric score exists but is ungrounded (the intercept case)", () => {
    expect(isUnverifiedScore(v1Node)).toBe(true);
    expect(isUnverifiedScore({ score: 0, evidence: [] })).toBe(true);
  });

  it("is false when a numeric score is grounded", () => {
    expect(isUnverifiedScore(groundedV2)).toBe(false);
  });

  it("is false when there is no numeric score to protect", () => {
    // Ungrounded, but no score → nothing to render as a confident number.
    expect(isUnverifiedScore({ evidence: [] })).toBe(false);
    expect(isUnverifiedScore({ confidence: 0.9, evidence: ["x"] })).toBe(false);
    expect(isUnverifiedScore({})).toBe(false);
    expect(isUnverifiedScore(null)).toBe(false);
  });
});
