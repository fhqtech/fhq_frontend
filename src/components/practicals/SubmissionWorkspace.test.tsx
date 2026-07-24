import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmissionWorkspace } from "./SubmissionWorkspace";
import { loadDraft } from "@/lib/submissionDraft";
import type { InterviewAssignmentBrief } from "@/services/journeysApi";

const brief: InterviewAssignmentBrief = {
  interview_id: "iv1",
  task_brief: "Reconcile ITC in the attached workings.",
  expected_artifacts: ["memo", "workbook"],
  expected_artifacts_structured: [
    { label: "ITC memo", required: true },
    { label: "Reconciliation workbook", required: true },
  ],
  exhibits: [],
  estimated_effort_min: 60,
  time_limit_min: null,
  deadline_at: null,
  rubric_public: [{ label: "Analysis rigour" }],
};

function upload(n: number) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const files = Array.from(
    { length: n },
    (_, i) => new File(["x"], `f${i}.pdf`, { type: "application/pdf" }),
  );
  fireEvent.change(input, { target: { files } });
}

beforeEach(() => localStorage.clear());

describe("SubmissionWorkspace", () => {
  it("shows the brief so the candidate can see the task", () => {
    render(<SubmissionWorkspace brief={brief} draftKey="iv1" onSubmit={vi.fn()} />);
    expect(screen.getByText(/reconcile itc in the attached workings/i)).toBeInTheDocument();
  });

  it("gates submit until every required artifact is uploaded", async () => {
    const user = userEvent.setup();
    render(<SubmissionWorkspace brief={brief} draftKey="iv1" onSubmit={vi.fn()} />);
    upload(1); // only one of two required
    await user.click(screen.getByRole("button", { name: /review submission/i }));
    expect(screen.getByText("ITC memo")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation workbook")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit and start defense/i })).toBeDisabled();
  });

  it("submits with both files once disclosure is acknowledged", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubmissionWorkspace brief={brief} draftKey="iv1" onSubmit={onSubmit} />);
    upload(2);
    await user.click(screen.getByRole("button", { name: /review submission/i }));
    await user.click(screen.getByRole("checkbox"));
    const submit = screen.getByRole("button", { name: /submit and start defense/i });
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].aiDisclosed).toBe(true);
    expect(onSubmit.mock.calls[0][0].files).toHaveLength(2);
  });

  it("anchors a timed sprint to a persisted deadline (refresh-safe)", async () => {
    const timed: InterviewAssignmentBrief = { ...brief, time_limit_min: 45 };
    const { unmount } = render(<SubmissionWorkspace brief={timed} draftKey="ivT" onSubmit={vi.fn()} />);
    await waitFor(() => expect(typeof loadDraft("ivT")?.deadline).toBe("number"));
    const first = loadDraft("ivT")!.deadline!;
    unmount();
    // remounting reuses the persisted deadline instead of resetting the clock
    render(<SubmissionWorkspace brief={timed} draftKey="ivT" onSubmit={vi.fn()} />);
    await waitFor(() => expect(loadDraft("ivT")!.deadline).toBe(first));
  });

  it("restores autosaved notes on mount", () => {
    localStorage.setItem(
      "flowdot:submission-draft:iv1",
      JSON.stringify({ notes: "saved note", aiDisclosed: false }),
    );
    render(<SubmissionWorkspace brief={brief} draftKey="iv1" onSubmit={vi.fn()} />);
    expect((screen.getByLabelText("Assumptions & approach") as HTMLTextAreaElement).value).toBe(
      "saved note",
    );
  });
});
