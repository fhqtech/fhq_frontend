/**
 * B3 — skill-gap summary card. Plain-language read of a candidate's fit against
 * the role: how many skills clear the bar, and which fall short (worst first,
 * each with its demonstrated level and — in target mode — the bar it missed).
 * Presentational over the normalized SkillGapSummaryData; no data fetching.
 */
import { cn } from "@/lib/utils";
import type { SkillGapSummaryData, SkillGapStatus } from "@/lib/skillGap";

const STATUS_STYLE: Record<SkillGapStatus, { chip: string; bar: string; label: string }> = {
  gap: { chip: "bg-danger-soft text-danger", bar: "bg-danger", label: "Gap" },
  developing: { chip: "bg-warning-soft text-warning", bar: "bg-warning", label: "Developing" },
  strong: { chip: "bg-success-soft text-success", bar: "bg-success", label: "Strong" },
};

export interface SkillGapSummaryProps {
  data: SkillGapSummaryData;
  className?: string;
}

export function SkillGapSummary({ data, className }: SkillGapSummaryProps) {
  const { total, met, gapItems, mode, avgGap } = data;

  return (
    <section
      aria-label="Skill gap"
      className={cn("rounded-lg border border-rule bg-paper p-5", className)}
    >
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Skill gap</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink tabular-nums">
            {met} of {total} skills meet the bar
          </h3>
        </div>
        {mode === "target" && typeof avgGap === "number" && (
          <div className="text-right">
            <p className="font-mono tabular-nums text-2xl font-semibold text-ink">
              {Math.round(avgGap)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted">avg points short</p>
          </div>
        )}
      </header>

      {gapItems.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Every assessed skill meets the bar for this role.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {gapItems.map((g) => {
            const style = STATUS_STYLE[g.status];
            const pct = Math.max(0, Math.min(100, g.score ?? 0));
            return (
              <li key={g.skillName} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-ink">{g.skillName}</span>
                  <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide", style.chip)}>
                    {style.label}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-paper-3">
                  <div
                    className={cn("h-full rounded-full transition-transform", style.bar)}
                    style={{ width: `${pct}%` }}
                  />
                  {mode === "target" && typeof g.target === "number" && (
                    <span
                      className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink"
                      style={{ left: `${Math.max(0, Math.min(100, g.target))}%` }}
                      aria-hidden
                    />
                  )}
                </div>
                <p className="font-mono tabular-nums text-[11px] text-muted">
                  {typeof g.score === "number" ? Math.round(g.score) : "—"}
                  {mode === "target" && typeof g.target === "number" ? ` / ${g.target} needed` : " / 100"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
