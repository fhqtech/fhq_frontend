/**
 * P0-1 — FlagProvider + useFlag. The pilot has no live users yet, so the
 * redesign is the default: inside a provider, a vetted Tier 1 + Tier 2 flag
 * (role_home) reads on via REDESIGN_BASELINE, while a held-back Tier 3 flag
 * (evidence_contract) stays off. Outside any provider the hook is still safe
 * and returns off (baseline lives only inside the provider), so a stray render
 * can never crash or accidentally enable a surface.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider, useFlag } from "./FlagProvider";
import type { FlagKey } from "./registry";

function Probe({ flag }: { flag: FlagKey }) {
  return <span>{useFlag(flag) ? "on" : "off"}</span>;
}

describe("FlagProvider / useFlag", () => {
  it("defaults a baseline flag on (redesign is the default)", () => {
    render(
      <FlagProvider>
        <Probe flag="role_home" />
      </FlagProvider>,
    );
    expect(screen.getByText("on")).toBeInTheDocument();
  });

  it("keeps a held-back Tier 3 flag off by default", () => {
    render(
      <FlagProvider>
        <Probe flag="evidence_contract" />
      </FlagProvider>,
    );
    expect(screen.getByText("off")).toBeInTheDocument();
  });

  it("turns a flag on from the remote value", () => {
    render(
      <FlagProvider remote={{ role_home: true }}>
        <Probe flag="role_home" />
      </FlagProvider>,
    );
    expect(screen.getByText("on")).toBeInTheDocument();
  });

  it("lets an override beat the remote value", () => {
    render(
      <FlagProvider remote={{ role_home: true }} overrides={{ role_home: false }}>
        <Probe flag="role_home" />
      </FlagProvider>,
    );
    expect(screen.getByText("off")).toBeInTheDocument();
  });

  it("is safe outside a provider and returns off", () => {
    render(<Probe flag="role_home" />);
    expect(screen.getByText("off")).toBeInTheDocument();
  });
});
