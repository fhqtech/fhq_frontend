import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreChip } from "./score-chip";

describe("ScoreChip", () => {
  it("bands >=80 as Strong", () => {
    render(<ScoreChip score={82} showLabel />);
    expect(screen.getByText("82")).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("bands 50-79 as Developing", () => {
    render(<ScoreChip score={64} showLabel />);
    expect(screen.getByText("Developing")).toBeTruthy();
  });

  it("bands <50 as Gap", () => {
    render(<ScoreChip score={30} showLabel />);
    expect(screen.getByText("Gap")).toBeTruthy();
  });

  it("rounds before banding so number and colour agree", () => {
    render(<ScoreChip score={79.6} showLabel />);
    // 79.6 rounds to 80 -> Strong (not Developing).
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("renders an em dash for a null score", () => {
    render(<ScoreChip score={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders 'Not assessed' when labelled and score is missing", () => {
    render(<ScoreChip score={undefined} showLabel />);
    expect(screen.getByText("Not assessed")).toBeTruthy();
  });
});
