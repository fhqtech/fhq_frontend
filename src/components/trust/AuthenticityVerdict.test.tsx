import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { AuthenticityVerdict } from "./AuthenticityVerdict";

const report = {
  authenticity: "likely_not_own_work" as const,
  integrity_flags: ["Strong artifact but hollow defense on the GST treatment"],
};

describe("AuthenticityVerdict", () => {
  it("renders the verdict + integrity flags when defense_authenticity is on", () => {
    render(
      <FlagProvider overrides={{ defense_authenticity: true }}>
        <AuthenticityVerdict report={report} />
      </FlagProvider>,
    );
    expect(screen.getByText(/likely not their own work/i)).toBeInTheDocument();
    expect(screen.getByText(/hollow defense/i)).toBeInTheDocument();
  });

  it("renders nothing when the flag is off", () => {
    const { container } = render(
      <FlagProvider overrides={{ defense_authenticity: false }}>
        <AuthenticityVerdict report={report} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is no report", () => {
    const { container } = render(
      <FlagProvider overrides={{ defense_authenticity: true }}>
        <AuthenticityVerdict report={null} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
