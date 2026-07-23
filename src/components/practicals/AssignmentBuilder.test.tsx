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
  },
}));

const mocked = practicalsApi as unknown as {
  generateAssignment: ReturnType<typeof vi.fn>;
  getPractical: ReturnType<typeof vi.fn>;
  getAssignment: ReturnType<typeof vi.fn>;
  inviteCandidates: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.generateAssignment.mockResolvedValue({ success: true, status: "generating", practicalId: "p1" });
  mocked.getPractical.mockResolvedValue({ id: "p1", title: "Tax Analyst", assignmentStatus: "ready" });
  mocked.getAssignment.mockResolvedValue({
    ready: true,
    task_brief: "Reconcile ITC in the attached workings.",
    expected_artifacts: ["A 1-page memo"],
    estimated_effort_min: 90,
  });
  mocked.inviteCandidates.mockResolvedValue({ invitations: [], count: 1 });
});

describe("AssignmentBuilder", () => {
  it("generates, previews the brief, then invites", async () => {
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

  it("surfaces a generation failure", async () => {
    mocked.getPractical.mockResolvedValue({ id: "p1", assignmentStatus: "failed", assignmentError: "model error" });
    const user = userEvent.setup();
    render(<AssignmentBuilder ws="w1" pr="pr1" practicalId="p1" />);
    await user.click(screen.getByRole("button", { name: /generate assignment/i }));
    expect(await screen.findByText(/model error/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
