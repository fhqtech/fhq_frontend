import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NowDiscussingCue } from "./NowDiscussingCue";

describe("NowDiscussingCue", () => {
  it("shows the skill and question progress", () => {
    render(<NowDiscussingCue skillLabel="GST reconciliation" questionIndex={2} questionTotal={5} />);
    expect(screen.getByText("now discussing")).toBeInTheDocument();
    expect(screen.getByText("GST reconciliation")).toBeInTheDocument();
    expect(screen.getByText(/question 2 of 5/i)).toBeInTheDocument();
  });

  it("omits the progress when total is 0", () => {
    render(<NowDiscussingCue skillLabel="TDS" questionIndex={0} questionTotal={0} />);
    expect(screen.getByText("TDS")).toBeInTheDocument();
    expect(screen.queryByText(/question/i)).not.toBeInTheDocument();
  });

  it("renders nothing without a skill", () => {
    const { container } = render(<NowDiscussingCue skillLabel="" questionIndex={0} questionTotal={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
