/**
 * P2-2 — open a role: the single entry that replaces the four separate builders.
 * Name the role, paste the JD, and it creates the role with a default screen
 * stage and lands on its pipeline board. (The AI blueprint draft composes on top
 * of this in the integration pass.)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ currentWorkspace: { id: "ws1" }, currentProject: { id: "pr1" } }),
}));
vi.mock("@/services/recruiterJourneysApi", () => ({
  recruiterJourneysApi: { createRoleWithTemplate: vi.fn().mockResolvedValue("role123") },
}));
// Stand-in for the streaming curator: exposes a button that fires onAccept with
// a fixed proposal, so we test the wiring (proposal → form fields), not the SSE.
vi.mock("@/components/role-curator/RoleCuratorModal", () => ({
  RoleCuratorModal: ({
    isOpen,
    onAccept,
  }: {
    isOpen: boolean;
    onAccept: (p: { title?: string; description?: string }) => void;
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onAccept({ title: "Senior direct tax manager", description: "Lead scrutiny and assessments." })
        }
      >
        accept draft
      </button>
    ) : null,
}));

import { recruiterJourneysApi } from "@/services/recruiterJourneysApi";
import { OpenRoleFlow } from "./OpenRoleFlow";

describe("OpenRoleFlow", () => {
  it("creates a role with a default screen stage and navigates to its board", async () => {
    render(<OpenRoleFlow />);
    await userEvent.type(screen.getByLabelText(/role title/i), "Senior tax associate");
    await userEvent.type(screen.getByLabelText(/job description/i), "Screen tax associates for a CA firm.");
    await userEvent.click(screen.getByRole("button", { name: /open role/i }));

    expect(recruiterJourneysApi.createRoleWithTemplate).toHaveBeenCalledWith(
      "ws1",
      expect.objectContaining({ title: "Senior tax associate", projectId: "pr1" }),
    );
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/roles/role123"));
  });

  it("keeps the action disabled until a title is entered", () => {
    render(<OpenRoleFlow />);
    expect(screen.getByRole("button", { name: /open role/i })).toBeDisabled();
  });

  it("fills the title and description from an accepted AI draft", async () => {
    render(<OpenRoleFlow />);
    await userEvent.click(screen.getByRole("button", { name: /draft with ai/i }));
    await userEvent.click(screen.getByRole("button", { name: /accept draft/i }));

    expect(screen.getByLabelText(/role title/i)).toHaveValue("Senior direct tax manager");
    expect(screen.getByLabelText(/job description/i)).toHaveValue("Lead scrutiny and assessments.");
    // The draft is enough to open the role — the primary action unlocks.
    expect(screen.getByRole("button", { name: /open role/i })).toBeEnabled();
  });
});
