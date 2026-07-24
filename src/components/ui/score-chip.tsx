import { cn } from "@/lib/utils";
import { STATUS_OF_SCORE } from "@/components/tag/constants";

/**
 * ScoreChip — one primitive for rendering a 0-100 skill/interview score with
 * the canonical TAG bands: >=80 strong, 50-79 developing, <50 gap (see
 * tag/constants.ts::STATUS_OF_SCORE, the single source of truth). Every surface
 * that shows a score should render it through this chip so thresholds, colours,
 * and typography stay identical. Numerics use font-mono tabular-nums per the
 * density baseline.
 */

type ScoredBand = "strong" | "developing" | "gap";

const TONE: Record<ScoredBand, string> = {
  strong: "bg-success-soft text-success border-success/30",
  developing: "bg-gold-soft text-gold-ink border-gold-ink/25",
  gap: "bg-danger-soft text-danger border-danger/25",
};

const LABEL: Record<ScoredBand, string> = {
  strong: "Strong",
  developing: "Developing",
  gap: "Gap",
};

export interface ScoreChipProps {
  score: number | null | undefined;
  /** Append the band word (Strong / Developing / Gap) after the number. */
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ScoreChip({ score, showLabel = false, size = "md", className }: ScoreChipProps) {
  const sizing = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";

  if (score == null || Number.isNaN(score)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-sm border border-rule bg-paper-3 font-mono tabular-nums text-muted",
          sizing,
          className,
        )}
        aria-label="not assessed"
      >
        {showLabel ? "Not assessed" : "—"}
      </span>
    );
  }

  const rounded = Math.round(score);
  // Band the displayed (rounded) value so colour and number never disagree.
  const band = STATUS_OF_SCORE(rounded) as ScoredBand;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border font-mono tabular-nums",
        TONE[band],
        sizing,
        className,
      )}
      aria-label={`score ${rounded}, ${LABEL[band]}`}
    >
      {rounded}
      {showLabel ? <span className="font-sans font-medium">{LABEL[band]}</span> : null}
    </span>
  );
}
