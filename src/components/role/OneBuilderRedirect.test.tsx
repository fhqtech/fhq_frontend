/**
 * P2-4 — legacy redirects. When one_builder is on there is ONE role surface:
 * the old /programs/:id and /journeys/new redirect to /roles/:id and /roles/new
 * so deep links and bookmarks land on the new board. When off, the legacy
 * surface renders unchanged (pilot untouched).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { OneBuilderRedirect } from "./OneBuilderRedirect";
import { useFlag } from "@/lib/flags/FlagProvider";

vi.mock("@/lib/flags/FlagProvider", () => ({ useFlag: vi.fn() }));
const mockUseFlag = vi.mocked(useFlag);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/programs/:programId"
          element={
            <OneBuilderRedirect to={(p) => `/roles/${p.programId}`}>
              <div>legacy pipeline</div>
            </OneBuilderRedirect>
          }
        />
        <Route path="/roles/:programId" element={<div>new board</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OneBuilderRedirect", () => {
  beforeEach(() => mockUseFlag.mockReset());

  it("redirects to the new role surface when one_builder is on", () => {
    mockUseFlag.mockReturnValue(true);
    renderAt("/programs/p1");
    expect(screen.getByText("new board")).toBeInTheDocument();
    expect(screen.queryByText("legacy pipeline")).not.toBeInTheDocument();
  });

  it("renders the legacy surface when one_builder is off", () => {
    mockUseFlag.mockReturnValue(false);
    renderAt("/programs/p1");
    expect(screen.getByText("legacy pipeline")).toBeInTheDocument();
  });
});
