import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownNotes } from "./MarkdownNotes";

describe("MarkdownNotes", () => {
  it("fires onChange as the candidate types", () => {
    const onChange = vi.fn();
    render(<MarkdownNotes value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Assumptions & approach"), {
      target: { value: "reconciled ITC" },
    });
    expect(onChange).toHaveBeenCalledWith("reconciled ITC");
  });

  it("shows a live word count against the max", () => {
    render(<MarkdownNotes value="one two three" onChange={() => {}} maxWords={10} />);
    expect(screen.getByText("3 / 10 words")).toBeInTheDocument();
  });

  it("warns past the word limit", () => {
    render(<MarkdownNotes value="a b c d e f g h i j k" onChange={() => {}} maxWords={10} />);
    const count = screen.getByText("11 / 10 words");
    expect(count.className).toContain("text-danger");
  });

  it("renders markdown in the preview tab", async () => {
    const user = userEvent.setup();
    render(<MarkdownNotes value="**bold**" onChange={() => {}} />);
    await user.click(screen.getByRole("tab", { name: "Preview" }));
    const strong = await screen.findByText("bold");
    expect(strong.tagName).toBe("STRONG");
  });
});
