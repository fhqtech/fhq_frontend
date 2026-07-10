/**
 * P0-8 — AdminRoute gates admin-only surfaces (test tools today; the /admin
 * console later) on the workspace principal's is_superadmin flag. An
 * unauthenticated visitor goes to the landing surface; an authenticated
 * non-admin recruiter is bounced to their dashboard; only a superadmin sees
 * the children.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminRoute from "./AdminRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
const mockUseAuth = vi.mocked(useAuth);

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={["/admin/test"]}>
      <Routes>
        <Route path="/" element={<div>landing</div>} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route
          path="/admin/test"
          element={
            <AdminRoute>
              <div>admin tool</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminRoute", () => {
  beforeEach(() => mockUseAuth.mockReset());

  it("renders children for a superadmin", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { is_superadmin: true },
    } as ReturnType<typeof useAuth>);
    renderGuarded();
    expect(screen.getByText("admin tool")).toBeInTheDocument();
  });

  it("bounces an authenticated non-admin to the dashboard", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { is_superadmin: false },
    } as ReturnType<typeof useAuth>);
    renderGuarded();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(screen.queryByText("admin tool")).not.toBeInTheDocument();
  });

  it("sends an unauthenticated visitor to the landing surface", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    } as ReturnType<typeof useAuth>);
    renderGuarded();
    expect(screen.getByText("landing")).toBeInTheDocument();
    expect(screen.queryByText("admin tool")).not.toBeInTheDocument();
  });
});
