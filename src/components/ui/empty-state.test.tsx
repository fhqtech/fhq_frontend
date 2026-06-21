/**
 * Render + interaction test for EmptyState — the single reusable "no data yet"
 * primitive. Proves the @testing-library/react harness (render, queries,
 * user-event, jest-dom matchers) is wired correctly and guards the action
 * wiring other surfaces depend on.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No interviews yet" description="Invite a candidate to begin." />);
    expect(screen.getByRole("heading", { name: "No interviews yet" })).toBeInTheDocument();
    expect(screen.getByText("Invite a candidate to begin.")).toBeInTheDocument();
  });

  it("omits the description paragraph when none is given", () => {
    render(<EmptyState icon={FileText} title="Nothing here" />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.queryByText("Invite a candidate to begin.")).not.toBeInTheDocument();
  });

  it("fires the primary action on click", async () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" primaryAction={{ label: "Add role", onClick }} />);
    await userEvent.click(screen.getByRole("button", { name: "Add role" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders an href action as a link", () => {
    render(
      <EmptyState title="Empty" primaryAction={{ label: "Docs", href: "/docs" }} />,
    );
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
  });
});
