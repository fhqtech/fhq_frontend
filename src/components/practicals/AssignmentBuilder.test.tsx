import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssignmentBuilder } from "./AssignmentBuilder";
import { practicalsApi } from "@/services/practicalsApi";

vi.mock("@/services/practicalsApi", () => ({
  practicalsApi: {
    generateAssignment: vi.fn(),
    getPractical: vi.fn(),
    getAssignment: vi.fn(),
    inviteCandidates: vi.fn(),
    updateAssignment: vi.fn(),
  },
}));

const mocked = practicalsApi as unknown as {
  generateAssignment: ReturnType<typeof vi.fn>;
  getPractical: ReturnType<typeof vi.fn>;
  getAssignment: ReturnType<typeof vi.fn>;
  inviteCandidates: ReturnType<typeof vi.fn>;
  updateAssignment: ReturnType<typeof vi.fn>;
};

const READY_BRIEF = {
  ready: true,
  task_brief: "Reconcile ITC in the attached workings.",
  expected_artifacts: ["A 1-page memo"],
  estimated_effort_min: 90,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.generateAssignment.mockResolvedValue({ success: true, status: "generating", practicalId: "p1" });
  mocked.getPractical.mockResolvedValue({ id: "p1", title: "Tax Analyst", assignmentStatus: "ready" });
  // Default: no assignment yet on mount, so the builder starts idle (generate).
  mocked.getAssignment.mockRejectedValue(new Error("not found"));
  mocked.inviteCandidates.mockResolvedValue({ invitations: [], count: 1 });
  mocked.updateAssignment.mockResolvedValue({ updated: true, task_brief: "edited case" });
});

describe("AssignmentBuilder", () => {
  it("previews an already-generated assignment on mount", async () => {
    mocked.getAssignment.mockReset();
    mocked.getAssignment.mockResolvedValue(READY_BRIEF);
    render(<AssignmentBuilder ws="w1" pr="pr1" practicalId="p1" />);
    // no generate click — the existing brief shows straight away for review
    expect(await screen.findByText(/reconcile itc in the attached workings/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate assignment/i })).not.toBeInTheDocument();
  });

  it("generates, previews the brief, then invites", async () => {
    // reject on mount (no assignment), then resolve once generated
    mocked.getAssignment.mockReset();
    mocked.getAssignment.mockRejectedValueOnce(new Error("not found")).mockResolvedValue(READY_BRIEF);
    const user = userEvent.setup();
    render(<AssignmentBuilder ws="w1" pr="pr1" practicalId="p1" />);

    await user.click(screen.getByRole("button", { name: /generate assignment/i }));

    // the generated brief is shown for review before any candidate sees it
    expect(await screen.findByText(/reconcile itc in the attached workings/i)).toBeInTheDocument();
    expect(mocked.generateAssignment).toHaveBeenCalledWith("w1", "pr1", "p1");

    await user.type(screen.getByLabelText(/candidate email/i), "arjun@example.com");
    await user.click(screen.getByRole("button", { name: /^invite$/i }));

    expect(mocked.inviteCandidates).toHaveBeenCalledWith("w1", "pr1", "p1", [
      { name: "arjun", email: "arjun@example.com" },
    ]);
    expect(await screen.findByText(/invitation sent/i)).toBeInTheDocument();
  });

  it("lets the recruiter edit the brief before inviting", async () => {
    mocked.getAssignment.mockReset();
    mocked.getAssignment.mockResolvedValue(READY_BRIEF);
    const user = userEvent.setup();
    render(<AssignmentBuilder ws="w1" pr="pr1" practicalId="p1" />);
    await screen.findByText(/reconcile itc in the attached workings/i);

    await user.click(screen.getByRole("button", { name: /edit brief/i }));
    const box = screen.getByLabelText("Edit brief");
    await user.clear(box);
    await user.type(box, "edited case");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mocked.updateAssignment).toHaveBeenCalledWith("w1", "pr1", "p1", { task_brief: "edited case" });
    expect(await screen.findByText("edited case")).toBeInTheDocument();
  });

  it("surfaces a generation failure", async () => {
    mocked.getPractical.mockResolvedValue({ id: "p1", assignmentStatus: "failed", assignmentError: "model error" });
    const user = userEvent.setup();
    render(<AssignmentBuilder ws="w1" pr="pr1" practicalId="p1" />);
    await user.click(screen.getByRole("button", { name: /generate assignment/i }));
    expect(await screen.findByText(/model error/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
