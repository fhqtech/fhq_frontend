import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

const VARIANT = {
  default: "text-muted",
  brand: "text-ink",
  gold: "text-gold-ink",
  danger: "text-danger",
  inverse: "text-white",
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZE;
  variant?: keyof typeof VARIANT;
  label?: string;
  className?: string;
}

export function Spinner({
  size = "md",
  variant = "default",
  label = "Loading",
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-flex items-center", className)}
    >
      <Loader2 className={cn(SIZE[size], VARIANT[variant], "animate-spin")} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SpinnerWithCopy({
  size = "md",
  variant = "default",
  label = "Loading…",
  className,
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2 text-sm", VARIANT[variant], className)}
    >
      <Loader2 className={cn(SIZE[size], "animate-spin")} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/**
 * PageSpinner — full-screen centered loader for route-level Suspense
 * fallbacks and page-loading shells. Replaces the ad-hoc
 * `<div className="min-h-[100dvh] flex items-center justify-center">
 *    <Loader2 className="animate-spin"/></div>` pattern.
 */
export function PageSpinner({
  label = "Loading…",
  variant = "gold",
  className,
}: { label?: string; variant?: keyof typeof VARIANT; className?: string }) {
  return (
    <div
      className={cn(
        "min-h-[100dvh] w-full bg-paper-2 flex flex-col items-center justify-center gap-3 text-sm text-muted",
        className,
      )}
    >
      <Loader2
        className={cn(SIZE.lg, VARIANT[variant], "animate-spin")}
        aria-hidden="true"
      />
      <span role="status" aria-live="polite">
        {label}
      </span>
    </div>
  );
}
