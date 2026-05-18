/**
 * LogoMark — typographic `f.` dot mark for FlowDot AI.
 *
 * Three variants:
 *   <LogoMark />                — default sm `f.` only
 *   <LogoMark size="md|lg" />   — larger
 *   <LogoMark withWordmark />   — `f. FlowDot AI` inline, for wider slots
 *
 * Uses Geist Mono (already loaded) + the gold-ink token for the dot.
 * Token-only colors — never hex literals.
 */
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface LogoMarkProps {
  size?: Size;
  withWordmark?: boolean;
  className?: string;
}

const MARK_SIZE: Record<Size, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

const WORDMARK_SIZE: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function LogoMark({
  size = "sm",
  withWordmark = false,
  className,
}: LogoMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <span
        className={cn(
          "font-mono text-ink leading-none tracking-tight",
          MARK_SIZE[size],
        )}
        aria-hidden={withWordmark ? true : undefined}
      >
        f<span className="text-gold-ink">.</span>
      </span>
      {withWordmark && (
        <span
          className={cn(
            "text-ink font-semibold tracking-tight",
            WORDMARK_SIZE[size],
          )}
        >
          FlowDot AI
        </span>
      )}
      {!withWordmark && <span className="sr-only">FlowDot AI</span>}
    </span>
  );
}
