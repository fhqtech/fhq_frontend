/**
 * RoleCohortGap — where the whole cohort stands against the role's authored
 * target. Consumes the server-side rollup (recruiterJourneysApi.cohortGap), which
 * already excludes candidates with no fused evidence, so this surface never
 * fabricates "everyone fails every skill". Honest states:
 *   - no target authored  -> prompt to set one (no fetch)
 *   - no assessed evidence -> "appears once candidates complete a scored stage"
 *   - otherwise           -> worst-first skills with an honest assessed denominator
 * Under reviewer v1 these are model assessments, so the card carries an
 * UnverifiedMark and never claims "verified/grounded".
 */
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { recruiterJourneysApi } from "@/services/recruiterJourneysApi";
import { UnverifiedMark } from "@/components/tag/UnverifiedMark";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Band = "gap" | "developing" | "strong";
const band = (avgGap: number): Band => (avgGap >= 30 ? "gap" : avgGap > 0 ? "developing" : "strong");
const CHIP: Record<Band, string> = {
  gap: "bg-danger-soft text-danger",
  developing: "bg-warning-soft text-warning",
  strong: "bg-success-soft text-success",
};
const BAR: Record<Band, string> = { gap: "bg-danger", developing: "bg-warning", strong: "bg-success" };

export interface RoleCohortGapProps {
  ws: string;
  programId: string;
  hasTarget: boolean;
}

export function RoleCohortGap({ ws, programId, hasTarget }: RoleCohortGapProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["cohort-gap", ws, programId],
    queryFn: () => recruiterJourneysApi.cohortGap(ws, programId),
    enabled: hasTarget,
    staleTime: 30_000,
  });

  if (!hasTarget) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Set a skill target"
        description="Set a skill target for this role to see where the cohort stands against it."
      />
    );
  }

  if (isPending) {
    return (
      <div className="rounded-lg border border-rule bg-paper p-5">
        <p className="text-sm text-muted">Loading cohort gap…</p>
      </div>
    );
  }

  if (isError || !data || data.cohort.with_evidence === 0 || data.skills.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No cohort gap yet"
        description="The cohort gap appears once candidates complete a scored stage."
      />
    );
  }

  return (
    <section aria-label="Cohort gap" className="rounded-lg border border-rule bg-paper p-5">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Cohort gap</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink tabular-nums">
            {data.summary.skills_total} skill{data.summary.skills_total === 1 ? "" : "s"} tracked
          </h3>
        </div>
        <div className="text-right">
          <p className="font-mono tabular-nums text-sm text-ink-soft">
            {data.cohort.with_evidence} of {data.cohort.enrolled} candidates assessed
          </p>
          {data.cohort.without_evidence > 0 ? (
            <p className="text-[11px] text-muted">
              {data.cohort.without_evidence} have no evidence yet
            </p>
          ) : null}
        </div>
      </header>

      <ul className="mt-4 space-y-3">
        {data.skills.map((s) => {
          const b = band(s.avg_gap);
          const pct = Math.max(0, Math.min(100, s.avg_demonstrated));
          return (
            <li key={s.canonical_id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-ink">{s.skill_name}</span>
                <span className="font-mono tabular-nums text-xs text-muted">
                  {s.met_count}/{s.contributors} meet {s.target}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums",
                    CHIP[b],
                  )}
                >
                  avg gap {Math.round(s.avg_gap)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-paper-3">
                <div className={cn("h-full rounded-full", BAR[b])} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <UnverifiedMark
        className="mt-4"
        reason="Model assessments from the interviews, not independently verified."
      />
    </section>
  );
}
