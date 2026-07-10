/**
 * P3-2 — ShortlistsList. Presentational merge surface: given already-built
 * shortlist rows, render the kind filter chips (all / named / curated) and a
 * divided row list. No context, no network — the container feeds it rows.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShortlistsList } from "./ShortlistsList";
import type { ShortlistRow } from "@/lib/buildShortlists";

const rows: ShortlistRow[] = [
  { id: "q1", name: "Management consulting bench", kind: "curated", totalCandidates: 5, updatedAt: "2026-03-01T00:00:00Z" },
  { id: "l1", name: "Bengaluru audit associates", kind: "named", totalCandidates: 12, updatedAt: "2026-02-01T00:00:00Z" },
  { id: "l2", name: "Q3 tax reviewers", kind: "named", totalCandidates: 8, updatedAt: "2026-01-01T00:00:00Z" },
];

function renderList(props: { rows: ShortlistRow[] }) {
  return render(
    <MemoryRouter>
      <ShortlistsList {...props} />
    </MemoryRouter>,
  );
}

describe("ShortlistsList", () => {
  it("renders both named and curated rows under the default 'all' filter", () => {
    renderList({ rows });
    expect(screen.getByText("Management consulting bench")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru audit associates")).toBeInTheDocument();
    expect(screen.getByText("Q3 tax reviewers")).toBeInTheDocument();
  });

  it("hides named rows when the curated filter is selected", () => {
    renderList({ rows });
    fireEvent.click(screen.getByRole("button", { name: "Curated" }));
    expect(screen.getByText("Management consulting bench")).toBeInTheDocument();
    expect(screen.queryByText("Bengaluru audit associates")).not.toBeInTheDocument();
    expect(screen.queryByText("Q3 tax reviewers")).not.toBeInTheDocument();
  });

  it("hides curated rows when the named filter is selected", () => {
    renderList({ rows });
    fireEvent.click(screen.getByRole("button", { name: "Named" }));
    expect(screen.queryByText("Management consulting bench")).not.toBeInTheDocument();
    expect(screen.getByText("Bengaluru audit associates")).toBeInTheDocument();
  });

  it("shows the empty state when there are no shortlists at all", () => {
    renderList({ rows: [] });
    expect(screen.getByText("No shortlists yet")).toBeInTheDocument();
  });
});
