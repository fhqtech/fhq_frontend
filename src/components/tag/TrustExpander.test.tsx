/**
 * P4-2 — the "why you can trust this" disclosure.
 *
 * A calm, contestable explainer that sits under a tapped node and says, in plain
 * English, how the score was grounded: the evidence verifier matched each finding
 * back to the interview transcript. For an ungrounded node (the default v1 engine)
 * it degrades gracefully to "evidence not available" and names the backend gap —
 * it never manufactures a grounding number or accuses anyone.
 *
 * Behind the `tag_evidence` flag: off, or outside any provider, it renders
 * nothing so node tap behaves as today.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { TrustExpander } from "./TrustExpander";
import type { EvidenceNode } from "@/lib/nodeEvidence";

const groundedNode: EvidenceNode = {
  score: 82,
  confidence: 0.9,
  provenance: {
    grounding_rate: 0.9,
    evidence_verified: 3,
    evidence_total: 3,
    method: "evidence_verifier:substring+fuzzy@0.85",
  },
  evidence: ["Walked through a deferred-tax computation under Ind AS 12."],
};

const ungroundedNode: EvidenceNode = {
  score: 68,
  evidence: ["Discussed GST input-credit reconciliation for a mid-size manufacturer."],
};

function renderOn(node: EvidenceNode | null) {
  return render(
    <FlagProvider overrides={{ tag_evidence: true }}>
      <TrustExpander node={node} />
    </FlagProvider>,
  );
}

describe("TrustExpander — flag gating", () => {
  it("renders nothing when the tag_evidence flag is off", () => {
    const { container } = render(
      <FlagProvider overrides={{ tag_evidence: false }}>
        <TrustExpander node={groundedNode} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing outside any FlagProvider (default-off)", () => {
    const { container } = render(<TrustExpander node={groundedNode} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TrustExpander — grounded node", () => {
  it("offers the 'why you can trust this' disclosure in sentence case", () => {
    renderOn(groundedNode);
    const summary = screen.getByText(/why you can trust this/i);
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).not.toBe("WHY YOU CAN TRUST THIS");
  });

  it("explains the evidence-verifier rationale — matched to the transcript", () => {
    renderOn(groundedNode);
    expect(screen.getByText(/matched.*transcript/i)).toBeInTheDocument();
  });

  it("surfaces the grounding rate for a grounded node", () => {
    renderOn(groundedNode);
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });
});

describe("TrustExpander — ungrounded node (backend gap)", () => {
  it("degrades to an 'evidence not available' state", () => {
    renderOn(ungroundedNode);
    expect(screen.getByText(/evidence not available/i)).toBeInTheDocument();
  });

  it("names the model-assessment / verifier gap honestly", () => {
    renderOn(ungroundedNode);
    expect(screen.getByText(/model assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/not checked against the.*transcript/i)).toBeInTheDocument();
  });

  it("manufactures no grounding percentage for an ungrounded node", () => {
    const { container } = renderOn(ungroundedNode);
    expect(container.textContent ?? "").not.toMatch(/\d+%/);
  });

  it("stays calm — it never accuses the candidate", () => {
    const { container } = renderOn(ungroundedNode);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("cheat");
    expect(text).not.toContain("fraud");
    expect(text).not.toContain("fake");
  });

  it("renders nothing when there is no node", () => {
    const { container } = render(
      <FlagProvider overrides={{ tag_evidence: true }}>
        <TrustExpander node={null} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
