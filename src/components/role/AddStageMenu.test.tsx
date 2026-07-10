/**
 * P2-2 — the typed Add-stage menu. The recruiter never picks a builder; they
 * pick which stages a role needs (screen / fitment / interview / assignment /
 * review / decision), and the menu appends one to the role's pipeline.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddStageMenu } from "./AddStageMenu";

describe("AddStageMenu", () => {
  it("offers the stage types and fires onAdd with the chosen type", async () => {
    const onAdd = vi.fn();
    render(<AddStageMenu onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /add stage/i }));
    await userEvent.click(await screen.findByText("Fitment"));
    expect(onAdd).toHaveBeenCalledWith("fitment");
  });
});
