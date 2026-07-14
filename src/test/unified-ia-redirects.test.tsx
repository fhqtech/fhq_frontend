/**
 * Task 4 — the unified_ia redirect contract, verified behaviorally. Each
 * legacy path listed here is wrapped in App.tsx with <UnifiedRedirect
 * to={target}>. This test doesn't just assert the map's shape — it renders
 * UnifiedRedirect for every [legacy, target] pair inside a real MemoryRouter
 * and asserts the flag actually drives navigation both ways: redirect when
 * unified_ia is on, legacy content when off (the kill-switch).
 *
 * Deep-link result routes (e.g. the interview results TAG view) must never
 * appear in this map — URL stability is a hard constraint (see App.tsx and
 * the frontend CLAUDE.md "Backend symbols are stable" section).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { UnifiedRedirect } from "@/components/routing/UnifiedRedirect";
import { FlagProvider } from "@/lib/flags/FlagProvider";

// The retired-path -> unified-target contract. Keep in sync with App.tsx.
export const UNIFIED_REDIRECTS: Record<string, string> = {
  "/dashboard": "/home",
  "/interviews/create": "/roles/new",
  "/interviews/manage": "/roles",
  "/interviews/fitment": "/roles",
  "/interviews/skill-analysis": "/roles",
  "/practicals": "/roles",
  "/skill-matcher": "/talent",
  "/programs": "/roles",
  "/journeys/new": "/roles/new",
};

// Deep-link routes that must stay live regardless of unified_ia — never add
// these to UNIFIED_REDIRECTS.
const EXCLUDED_DEEP_LINKS = [
  "/interview/:interviewId/results/:sessionId",
  "/interviews/:id",
  "/interview-blueprint/:interviewId",
];

function renderPair(legacy: string, target: string, on: boolean) {
  return render(
    <FlagProvider overrides={{ unified_ia: on }}>
      <MemoryRouter initialEntries={[legacy]}>
        <Routes>
          <Route
            path={legacy}
            element={
              <UnifiedRedirect to={target}>
                <span>legacy</span>
              </UnifiedRedirect>
            }
          />
          <Route path={target} element={<span>target</span>} />
        </Routes>
      </MemoryRouter>
    </FlagProvider>,
  );
}

describe("unified_ia redirect contract", () => {
  it("excludes deep-link result/detail routes from the redirect map", () => {
    const legacyPaths = Object.keys(UNIFIED_REDIRECTS);
    for (const excluded of EXCLUDED_DEEP_LINKS) {
      expect(legacyPaths).not.toContain(excluded);
    }
  });

  it("covers every retired surface", () => {
    expect(Object.keys(UNIFIED_REDIRECTS).length).toBeGreaterThanOrEqual(9);
  });

  describe.each(Object.entries(UNIFIED_REDIRECTS))("%s -> %s", (legacy, target) => {
    it(`redirects ${legacy} to ${target} when unified_ia is on`, () => {
      renderPair(legacy, target, true);
      expect(screen.getByText("target")).toBeInTheDocument();
      expect(screen.queryByText("legacy")).not.toBeInTheDocument();
    });

    it(`renders the legacy element for ${legacy} when unified_ia is off`, () => {
      renderPair(legacy, target, false);
      expect(screen.getByText("legacy")).toBeInTheDocument();
      expect(screen.queryByText("target")).not.toBeInTheDocument();
    });
  });
});
