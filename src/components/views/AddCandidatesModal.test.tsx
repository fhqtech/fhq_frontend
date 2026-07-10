import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* --------------------------------- mocks --------------------------------- */

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const inviteCandidatesMock = vi.fn();
vi.mock("@/services/interviewApi", () => ({
  interviewApi: {
    inviteCandidates: (...args: unknown[]) => inviteCandidatesMock(...args),
  },
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/hooks/usePlan", () => ({
  useCredits: () => ({ remaining: 100, granted: 100, consumed: 0, empty: false }),
  useRefreshCredits: () => vi.fn(),
}));

import { AddCandidatesModal } from "./AddCandidatesModal";

/* -------------------------------- helpers -------------------------------- */

function renderModal(props: Partial<React.ComponentProps<typeof AddCandidatesModal>> = {}) {
  return render(
    <MemoryRouter>
      <AddCandidatesModal
        isOpen
        onClose={() => {}}
        interviewId="iv_1"
        {...props}
      />
    </MemoryRouter>,
  );
}

function fillValidRow() {
  const name = screen.getByPlaceholderText("Priya Sharma");
  const email = screen.getByPlaceholderText("priya@firm.co.in");
  fireEvent.change(name, { target: { value: "Priya Sharma" } });
  fireEvent.change(email, { target: { value: "priya@firm.co.in" } });
}

function sendButton() {
  return screen.getByRole("button", { name: /Send invite/i });
}

beforeEach(() => {
  navigateMock.mockReset();
  inviteCandidatesMock.mockReset();
  toastMock.mockReset();
});
afterEach(() => cleanup());

/* --------------------------------- tests --------------------------------- */

describe("AddCandidatesModal blueprint guard", () => {
  it("disables submit and shows the blueprint banner when blueprintStatus='failed'", () => {
    renderModal({ blueprintStatus: "failed" });
    fillValidRow();

    expect(screen.getByText(/Blueprint isn't ready/i)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
  });

  it("also gates on blueprintStatus='error' (mirrors the backend 422)", () => {
    renderModal({ blueprintStatus: "error" });
    fillValidRow();

    expect(screen.getByText(/Blueprint isn't ready/i)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
  });

  it("'Go to blueprint' navigates to the blueprint editor for this interview", () => {
    renderModal({ blueprintStatus: "failed" });

    fireEvent.click(screen.getByRole("button", { name: /Go to blueprint/i }));
    expect(navigateMock).toHaveBeenCalledWith("/interview-blueprint/iv_1");
  });

  it("renders the 422 blueprint_invalid detail.message when the invite loses the race", async () => {
    inviteCandidatesMock.mockRejectedValueOnce(
      Object.assign(new Error("Blueprint became invalid mid-flight."), {
        status: 422,
        detail: {
          error: "blueprint_invalid",
          message: "Blueprint became invalid mid-flight.",
        },
      }),
    );

    renderModal({ blueprintStatus: "completed" });
    fillValidRow();

    expect(sendButton()).not.toBeDisabled();
    fireEvent.click(sendButton());

    await waitFor(() =>
      expect(screen.getByText("Blueprint became invalid mid-flight.")).toBeInTheDocument(),
    );
  });

  it("keeps submit enabled for a healthy blueprint with a valid row + credits (regression)", () => {
    renderModal({ blueprintStatus: "completed" });
    fillValidRow();

    expect(screen.queryByText(/Blueprint isn't ready/i)).not.toBeInTheDocument();
    expect(sendButton()).not.toBeDisabled();
  });

  it("keeps submit enabled when blueprintStatus is undefined (fail-open)", () => {
    renderModal({});
    fillValidRow();

    expect(sendButton()).not.toBeDisabled();
  });
});
