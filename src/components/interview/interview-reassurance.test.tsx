/**
 * P1-4 — candidate reassurance. Before a candidate starts, the screen should
 * answer "what is this, what's evaluated, and is it fair" rather than just
 * showing a Start button. Reduces the stated anxiety of CA / MBA-finance
 * candidates facing an AI interview.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InterviewReassurance } from "./interview-reassurance";

describe("InterviewReassurance", () => {
  it("states the format and duration", () => {
    render(<InterviewReassurance roleTitle="Senior tax associate" durationMinutes={10} />);
    const text = screen.getByRole("region", { name: /what to expect/i }).textContent ?? "";
    expect(text).toMatch(/10 minutes/i);
  });

  it("explains what is evaluated, grounded in evidence not vibes", () => {
    render(<InterviewReassurance roleTitle="Senior tax associate" durationMinutes={10} />);
    const text = screen.getByRole("region", { name: /what to expect/i }).textContent ?? "";
    expect(text).toMatch(/evidence/i);
  });

  it("reassures the candidate the assessment is fair", () => {
    render(<InterviewReassurance roleTitle="Senior tax associate" durationMinutes={10} />);
    const text = screen.getByRole("region", { name: /what to expect/i }).textContent ?? "";
    expect(text).toMatch(/fair/i);
  });
});
