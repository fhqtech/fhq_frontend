/**
 * HeroKPI — large bento tile for the dashboard's headline metric.
 *
 * Renders a big animated counter + label + body copy. Uses bento
 * footprint (cols=8 rows=2 on the BentoGrid). transform + opacity only.
 */
import type { Icon } from "phosphor-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface HeroKPIProps {
  kicker: string;
  label: string;
  value: number;
  unit?: string;
  body?: string;
  icon?: Icon;
  className?: string;
}

export function HeroKPI({
  kicker,
  label,
  value,
  unit,
  body,
  icon: Icon,
  className,
}: HeroKPIProps) {
  return (
    <div
      className={cn(
        "h-full p-6 md:p-8 rounded-lg border border-rule bg-paper shadow-1 flex flex-col justify-between transition-[box-shadow,transform] duration-150 ease-out hover:shadow-2 animate-in fade-in slide-in-from-bottom-2 duration-500",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">
            {kicker}
          </p>
          <p className="text-sm text-ink-soft">{label}</p>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-md bg-paper-2 border border-rule grid place-items-center shrink-0">
            <Icon className="w-5 h-5 text-gold-ink" />
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl md:text-6xl font-semibold text-ink tracking-tight font-mono tabular-nums">
            <AnimatedCounter value={value} duration={800} />
          </span>
          {unit && <span className="text-2xl text-muted font-mono">{unit}</span>}
        </div>
        {body && <p className="text-sm text-muted mt-3 max-w-md">{body}</p>}
      </div>
    </div>
  );
}
