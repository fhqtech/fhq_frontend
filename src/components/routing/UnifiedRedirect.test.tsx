import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { UnifiedRedirect } from "./UnifiedRedirect";
import { FlagProvider } from "@/lib/flags/FlagProvider";

function renderAt(path: string, on: boolean) {
  return render(
    <FlagProvider overrides={{ unified_ia: on }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/legacy" element={<UnifiedRedirect to="/target"><span>legacy</span></UnifiedRedirect>} />
          <Route path="/target" element={<span>target</span>} />
        </Routes>
      </MemoryRouter>
    </FlagProvider>,
  );
}

describe("UnifiedRedirect", () => {
  it("redirects to target when unified_ia is on", () => {
    renderAt("/legacy", true);
    expect(screen.getByText("target")).toBeInTheDocument();
  });
  it("renders legacy children when unified_ia is off", () => {
    renderAt("/legacy", false);
    expect(screen.getByText("legacy")).toBeInTheDocument();
  });
});
