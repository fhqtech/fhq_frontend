/**
 * P3-3 — the Talent-surface entry into the cross-interview skill matcher.
 * Default-off: the link only appears when the `talent` flag is on. When the flag
 * is off (the pilot default) or there is no FlagProvider at all, the component
 * renders nothing, so the legacy Talent surface is untouched.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { SkillMatchEntry } from "./SkillMatchEntry";

describe("SkillMatchEntry", () => {
  it("links to the skill matcher when the talent flag is on", () => {
    render(
      <MemoryRouter>
        <FlagProvider overrides={{ talent: true }}>
          <SkillMatchEntry />
        </FlagProvider>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /match candidates to a role/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/talent");
  });

  it("renders nothing when the talent flag is off", () => {
    const { container } = render(
      <MemoryRouter>
        <FlagProvider overrides={{ talent: false }}>
          <SkillMatchEntry />
        </FlagProvider>
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("link", { name: /match candidates to a role/i }),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing outside any FlagProvider (default-off)", () => {
    const { container } = render(
      <MemoryRouter>
        <SkillMatchEntry />
      </MemoryRouter>,
    );
    expect(
      screen.queryByRole("link", { name: /match candidates to a role/i }),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
