import { Icon } from "phosphor-react";
import { cn } from "@/lib/utils";

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
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  variant = "default",
  className 
}: StatsCardProps) {
  const variantStyles = {
    default: "bg-surface border-border",
    primary: "bg-gradient-primary border-brand-primary/20 text-white",
    success: "bg-gradient-success border-success/20 text-white", 
    warning: "bg-warning-light border-warning/20"
  };

  const iconStyles = {
    default: "text-foreground-muted",
    primary: "text-white/80",
    success: "text-white/80",
    warning: "text-warning"
  };

  return (
    <div className={cn(
      "p-6 rounded-lg border transition-all hover:shadow-md",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-foreground-muted" : "text-white/80"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-xl font-bold mt-2",
            variant === "default" ? "text-foreground" : "text-white"
          )}>
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-sm mt-2 flex items-center gap-1",
              variant === "default" 
                ? change.positive ? "text-success" : "text-error"
                : "text-white/80"
            )}>
              <span className={cn(
                "inline-block w-2 h-2 rounded-full",
                change.positive ? "bg-success" : "bg-error"
              )} />
              {change.value}
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          variant === "default" ? "bg-muted" : "bg-white/10"
        )}>
          <Icon className={cn("w-6 h-6", iconStyles[variant])} />
        </div>
      </div>
    </div>
  );
}