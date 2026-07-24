import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlueprintRubricTable } from "./BlueprintRubricTable";
import type { BlueprintSkill } from "@/services/templateApi";

const skill: BlueprintSkill = {
  skill_id: "skill-1",
  name: "Statutory audit",
  shortName: "Audit",
  description: "Plans and executes statutory audits under Ind AS.",
  expected_proficiency: 4,
  skill_type: "technical",
  is_critical: true,
  target_probes: 3,
  proficiency_levels: [
    { level: 1, name: "Awareness", description: "Knows the terms." },
    { level: 2, name: "Basic", description: "Assists on tasks." },
    { level: 3, name: "Intermediate", description: "Runs sections." },
    { level: 4, name: "Advanced", description: "Owns the engagement." },
    { level: 5, name: "Expert", description: "Sets firm policy." },
  ],
};

describe("BlueprintRubricTable", () => {
  it("renders the skill with type, criticality and target on the summary line", () => {
    render(<BlueprintRubricTable skills={[skill]} />);
    expect(screen.getByText("Statutory audit")).toBeTruthy();
    expect(screen.getByText("Technical")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
    expect(screen.getByText(/Target L4 · Advanced/)).toBeTruthy();
    expect(screen.getByText(/3 probes/)).toBeTruthy();
  });

  it("reveals the L1-L5 levels on expand", async () => {
    const user = userEvent.setup();
    render(<BlueprintRubricTable skills={[skill]} />);
    // Collapsed: level descriptions not shown yet.
    expect(screen.queryByText("Sets firm policy.")).toBeNull();
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Sets firm policy.")).toBeTruthy();
    expect(screen.getByText("Owns the engagement.")).toBeTruthy();
  });

  it("shows an empty state with no skills", () => {
    render(<BlueprintRubricTable skills={[]} />);
    expect(screen.getByText(/No skills defined/i)).toBeTruthy();
  });
});
