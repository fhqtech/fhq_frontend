/**
 * P3-4 — the floating bulk action bar. Appears once one or more rows are picked;
 * "compare" is live only for a legible 2–4, and "clear" always resets. The single
 * action surface a recruiter drives after multi-selecting on Talent or a roster.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkActionBar } from "./BulkActionBar";

describe("BulkActionBar", () => {
  it("renders nothing when nothing is selected", () => {
    const { container } = render(
      <BulkActionBar count={0} canCompare={false} onCompare={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count and enables clear when rows are picked", async () => {
    const onClear = vi.fn();
    render(<BulkActionBar count={3} canCompare={true} onCompare={vi.fn()} onClear={onClear} />);
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("disables compare outside the 2–4 range", () => {
    render(<BulkActionBar count={1} canCompare={false} onCompare={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByRole("button", { name: /compare/i })).toBeDisabled();
  });

  it("fires onCompare when compare is available", async () => {
    const onCompare = vi.fn();
    render(<BulkActionBar count={2} canCompare={true} onCompare={onCompare} onClear={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /compare/i }));
    expect(onCompare).toHaveBeenCalled();
  });
});
