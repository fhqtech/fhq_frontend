/**
 * StatusDot — small colored dot indicating live state.
 *
 * Inspired by Vercel Geist's StatusDot: pulses while the state is
 * non-terminal (queued / building / analyzing), static on terminal
 * state (ready / failed). transform + opacity only — no color animation.
 *
 * F24.6: used as the "analyzing" pill on candidate dashboard rows
 * while a TAG result is being computed. Also fits future work-in-flight
 * indicators (job running, blueprint generating, etc.).
 */
import { cn } from "@/lib/utils";

type StatusVariant = "ready" | "pending" | "warning" | "danger" | "neutral";

const VARIANT_BG: Record<StatusVariant, string> = {
  ready: "bg-success",
  pending: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted",
};

interface StatusDotProps {
  variant?: StatusVariant;
  /** Adds a subtle pulsing ring around the dot. Default true for pending. */
  pulse?: boolean;
  /** Label shown next to the dot. Optional. */
  label?: string;
  className?: string;
}

export function StatusDot({ variant = "neutral", pulse, label, className }: StatusDotProps) {
  const shouldPulse = pulse ?? variant === "pending";
  const bg = VARIANT_BG[variant];
  return (
    <span
      role="status"
      aria-label={label ?? variant}
      className={cn("inline-flex items-center gap-2 text-xs", className)}
    >
      <span className="relative inline-flex h-2 w-2">
        {shouldPulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-60",
              bg,
              "animate-ping",
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", bg)} />
      </span>
      {label && <span className="text-ink-soft">{label}</span>}
    </span>
  );
}
