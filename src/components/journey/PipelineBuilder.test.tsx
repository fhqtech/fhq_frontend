import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PipelineBuilder } from "./PipelineBuilder";
import type { JourneyStage } from "@/services/recruiterJourneysApi";
import { recruiterJourneysApi } from "@/services/recruiterJourneysApi";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/services/recruiterJourneysApi", async (orig) => {
  const actual = await orig<typeof import("@/services/recruiterJourneysApi")>();
  return { ...actual, recruiterJourneysApi: { saveJourneyTemplate: vi.fn().mockResolvedValue({}) } };
});

const saveJourneyTemplate = recruiterJourneysApi.saveJourneyTemplate as unknown as ReturnType<typeof vi.fn>;

const stages: JourneyStage[] = [
  { stage_id: "screen", order: 0, type: "screen", title: "Screen" },
  { stage_id: "interview", order: 1, type: "interview", title: "Interview" },
];

beforeEach(() => saveJourneyTemplate.mockClear());

describe("PipelineBuilder", () => {
  it("saves the current stages/rules and bumps the version", async () => {
    const onSaved = vi.fn();
    render(
      <PipelineBuilder
        ws="ws1"
        programId="p1"
        initialStages={stages}
        initialRules={[]}
        initialVersion={2}
        onSaved={onSaved}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /save pipeline/i }));

    await waitFor(() => expect(saveJourneyTemplate).toHaveBeenCalledTimes(1));
    expect(saveJourneyTemplate).toHaveBeenCalledWith("ws1", "p1", {
      stages,
      rules: [],
      version: 3, // initialVersion + 1
    });
    expect(onSaved).toHaveBeenCalledWith(stages, [], 3);
  });

  it("renders the two editors (stages then rules)", () => {
    render(
      <PipelineBuilder
        ws="ws1"
        programId="p1"
        initialStages={stages}
        initialRules={[]}
        initialVersion={1}
        onSaved={vi.fn()}
      />,
    );
    // Stage titles from StageListEditor are present.
    expect(screen.getByDisplayValue("Screen")).toBeTruthy();
    expect(screen.getByDisplayValue("Interview")).toBeTruthy();
  });
});
