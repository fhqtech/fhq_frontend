/**
 * P3-2 — the /lists gate. When `talent` is off the legacy ListsPage renders
 * unchanged (the running pilot is untouched); when it is on, the unified
 * Shortlists surface renders instead. This is the hard "flag-off unchanged"
 * guarantee for the Lists+Qualified merge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListsRoute from "./index";
import { useFlag } from "@/lib/flags/FlagProvider";

vi.mock("@/lib/flags/FlagProvider", () => ({ useFlag: vi.fn() }));
vi.mock("./ListsPage", () => ({ default: () => <div>legacy lists page</div> }));
vi.mock("../../components/lists/ShortlistsView", () => ({
  default: () => <div>unified shortlists surface</div>,
}));

const mockUseFlag = vi.mocked(useFlag);

function renderRoute() {
  return render(
    <MemoryRouter>
      <ListsRoute />
    </MemoryRouter>,
  );
}

describe("Lists route gate", () => {
  beforeEach(() => mockUseFlag.mockReset());

  it("renders the legacy lists page when talent is off", () => {
    mockUseFlag.mockReturnValue(false);
    renderRoute();
    expect(screen.getByText("legacy lists page")).toBeInTheDocument();
    expect(screen.queryByText("unified shortlists surface")).not.toBeInTheDocument();
  });

  it("renders the unified shortlists surface when talent is on", async () => {
    mockUseFlag.mockReturnValue(true);
    renderRoute();
    expect(await screen.findByText("unified shortlists surface")).toBeInTheDocument();
    expect(screen.queryByText("legacy lists page")).not.toBeInTheDocument();
  });
});
