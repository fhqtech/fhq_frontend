/**
 * ErrorBanner — inline error surface.
 *
 * Replaces ad-hoc red Cards / red toasts / `text-red-700 bg-red-50` blocks
 * (designer review found 6 distinct treatments). Use for inline errors
 * tied to a section. For transient/global errors prefer the toast hook.
 *
 * Tones:
 *   "danger"  — fatal: load failed, permission denied, etc.
 *   "warning" — non-fatal: stale data, retry suggested
 *   "info"    — informational: deprecation notice, neutral system state
 */
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tone = "danger" | "warning" | "info";

interface ErrorBannerProps {
  tone?: Tone;
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
  className?: string;
}

const TONE_STYLES: Record<Tone, { bg: string; border: string; text: string; icon: typeof AlertTriangle }> = {
  danger: {
    bg: "bg-danger-soft",
    border: "border-rule",
    text: "text-danger",
    icon: AlertCircle,
  },
  warning: {
    bg: "bg-warning-soft",
    border: "border-rule",
    text: "text-warning",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-info-soft",
    border: "border-rule",
    text: "text-info",
    icon: Info,
  },
};

export function ErrorBanner({
  tone = "danger",
  title,
  description,
  retryLabel,
  onRetry,
  dismissLabel,
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  const styles = TONE_STYLES[tone];
  const Icon = styles.icon;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-md border ${styles.border} ${styles.bg} px-4 py-3 ${className}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.text}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${styles.text}`}>{title}</p>
        {description && (
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">{description}</p>
        )}
        {(retryLabel || dismissLabel) && (
          <div className="flex items-center gap-2 mt-2">
            {retryLabel && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
            {dismissLabel && onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                {dismissLabel}
              </Button>
            )}
          </div>
        )}
      </div>
      {onDismiss && !dismissLabel && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`flex-shrink-0 -mr-1 -mt-1 p-1 rounded hover:bg-paper-3 ${styles.text}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
