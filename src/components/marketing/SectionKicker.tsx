/**
 * SectionKicker — editorial eyebrow for marketing sections.
 *
 * The mono uppercase kicker is the ONLY ALL-CAPS pattern permitted in user-visible copy
 * (see DESIGN.md). Composes three optional editorial devices:
 *   - rule:  a thin gold hairline above the kicker, used on trust-bearing sections
 *   - sigil: a § NN marker pulled to the right, methodology-forward styling
 *   - tint:  swap between gold-ink (default) and muted for the dark closing CTA
 */
import { cn } from "@/lib/utils";

interface SectionKickerProps {
  label: string;
  sigil?: string;
  rule?: boolean;
  tint?: "gold" | "muted" | "paper";
  className?: string;
}

const TINT_CLASS: Record<NonNullable<SectionKickerProps["tint"]>, string> = {
  gold: "text-gold-ink",
  muted: "text-muted",
  paper: "text-gold",
};

export function SectionKicker({
  label,
  sigil,
  rule = false,
  tint = "gold",
  className,
}: SectionKickerProps) {
  return (
    <div className={cn("mb-4", className)}>
      {rule && (
        <div
          aria-hidden
          className="h-px w-12 bg-gold/40 mb-3"
        />
      )}
      <div className="flex items-baseline justify-between gap-4">
        <p
          className={cn(
            "font-mono uppercase tracking-[0.18em] text-[11px]",
            TINT_CLASS[tint]
          )}
        >
          {label}
        </p>
        {sigil && (
          <span className="font-mono text-[11px] text-muted tabular-nums shrink-0">
            {sigil}
          </span>
        )}
      </div>
    </div>
  );
}
