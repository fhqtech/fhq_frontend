/**
 * P4-2 — the node-tap grounding panel.
 *
 * When a recruiter taps an L4 skill node in the TAG, this leaf shows *why* the
 * score can be trusted: the grounding quote, the source stage, and the grounding
 * rate — but only for a node the evidence verifier actually grounded (v2). For an
 * ungrounded node (the default v1 engine, or a node whose findings the verifier
 * could not match) it must fall back to the calm P4-1 `unverified` state and
 * render NO confident number.
 *
 * Everything is behind the `tag_evidence` flag: off, or outside any provider, the
 * panel renders nothing so node tap behaves exactly as today.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { NodeProvenancePanel } from "./NodeProvenancePanel";
import type { EvidenceNode } from "@/lib/nodeEvidence";

// Priya Sharma's direct-tax skill, verifier-checked under REVIEWER_ENGINE=v2.
const groundedNode: EvidenceNode & { label: string } = {
  label: "Direct tax fundamentals",
  score: 82,
  confidence: 0.9,
  provenance: {
    grounding_rate: 0.9,
    evidence_verified: 3,
    evidence_total: 3,
    method: "evidence_verifier:substring+fuzzy@0.85",
  },
  evidence: ["Walked through a deferred-tax computation under Ind AS 12 with a worked example."],
};

// Default-engine (v1) node: a score and free-text findings, no grounding signal.
const ungroundedNode: EvidenceNode & { label: string } = {
  label: "Indirect tax and GST",
  score: 68,
  evidence: ["Discussed GST input-credit reconciliation for a mid-size manufacturer."],
};

function renderOn(node: EvidenceNode & { label?: string }) {
  return render(
    <FlagProvider overrides={{ tag_evidence: true }}>
      <NodeProvenancePanel node={node} />
    </FlagProvider>,
  );
}

describe("NodeProvenancePanel — flag gating", () => {
  it("renders nothing when the tag_evidence flag is off", () => {
    const { container } = render(
      <FlagProvider overrides={{ tag_evidence: false }}>
        <NodeProvenancePanel node={groundedNode} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing outside any FlagProvider (default-off)", () => {
    const { container } = render(<NodeProvenancePanel node={groundedNode} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no node", () => {
    const { container } = render(
      <FlagProvider overrides={{ tag_evidence: true }}>
        <NodeProvenancePanel node={null} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("NodeProvenancePanel — grounded node", () => {
  it("shows the grounding quote", () => {
    renderOn(groundedNode);
    expect(
      screen.getByText(/deferred-tax computation under Ind AS 12/i),
    ).toBeInTheDocument();
  });

  it("shows the source stage in plain, sentence-case English", () => {
    renderOn(groundedNode);
    expect(screen.getByText(/evidence verifier \(transcript match\)/i)).toBeInTheDocument();
  });

  it("shows the grounding rate as a percentage and the verified count", () => {
    renderOn(groundedNode);
    expect(screen.getByText(/90%/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 3 findings verified/i)).toBeInTheDocument();
  });

  it("does not show the muted unverified marker", () => {
    renderOn(groundedNode);
    expect(screen.queryByText(/^unverified$/i)).not.toBeInTheDocument();
  });
});

describe("NodeProvenancePanel — ungrounded node", () => {
  it("falls back to the unverified marker", () => {
    renderOn(ungroundedNode);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });

  it("renders NO confident number for an ungrounded score", () => {
    const { container } = renderOn(ungroundedNode);
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });

  it("stays calm — it never accuses the candidate", () => {
    const { container } = renderOn(ungroundedNode);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("cheat");
    expect(text).not.toContain("fraud");
    expect(text).not.toContain("fake");
  });

  it("treats a v2 node whose findings were not verified as ungrounded", () => {
    // confidence present but zero items verified → the verifier rejected them.
    const rejected: EvidenceNode & { label: string } = {
      label: "Transfer pricing",
      score: 55,
      confidence: 0.8,
      provenance: { evidence_verified: 0, evidence_total: 2, method: "evidence_verifier:x" },
      evidence: ["A finding the verifier could not match to the transcript."],
    };
    const { container } = renderOn(rejected);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });
});
