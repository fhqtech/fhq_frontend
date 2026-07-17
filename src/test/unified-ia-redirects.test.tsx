/**
 * Task 4 — the unified_ia redirect contract, now unconditional. Every legacy
 * path listed here is wired in App.tsx as a bare `<Navigate to={target}
 * replace />` (unified_ia cutover follow-up: the flag-off legacy targets are
 * gone, so the redirect no longer branches on the flag).
 *
 * Deep-link result routes (e.g. the interview results TAG view) must never
 * appear in this map — URL stability is a hard constraint (see App.tsx and
 * the frontend CLAUDE.md "Backend symbols are stable" section).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";

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

// Deep-link routes that must stay live regardless of the redirect map — never
// add these to UNIFIED_REDIRECTS.
const EXCLUDED_DEEP_LINKS = [
  "/interview/:interviewId/results/:sessionId",
  "/interviews/:id",
  "/interview-blueprint/:interviewId",
];

function renderPair(legacy: string, target: string) {
  return render(
    <MemoryRouter initialEntries={[legacy]}>
      <Routes>
        <Route path={legacy} element={<Navigate to={target} replace />} />
        <Route path={target} element={<span>target</span>} />
      </Routes>
    </MemoryRouter>,
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
    it(`redirects ${legacy} to ${target} unconditionally`, () => {
      renderPair(legacy, target);
      expect(screen.getByText("target")).toBeInTheDocument();
    });
  });
});
