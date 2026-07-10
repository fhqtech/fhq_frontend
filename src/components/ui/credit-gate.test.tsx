/**
 * P0-9b — CreditGate surfaces the backend out-of-credits gate (P0-9a) without
 * treating a partial send as a failure. The invite endpoint returns 402 with
 * { required, available, shortfall, sent, skipped }; when sent > 0 some
 * invitations DID go out and the recruiter must see that, plus the exact
 * shortfall and a way to top up.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreditGate } from "./credit-gate";

describe("CreditGate", () => {
  it("reports a partial send: some invitations went out, the rest are short", () => {
    render(<CreditGate required={10} available={6} shortfall={4} sent={6} skipped={4} />);
    // numbers are wrapped in mono spans, so assert on the alert's full text
    const text = screen.getByRole("alert").textContent ?? "";
    expect(text).toMatch(/we sent\s*6\s*of\s*10/i);
    expect(text).toMatch(/4\s*more credits/i);
  });

  it("reports a full block when nothing could be sent", () => {
    render(<CreditGate required={5} available={0} shortfall={5} sent={0} skipped={5} />);
    const text = screen.getByRole("alert").textContent ?? "";
    expect(text).toMatch(/5\s*more credits/i);
    // a full block must not claim anything was sent
    expect(text).not.toMatch(/we sent/i);
  });

  it("fires the top-up action", async () => {
    const onTopUp = vi.fn();
    render(<CreditGate required={5} available={0} shortfall={5} sent={0} skipped={5} onTopUp={onTopUp} />);
    await userEvent.click(screen.getByRole("button", { name: /top up/i }));
    expect(onTopUp).toHaveBeenCalledOnce();
  });

  it("renders a top-up href as a link when given one", () => {
    render(<CreditGate required={5} available={0} shortfall={5} sent={0} skipped={5} topUpHref="/settings/plan" />);
    expect(screen.getByRole("link", { name: /top up/i })).toHaveAttribute("href", "/settings/plan");
  });
});
