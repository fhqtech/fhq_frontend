import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

const VARIANT = {
  default: "text-foreground-muted",
  brand: "text-brand-primary",
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
