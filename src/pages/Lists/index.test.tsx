/**
 * P3-2 — the /lists gate. unified_ia is live workspace-wide, so /lists always
 * renders the unified Shortlists surface (named + curated lists merged
 * behind one "qualified is a filter" view).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListsRoute from "./index";

vi.mock("../../components/lists/ShortlistsView", () => ({
  default: () => <div>unified shortlists surface</div>,
}));

function renderRoute() {
  return render(
    <MemoryRouter>
      <ListsRoute />
    </MemoryRouter>,
  );
}

describe("Lists route gate", () => {
  it("renders the unified shortlists surface", async () => {
    renderRoute();
    expect(await screen.findByText("unified shortlists surface")).toBeInTheDocument();
  });
});
