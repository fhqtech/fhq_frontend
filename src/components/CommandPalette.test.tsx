/**
 * Task 5 — command palette unified create target + dead-link cleanup.
 *
 * `/interviews/screening` was never a real route (it falls through to
 * `/interviews/:id` with id="screening") — it's removed unconditionally.
 * The create-interview commands route unconditionally to the single "Open a
 * role" flow (`/roles/new`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// cmdk (the palette's list primitive) measures item sizes via ResizeObserver,
// which jsdom doesn't implement. Stub it so the dialog can mount in tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;
// jsdom also doesn't implement scrollIntoView, which cmdk calls when an item
// becomes selected.
Element.prototype.scrollIntoView = vi.fn();

const navigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true, logout: vi.fn() }),
}));
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ setCurrentWorkspace: vi.fn() }),
}));

import { CommandPalette, COMMAND_TARGETS } from "./CommandPalette";

function renderPalette() {
  return render(<CommandPalette />);
}

async function openAndSelect(label: string) {
  await userEvent.keyboard("{Meta>}k{/Meta}");
  await userEvent.click(await screen.findByText(label));
}

describe("CommandPalette unified targets", () => {
  // The palette surfaces "Recent" picks from localStorage (MRU), which would
  // otherwise leak a duplicate match for the command's label across tests.
  beforeEach(() => window.localStorage.clear());

  it("has no dead /interviews/screening link", () => {
    expect(Object.values(COMMAND_TARGETS)).not.toContain("/interviews/screening");
  });

  it("routes create actions to /roles/new", () => {
    expect(COMMAND_TARGETS.createRoleUnified).toBe("/roles/new");
  });

  it("navigates the create-screening-interview command to /roles/new", async () => {
    navigate.mockReset();
    renderPalette();
    await openAndSelect("Create screening interview");
    // The palette defers navigation to a requestAnimationFrame callback (dialog
    // close animation), so give it a tick before asserting.
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(COMMAND_TARGETS.createRoleUnified));
  });

  it("navigates the create-fitment-interview command to /roles/new", async () => {
    navigate.mockReset();
    renderPalette();
    await openAndSelect("Create fitment interview");
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(COMMAND_TARGETS.createRoleUnified));
  });
});
