/**
 * P2-3 — add candidates to a role. Paste emails, see how many parsed, and
 * enroll them into the role's pipeline in one action. The valid count gates the
 * submit so an empty/junk paste can't fire.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCandidatesToRole } from "./AddCandidatesToRole";

describe("AddCandidatesToRole", () => {
  it("enrolls the parsed emails on submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddCandidatesToRole onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /add candidates/i }));
    await userEvent.type(
      await screen.findByLabelText(/candidate emails/i),
      "priya@x.com, arjun@y.com",
    );
    await userEvent.click(screen.getByRole("button", { name: /add 2 candidates/i }));
    expect(onSubmit).toHaveBeenCalledWith(["priya@x.com", "arjun@y.com"]);
  });
});
