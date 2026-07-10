/**
 * P4-1 — UnverifiedMark render contract.
 *
 * The evidence-contract token: when a TAG node's score is ungrounded, the TAG
 * renders this muted marker in place of the confident number. It must never
 * render a number, must read as calm (not an accusation), and must be exposed
 * to assistive tech.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnverifiedMark } from "./UnverifiedMark";

describe("UnverifiedMark", () => {
  it("renders the muted 'Unverified' label in sentence case", () => {
    render(<UnverifiedMark />);
    const label = screen.getByText("Unverified");
    expect(label).toBeInTheDocument();
    // Sentence case, not ALL CAPS.
    expect(label.textContent).not.toBe("UNVERIFIED");
  });

  it("renders a default grounding reason", () => {
    render(<UnverifiedMark />);
    expect(screen.getByText(/no grounding evidence/i)).toBeInTheDocument();
  });

  it("renders a caller-supplied reason", () => {
    render(<UnverifiedMark reason="No evidence was verified for this score." />);
    expect(screen.getByText("No evidence was verified for this score.")).toBeInTheDocument();
    expect(screen.queryByText(/no grounding evidence/i)).not.toBeInTheDocument();
  });

  it("exposes an accessible status to assistive tech", () => {
    render(<UnverifiedMark />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAccessibleName(/unverified/i);
  });

  it("never renders a numeric score", () => {
    const { container } = render(<UnverifiedMark />);
    // No digits anywhere in the rendered token.
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });

  it("renders a decorative icon that is hidden from assistive tech", () => {
    const { container } = render(<UnverifiedMark />);
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("is calm — it never accuses the candidate", () => {
    const { container } = render(<UnverifiedMark reason="No grounding evidence for this score." />);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("cheat");
    expect(text).not.toContain("fake");
    expect(text).not.toContain("fraud");
  });
});
