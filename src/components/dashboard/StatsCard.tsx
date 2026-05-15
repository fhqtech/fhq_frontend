import { Icon } from "phosphor-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  icon: Icon;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
  /** F24.5: stagger index — adds an `animation-delay` class so
   *  multiple cards mount in sequence rather than all at once. */
  index?: number;
}

// Per-index stagger delay (Tailwind-emitted classes). Caps at 4 cards;
// after that the stagger looks unnatural so we just snap.
const DELAY_CLASSES = [
  "[animation-delay:0ms]",
  "[animation-delay:80ms]",
  "[animation-delay:160ms]",
  "[animation-delay:240ms]",
];

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  variant = "default",
  className,
  index = 0,
}: StatsCardProps) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const isCountable = Number.isFinite(numericValue);
  const delayClass = DELAY_CLASSES[Math.min(index, DELAY_CLASSES.length - 1)];
  const variantStyles = {
    default: "bg-surface border-border",
    primary: "bg-ink border-ink/20 text-paper",
    success: "bg-gradient-success border-success/20 text-paper", 
    warning: "bg-warning-light border-warning/20"
  };

  const iconStyles = {
    default: "text-muted",
    primary: "text-paper/80",
    success: "text-paper/80",
    warning: "text-warning"
  };

  return (
    <div className={cn(
      // F24.1: tactile press + lift + mount fade.
      // F24.5: stagger via per-index animation-delay class.
      "p-6 rounded-lg border transition-[box-shadow,transform] duration-150 ease-out hover:shadow-2 hover:-translate-y-0.5 active:translate-y-0 active:shadow-1 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
      delayClass,
      variantStyles[variant],
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted" : "text-paper/80"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-xl font-bold mt-2",
            variant === "default" ? "text-foreground" : "text-paper"
          )}>
            {isCountable ? <AnimatedCounter value={numericValue} duration={650} /> : value}
          </p>
          {change && (
            <p className={cn(
              "text-sm mt-2 flex items-center gap-1",
              variant === "default" 
                ? change.positive ? "text-success" : "text-danger"
                : "text-paper/80"
            )}>
              <span className={cn(
                "inline-block w-2 h-2 rounded-full",
                change.positive ? "bg-success" : "bg-danger"
              )} />
              {change.value}
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          variant === "default" ? "bg-muted" : "bg-paper/10"
        )}>
          <Icon className={cn("w-6 h-6", iconStyles[variant])} />
        </div>
      </div>
    </div>
  );
}