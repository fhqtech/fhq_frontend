/**
 * P0-1 — FlagProvider + useFlag. A gated component reads useFlag(key); with the
 * flag off (the default) it renders the legacy path. Outside any provider the
 * hook is safe and returns off, so a stray render can never crash or
 * accidentally enable a half-built surface.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider, useFlag } from "./FlagProvider";

function Probe({ flag }: { flag: "role_home" }) {
  return <span>{useFlag(flag) ? "on" : "off"}</span>;
}

describe("FlagProvider / useFlag", () => {
  it("renders off by default (legacy path)", () => {
    render(
      <FlagProvider>
        <Probe flag="role_home" />
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
