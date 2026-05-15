/**
 * EmptyState — single primitive for "no data yet" surfaces.
 *
 * Replaces ad-hoc empty-state JSX across the app (designer review noted
 * 9 distinct treatments). Pass an icon (lucide component), title, optional
 * description, and 0-2 actions. Surface and tone are deliberately quiet —
 * empty isn't an error.
 *
 * F24.2 extensions:
 *   - sampleDataAction — Stripe/Notion pattern: "Try with sample data"
 *     button that loads pre-seeded data so the surface stops being dead
 *     space without forcing the user to write production data.
 *   - inlineCompose — slot for an inline form (3-field JD composer,
 *     paste-CSV box, etc.) that turns the empty state into the
 *     onboarding moment itself rather than a wall to click past.
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ActionVariant = "gold" | "default" | "outline" | "ghost";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: ActionVariant;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Stripe/Notion pattern: tertiary "Try with sample data" affordance. */
  sampleDataAction?: EmptyStateAction;
  /** Inline form slot — turns empty state into onboarding moment. */
  inlineCompose?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  sampleDataAction,
  inlineCompose,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-14 rounded-md border border-rule bg-paper-2 animate-in fade-in duration-300 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-md bg-paper border border-rule grid place-items-center mb-4 shadow-1">
          <Icon className="w-5 h-5 text-gold-ink" aria-hidden />
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted max-w-md leading-relaxed">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {primaryAction && (
            <ActionButton action={primaryAction} variant={primaryAction.variant ?? "gold"} />
          )}
          {secondaryAction && (
            <ActionButton action={secondaryAction} variant={secondaryAction.variant ?? "outline"} />
          )}
        </div>
      )}
      {sampleDataAction && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={sampleDataAction.onClick}
            className="text-muted hover:text-ink"
          >
            {sampleDataAction.label}
          </Button>
        </div>
      )}
      {inlineCompose && (
        <div className="mt-6 w-full max-w-lg text-left">{inlineCompose}</div>
      )}
    </div>
  );
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: ActionVariant;
}) {
  if (action.href) {
    return (
      <Button asChild variant={variant}>
        <a href={action.href}>{action.label}</a>
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

export default EmptyState;
