/**
 * P0-3 — the unified candidate-state token. One component, one taxonomy,
 * rendered in sentence case over the 5-variant status-dot vocabulary
 * (ready / pending / warning / danger / neutral). Replaces StatusBadge (15
 * statuses, Title Case + uppercase) and StatusChip incrementally: new and
 * opt-in surfaces use this; the old components become deprecated wrappers.
 *
 * Layer 1 here is interview / stage status. Layer 2 (derived candidate status)
 * and layer 3 (the next-best-action verb) extend this component without changing
 * its callers, so the same token renders at role, stage, and candidate-360
 * altitudes.
 */
import { cn } from "@/lib/utils";
import type { Status } from "@/components/dashboard/StatusBadge";

export type StateVariant = "ready" | "pending" | "warning" | "danger" | "neutral";

/** Status to status-dot variant. Exhaustive over StatusBadge's Status union. */
export const statusToVariant: Record<Status, StateVariant> = {
  pending: "pending",
  "in-progress": "pending",
  completed: "ready",
  cancelled: "danger",
  shortlisted: "ready",
  scheduled: "pending",
  "under-review": "warning",
  draft: "neutral",
  active: "ready",
  paused: "warning",
  paused_credits: "warning",
  stopped: "danger",
  link_clicked: "pending",
  registered: "ready",
  linked_to_existing: "pending",
};

/** Status to sentence-case label. No Title Case, no ALL CAPS. */
export const statusToLabel: Record<Status, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  shortlisted: "Shortlisted",
  scheduled: "Scheduled",
  "under-review": "Under review",
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  paused_credits: "Credits exhausted",
  stopped: "Stopped",
  link_clicked: "Link opened",
  registered: "Registered",
  linked_to_existing: "Link opened",
};

const VARIANT_CLASS: Record<StateVariant, string> = {
  ready: "bg-success-light text-success border-success/20",
  pending: "bg-info-soft text-info border-info/30",
  warning: "bg-warning-light text-warning border-warning/20",
  danger: "bg-status-cancelled-light text-status-cancelled border-status-cancelled/20",
  neutral: "bg-paper-3 text-muted border-rule",
};

export interface CandidateStateProps {
  status: Status;
  /** Optional override label. Defaults to the sentence-case mapped label. */
  label?: string;
  className?: string;
}

export function CandidateState({ status, label, className }: CandidateStateProps) {
  const variant = statusToVariant[status] ?? "neutral";
  const text = label ?? statusToLabel[status] ?? "Unknown";
  return (
    <span
      role="status"
      aria-label={text}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] font-semibold border",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {text}
    </span>
  );
}
