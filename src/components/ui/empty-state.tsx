/**
 * EmptyState — single primitive for "no data yet" surfaces.
 *
 * Replaces ad-hoc empty-state JSX across the app (designer review noted
 * 9 distinct treatments). Pass an icon (lucide component), title, optional
 * description, and 0-2 actions. Surface and tone are deliberately quiet —
 * empty isn't an error.
 */
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "gold" | "default" | "outline" | "ghost";
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-14 rounded-md border border-rule bg-paper-2 ${className}`}
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
    </div>
  );
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: "gold" | "default" | "outline" | "ghost";
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
