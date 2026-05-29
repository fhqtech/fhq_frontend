/**
 * Shared toast helper for P-Plans 403 denials.
 *
 * The backend returns structured `detail` objects on credit / plan
 * denials. This helper inspects an error thrown by `interviewApi` (which
 * already attaches `err.code` and `err.detail`) and shows a relevant
 * toast. Returns `true` if it matched and toasted; callers should fall
 * back to a generic toast otherwise.
 *
 * Shapes we recognise:
 *   {error: "credits_required", required, remaining, reason?}
 *   {error: "plan_required", required_plan, feature, current_plan}
 *   {error: "insufficient_role", feature, required_level}
 */
import type { useToast } from "@/hooks/use-toast";

type ToastFn = ReturnType<typeof useToast>["toast"];

interface PlanError extends Error {
  status?: number;
  code?: string;
  detail?: any;
}

const REASON_COPY: Record<string, string> = {
  retake: "This candidate already completed the interview. Retaking it costs 1 credit.",
  legacy: "This invitation predates the credit system. Resending it now costs 1 credit.",
  unpaid_invitation: "This invitation was not paid for. Recreate it from the start screen.",
};

export function toastPlanError(toast: ToastFn, err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as PlanError;

  if (e.code === "credits_required") {
    const d = e.detail || {};
    const required = d.required ?? 1;
    const remaining = d.remaining ?? 0;
    const reasonCopy = d.reason ? REASON_COPY[d.reason] : null;
    const desc = [
      reasonCopy,
      `Need ${required} credit${required === 1 ? "" : "s"} · ${remaining} remaining.`,
      "Contact us to add more.",
    ].filter(Boolean).join(" ");
    toast({
      title: "Out of credits",
      description: desc,
      variant: "destructive",
    });
    return true;
  }

  if (e.code === "plan_required") {
    const d = e.detail || {};
    toast({
      title: "Plan upgrade required",
      description: `${d.required_plan ?? "Pro"} plan unlocks ${d.feature ?? "this feature"}. Contact us to upgrade.`,
      variant: "destructive",
    });
    return true;
  }

  if (e.code === "insufficient_role") {
    toast({
      title: "You don't have access",
      description: "Ask a workspace admin to grant you permission for this action.",
      variant: "destructive",
    });
    return true;
  }

  return false;
}
