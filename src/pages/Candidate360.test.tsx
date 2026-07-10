/**
 * P5-2 — candidate-360 page flag gate.
 *
 * SAFETY-CRITICAL for the live pilot: the new /roles/:programId/candidates/:candidateId
 * route must behave EXACTLY as today when `candidate_360` is off. That URL has no
 * route today (RoleContainer already navigates there, so it 404s), so the flag-off
 * path renders NotFound — the pilot sees no change. Only the flag-off gate is tested
 * here; the on-path rendering is covered by the pure compose tests and the
 * Candidate360Content component tests (which need no workspace/network providers).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import Candidate360 from "./Candidate360";

describe("Candidate360 — flag gate", () => {
  it("renders the legacy not-found path when candidate_360 is off (pilot untouched)", () => {
    render(
      <MemoryRouter>
        <FlagProvider overrides={{ candidate_360: false }}>
          <Candidate360 />
        </FlagProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    // The candidate-360 surface must not render at all.
    expect(screen.queryByText(/next best action/i)).not.toBeInTheDocument();
  });

  it("renders nothing candidate-360-ish outside any FlagProvider (default-off)", () => {
    render(
      <MemoryRouter>
        <Candidate360 />
      </MemoryRouter>,
    );
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
