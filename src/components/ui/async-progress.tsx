/**
 * P1-1 — AsyncProgress. The single "this is working, here's roughly how long"
 * surface for every long operation (blueprint, practical assignment, reviewer
 * scoring). A wait is never a dead end: a labelled progress state with a hedged
 * ETA, and on failure an ErrorBanner with retry. The caller owns the polling and
 * the underlying work; this only renders the state.
 */
import { cn } from "@/lib/utils";
import { etaPhrase } from "@/lib/eta";
import { ErrorBanner } from "./error-banner";

export interface AsyncProgressProps {
  /** What is being produced, sentence case (e.g. "Building the graph"). */
  label: string;
  /** Server p50 estimate in seconds, or omit for the hedged fallback. */
  etaSeconds?: number | null;
  /** When set, the operation failed; renders an ErrorBanner instead. */
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function AsyncProgress({ label, etaSeconds, error, onRetry, className }: AsyncProgressProps) {
  if (error) {
    return (
      <ErrorBanner
        tone="danger"
        title={label}
        description={error}
        retryLabel={onRetry ? "Try again" : undefined}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  const eta = etaSeconds ? `in ${etaPhrase(etaSeconds)}` : "shortly";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-md border border-rule bg-paper-2 px-4 py-3",
        className,
      )}
    >
      {/* transform + opacity only; matches the status-dot pending pulse */}
      <span className="relative mt-1 inline-flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-info opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-soft">Usually ready {eta}</p>
      </div>
    </div>
  );
}

export default AsyncProgress;
