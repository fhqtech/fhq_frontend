/**
 * P1-1 — AsyncProgress wraps every long operation (blueprint, practical,
 * reviewer) so a wait is never a dead end: a progress state with a hedged ETA,
 * and on failure an ErrorBanner with retry. The transcript/work is never lost;
 * this component only renders state the caller polls.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsyncProgress } from "./async-progress";

describe("AsyncProgress", () => {
  it("shows the label and a hedged ETA while running", () => {
    render(<AsyncProgress label="Building the graph" etaSeconds={120} />);
    expect(screen.getByText("Building the graph")).toBeInTheDocument();
    expect(screen.getByText(/usually ready in about 2 minutes/i)).toBeInTheDocument();
  });

  it("falls back to 'shortly' with no estimate", () => {
    render(<AsyncProgress label="Generating blueprint" />);
    expect(screen.getByText(/usually ready shortly/i)).toBeInTheDocument();
  });

  it("exposes the running state to assistive tech", () => {
    render(<AsyncProgress label="Scoring" etaSeconds={30} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders an ErrorBanner with retry on failure", async () => {
    const onRetry = vi.fn();
    render(<AsyncProgress label="Generating blueprint" error="Model timed out" onRetry={onRetry} />);
    expect(screen.getByText("Model timed out")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
