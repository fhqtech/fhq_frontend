/**
 * Task 2 — unified_ia cutover: the sidebar always renders the collapsed nav
 * (Home, Roles, Talent, Shortlists, Settings). The legacy per-flag mutation
 * chain (role_home / one_builder / talent) and the Interviews collapsible
 * group are gone.
 *
 * `AuthContext` itself isn't exported from @/contexts/AuthContext (only
 * `useAuth`/`AuthProvider` are), so `useAuth` is mocked directly rather than
 * rendering a real `AuthContext.Provider` — see ProtectedRoute.test.tsx for
 * the same pattern.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@flowdot.ai" }, logout: async () => {} }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar unified_ia nav", () => {
  it("renders exactly the 5 unified items", () => {
    renderSidebar();
    const nav = screen.getByRole("navigation");
    for (const label of ["Home", "Roles", "Talent", "Shortlists", "Settings"]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).queryByText("Interviews")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Dashboard")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Practicals")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Skill matcher")).not.toBeInTheDocument();
  });
});
