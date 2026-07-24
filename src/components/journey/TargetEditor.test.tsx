import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TargetEditor } from "./TargetEditor";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const initial = [{ skill_name: "GST compliance", target: 80 }];

describe("TargetEditor blueprint-seed note", () => {
  it("shows the seed note when seededFromBlueprint is true", () => {
    render(<TargetEditor ws="w" programId="p" initial={initial} seededFromBlueprint />);
    expect(screen.getByText(/Seeded from the role blueprint/)).toBeTruthy();
    // seeded rows are still editable + unsaved (the recruiter saves manually)
    expect(screen.getByDisplayValue("GST compliance")).toBeTruthy();
  });

  it("hides the note by default", () => {
    render(<TargetEditor ws="w" programId="p" initial={initial} />);
    expect(screen.queryByText(/Seeded from the role blueprint/)).toBeNull();
  });
});
