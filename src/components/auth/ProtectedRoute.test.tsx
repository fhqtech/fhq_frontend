/**
 * P0-7 — ProtectedRoute is the single workspace-route auth guard (TourGuard,
 * a misnamed duplicate, was folded into it). It must render children only when
 * authenticated, redirect to the landing surface otherwise, and hold a spinner
 * while auth resolves. CandidateProtectedRoute stays a separate guard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
const mockUseAuth = vi.mocked(useAuth);

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/" element={<div>landing</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => mockUseAuth.mockReset());

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false } as ReturnType<typeof useAuth>);
    renderGuarded();
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("redirects to the landing surface when not authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false } as ReturnType<typeof useAuth>);
    renderGuarded();
    expect(screen.getByText("landing")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("holds a spinner while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true } as ReturnType<typeof useAuth>);
    renderGuarded();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.queryByText("landing")).not.toBeInTheDocument();
  });
});
