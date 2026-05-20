/**
 * SkillChipStrip — per-skill overlay for a cross-interview match row.
 *
 * Renders the gaps[] + transferable_strengths[] payload the matcher endpoint
 * already returns. Each gap chip shows skill label · expected/actual; tone
 * is derived from the actual-vs-expected delta. Core skills carry a thin
 * gold left border to mark their 2× weight in the score.
 *
 * Display-only. The parent row owns navigation + the per-row expand state;
 * this component just renders chips.
 */
import { cn } from "@/lib/utils";
import type { MatcherGap, MatcherTransferable } from "@/types/analytics";

interface SkillChipStripProps {
  gaps: MatcherGap[];
  transferable: MatcherTransferable[];
  expanded?: boolean;
  visibleCount?: number;
  onExpand?: () => void;
  className?: string;
}

type Tone = "success" | "warning" | "danger";

function gapTone(actual: number, expected: number | null | undefined): Tone {
  if (expected == null) {
    if (actual >= 65) return "success";
    if (actual >= 55) return "warning";
    return "danger";
  }
  if (actual >= expected) return "success";
  if (actual >= expected - 10) return "warning";
  return "danger";
}

const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function SkillChipStrip({
  gaps,
  transferable,
  expanded = false,
  visibleCount = 6,
  onExpand,
  className,
}: SkillChipStripProps) {
  if (gaps.length === 0 && transferable.length === 0) return null;

  const totalChips = gaps.length + Math.min(transferable.length, 3);
  const overflow = !expanded && totalChips > visibleCount;
  const gapBudget = expanded ? gaps.length : Math.min(gaps.length, visibleCount);
  const visibleGaps = gaps.slice(0, gapBudget);
  const transferableBudget = expanded
    ? transferable.length
    : Math.max(0, Math.min(3, visibleCount - gapBudget));
  const visibleTransferable = transferable.slice(0, transferableBudget);
  const hiddenCount = totalChips - (visibleGaps.length + visibleTransferable.length);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleGaps.map((g) => {
        const tone = gapTone(g.actual, g.expected ?? null);
        return (
          <span
            key={`g-${g.skill_id}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] leading-none",
              TONE_CHIP[tone],
              g.is_core && "border-l-2 border-gold pl-1.5",
            )}
            title={g.label ?? g.skill_id}
          >
            <span className="truncate max-w-[180px]">{g.label ?? g.skill_id}</span>
            <span className="font-mono tabular-nums opacity-80">
              {g.expected != null && (
                <>
                  <span>{g.expected}</span>
                  <span className="opacity-60">·</span>
                </>
              )}
              {g.actual}
            </span>
          </span>
        );
      })}

      {visibleTransferable.length > 0 && (
        <>
          {visibleGaps.length > 0 && (
            <span aria-hidden className="h-3 w-px bg-rule mx-0.5" />
          )}
          {visibleTransferable.map((t) => (
            <span
              key={`t-${t.skill_id}`}
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] leading-none border border-rule text-ink-soft"
              title={t.label ?? t.skill_id}
            >
              <span className="text-muted">+</span>
              <span className="truncate max-w-[160px]">{t.label ?? t.skill_id}</span>
              <span className="font-mono tabular-nums opacity-80">{t.score}</span>
            </span>
          ))}
        </>
      )}

      {overflow && hiddenCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          className="text-[11px] text-muted hover:text-ink underline underline-offset-2 px-1 py-1"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}
