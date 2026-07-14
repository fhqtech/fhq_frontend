/**
 * Task 2 — unified_ia collapses the sidebar to five items (Home, Roles,
 * Talent, Shortlists, Settings). With the flag off, the legacy per-flag
 * mutation chain (role_home / one_builder / talent) still applies and the
 * Interviews collapsible group is still present.
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
import { FlagProvider } from "@/lib/flags/FlagProvider";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@flowdot.ai" }, logout: async () => {} }),
}));

function renderSidebar(overrides: Record<string, boolean>) {
  return render(
    <MemoryRouter>
      <FlagProvider overrides={overrides}>
        <Sidebar />
      </FlagProvider>
    </MemoryRouter>,
  );
}

describe("Sidebar unified_ia nav", () => {
  it("renders exactly the 5 unified items when unified_ia is on", () => {
    renderSidebar({ unified_ia: true });
    const nav = screen.getByRole("navigation");
    for (const label of ["Home", "Roles", "Talent", "Shortlists", "Settings"]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).queryByText("Interviews")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Dashboard")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Practicals")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Skill matcher")).not.toBeInTheDocument();
  });

  it("keeps the legacy nav when unified_ia is off", () => {
    renderSidebar({ unified_ia: false });
    expect(within(screen.getByRole("navigation")).getByText("Interviews")).toBeInTheDocument();
  });
});
