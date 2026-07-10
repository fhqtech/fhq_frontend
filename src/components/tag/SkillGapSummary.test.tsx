/**
 * B3 — the skill-gap summary card. Reads a normalized summary and states, in
 * plain language, how many skills clear the bar and which fall short (worst
 * first). The zero-setup headline of a candidate's fit against the role.
 */
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SkillGapSummary } from "./SkillGapSummary";
import type { SkillGapSummaryData } from "@/lib/skillGap";

const data = (over: Partial<SkillGapSummaryData> = {}): SkillGapSummaryData => ({
  total: 6,
  met: 4,
  mode: "status",
  gapItems: [
    { skillName: "Financial reporting", status: "gap", score: 34 },
    { skillName: "Tax audit", status: "developing", score: 61 },
  ],
  ...over,
});

describe("SkillGapSummary", () => {
  it("headlines skills met against the total", () => {
    render(<SkillGapSummary data={data()} />);
    expect(screen.getByRole("region", { name: /skill gap/i })).toBeInTheDocument();
    expect(screen.getByText(/4 of 6/i)).toBeInTheDocument();
  });

  it("lists the below-bar skills worst-first", () => {
    render(<SkillGapSummary data={data()} />);
    const region = screen.getByRole("region", { name: /skill gap/i });
    expect(within(region).getByText("Financial reporting")).toBeInTheDocument();
    expect(within(region).getByText("Tax audit")).toBeInTheDocument();
  });

  it("celebrates when every skill meets the bar", () => {
    render(<SkillGapSummary data={data({ met: 6, gapItems: [] })} />);
    expect(screen.getByText(/every assessed skill meets the bar/i)).toBeInTheDocument();
  });

  it("shows the average shortfall in target mode", () => {
    render(
      <SkillGapSummary
        data={data({ mode: "target", avgGap: 18, gapItems: [{ skillName: "Deferred tax", status: "gap", score: 30, target: 70, gap: 40 }] })}
      />,
    );
    expect(screen.getByText(/18/)).toBeInTheDocument();
  });
});
