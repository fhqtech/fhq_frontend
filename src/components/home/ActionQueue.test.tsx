/**
 * P2-1 — the action queue UI. Two NBA-sorted sections (responses to review,
 * live interviews); an empty queue reads as "you're caught up", never dead
 * space. A row's NBA either navigates (href) or fires an inline action, so the
 * recruiter clears the queue without hopping to a detail page first.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ActionQueue } from "./ActionQueue";
import type { QueueItem } from "@/lib/buildActionQueue";

const item = (o: Partial<QueueItem> & { id: string; bucket: QueueItem["bucket"] }): QueueItem => ({
  snapshot: { id: o.id, title: o.id, status: "active" },
  nba: { label: "Share invite link", action: "share", variant: "default" },
  ...o,
});

function renderQueue(items: QueueItem[], props = {}) {
  return render(
    <MemoryRouter>
      <ActionQueue items={items} {...props} />
    </MemoryRouter>,
  );
}

describe("ActionQueue", () => {
  it("renders a results section and a live section when both have items", () => {
    renderQueue([
      item({ id: "r1", bucket: "results", snapshot: { id: "r1", title: "Tax associate", status: "active" }, nba: { label: "Review 3 responses", href: "/interviews/r1#candidates", variant: "default" } }),
      item({ id: "l1", bucket: "live", snapshot: { id: "l1", title: "Audit analyst", status: "active" } }),
    ]);
    expect(screen.getByRole("heading", { name: /review/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /live/i })).toBeInTheDocument();
    expect(screen.getByText("Tax associate")).toBeInTheDocument();
    expect(screen.getByText("Audit analyst")).toBeInTheDocument();
  });

  it("shows a caught-up empty state for an empty queue", () => {
    renderQueue([]);
    expect(screen.getByText(/caught up/i)).toBeInTheDocument();
  });

  it("fires an inline action when the NBA is an action, not a link", async () => {
    const onAction = vi.fn();
    renderQueue([item({ id: "l1", bucket: "live" })], { onAction });
    await userEvent.click(screen.getByRole("button", { name: /share invite link/i }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: "l1" }), "share");
  });
});
