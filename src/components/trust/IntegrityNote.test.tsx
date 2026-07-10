/**
 * P4-4 — the contestable integrity indicator.
 *
 * Contract locked by these tests:
 *   - Default-OFF. Renders nothing unless the `integrity` flag is on (and nothing
 *     at all outside a FlagProvider), so the running pilot is untouched.
 *   - Calm + evidence-backed: it cites the SPECIFIC transcript turn and shows the
 *     exact quote from that turn.
 *   - Contestable: it offers a "mark as fair" affordance that fires a callback and
 *     optimistically reflects the choice (persistence is a later ticket).
 *   - NEVER accusatory: the chrome copy contains none of the banned terms and is
 *     never a verdict — it is "needs a closer look".
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { ACCUSATORY_TERMS, type IntegrityFlag } from "@/lib/integrity";
import { IntegrityNote } from "./IntegrityNote";

// Priya Sharma, indirect-tax answer — a calm, realistic finance fixture.
const flag: IntegrityFlag = {
  turn: 7,
  quote: "We caught a mismatch in the GST reconciliation the night before filing.",
  skillName: "Indirect tax",
  note: "The same last-minute-rescue arc appears in three separate answers.",
};

function renderOn(props: Partial<React.ComponentProps<typeof IntegrityNote>> = {}) {
  return render(
    <FlagProvider overrides={{ integrity: true }}>
      <IntegrityNote flag={flag} {...props} />
    </FlagProvider>,
  );
}

describe("IntegrityNote — flag gating", () => {
  it("renders nothing when the integrity flag is off", () => {
    const { container } = render(
      <FlagProvider overrides={{ integrity: false }}>
        <IntegrityNote flag={flag} />
      </FlagProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing outside any FlagProvider (default-off)", () => {
    const { container } = render(<IntegrityNote flag={flag} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("IntegrityNote — evidence-backed, calm framing", () => {
  it("frames the note as 'needs a closer look', not a verdict", () => {
    renderOn();
    expect(screen.getByText(/needs a closer look/i)).toBeInTheDocument();
  });

  it("cites the specific transcript turn", () => {
    renderOn();
    expect(screen.getByText(/turn 7/i)).toBeInTheDocument();
  });

  it("shows the exact quote from the cited turn", () => {
    renderOn();
    expect(screen.getByText(flag.quote)).toBeInTheDocument();
  });

  it("shows the skill context when supplied", () => {
    renderOn();
    expect(screen.getByText(/indirect tax/i)).toBeInTheDocument();
  });

  it("exposes an accessible note region to assistive tech", () => {
    renderOn();
    const region = screen.getByRole("note");
    expect(region).toHaveAccessibleName(/needs a closer look/i);
  });

  it("never uses accusatory language in its chrome copy", () => {
    const { container } = renderOn();
    const text = (container.textContent ?? "").toLowerCase();
    for (const term of ACCUSATORY_TERMS) {
      expect(text).not.toContain(term);
    }
  });
});

describe("IntegrityNote — contestable 'mark as fair' path", () => {
  it("offers a 'mark as fair' affordance", () => {
    renderOn();
    expect(screen.getByRole("button", { name: /mark as fair/i })).toBeInTheDocument();
  });

  it("fires onMarkFair with the flag and optimistically confirms the choice", async () => {
    const onMarkFair = vi.fn();
    const user = userEvent.setup();
    renderOn({ onMarkFair });

    await user.click(screen.getByRole("button", { name: /mark as fair/i }));

    expect(onMarkFair).toHaveBeenCalledTimes(1);
    expect(onMarkFair).toHaveBeenCalledWith(flag);
    // Optimistic local state: the affordance is replaced by a confirmation.
    expect(screen.getByText(/marked as fair/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark as fair/i })).not.toBeInTheDocument();
  });

  it("still confirms optimistically when no callback is wired", async () => {
    const user = userEvent.setup();
    renderOn();
    await user.click(screen.getByRole("button", { name: /mark as fair/i }));
    expect(screen.getByText(/marked as fair/i)).toBeInTheDocument();
  });
});
