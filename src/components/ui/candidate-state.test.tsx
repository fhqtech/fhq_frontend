/**
 * P0-3 — one candidate-state token. Replaces StatusBadge (15 overlapping
 * statuses, Title Case + uppercase) and StatusChip with a single component over
 * the 5-variant status-dot vocabulary, rendered in sentence case. The gate:
 * every StatusBadge status MUST map to a variant and a label, so adding a status
 * upstream without mapping it here fails CI rather than rendering "Unknown".
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { STATUS_VALUES } from "@/components/dashboard/StatusBadge";
import { CandidateState, statusToVariant, statusToLabel } from "./candidate-state";

describe("CandidateState mapping", () => {
  it("maps every StatusBadge status to a variant and a label (no unmapped status)", () => {
    const unmapped = STATUS_VALUES.filter(
      (s) => !statusToVariant[s] || !statusToLabel[s],
    );
    expect(unmapped).toEqual([]);
  });

  it("locks the load-bearing variant choices", () => {
    expect(statusToVariant["completed"]).toBe("ready");
    expect(statusToVariant["cancelled"]).toBe("danger");
    expect(statusToVariant["under-review"]).toBe("warning");
    expect(statusToVariant["draft"]).toBe("neutral");
  });

  it("labels are sentence case, not Title Case or ALL CAPS", () => {
    expect(statusToLabel["in-progress"]).toBe("In progress");
    expect(statusToLabel["under-review"]).toBe("Under review");
    expect(statusToLabel["paused_credits"]).toBe("Credits exhausted");
  });
});

describe("CandidateState render", () => {
  it("renders the sentence-case label for a status", () => {
    render(<CandidateState status="in-progress" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("exposes the state to assistive tech", () => {
    render(<CandidateState status="completed" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
