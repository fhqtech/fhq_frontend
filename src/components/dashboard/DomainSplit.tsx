/**
 * DomainSplit — stacked-bar breakdown of interviews by finance domain.
 *
 * Reads from the dashboard's interviews_rollup payload (no extra API
 * call). Each bar is one domain (Accounting / Taxation / Consulting);
 * segments are invited / completed counts. Helps the recruiter see
 * which area they're investing in.
 *
 * Click a bar -> filter the dashboard view to that domain (future
 * follow-up; v1 just renders).
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FINANCE_DOMAINS, FINANCE_DOMAIN_IDS, type FinanceDomainId } from "@/lib/financeTaxonomy";
import type { DashboardInterviewRollup } from "@/types/analytics";

interface DomainSplitProps {
  interviews: DashboardInterviewRollup[];
  className?: string;
}

interface DomainBucket {
  invited: number;
  completed: number;
  interviews: number;
}

export function DomainSplit({ interviews, className }: DomainSplitProps) {
  const { buckets, unclassified } = useMemo(() => {
    const empty: DomainBucket = { invited: 0, completed: 0, interviews: 0 };
    const b: Record<FinanceDomainId, DomainBucket> = {
      accounting: { ...empty },
      taxation: { ...empty },
      consulting: { ...empty },
    };
    let u: DomainBucket = { ...empty };
    for (const i of interviews) {
      const d = (i.finance_domain || "") as FinanceDomainId;
      const target = d && d in b ? b[d] : u;
      target.invited += i.invited;
      target.completed += i.completed;
      target.interviews += 1;
    }
    return { buckets: b, unclassified: u };
  }, [interviews]);

  const total = useMemo(() => {
    return (
      buckets.accounting.invited +
      buckets.taxation.invited +
      buckets.consulting.invited +
      unclassified.invited
    );
  }, [buckets, unclassified]);

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-ink">Domain split</CardTitle>
        <CardDescription className="text-xs text-muted">
          Invitations by finance domain across this project's interviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {total === 0 ? (
          <p className="text-xs text-muted py-6 text-center">
            No interviews tagged with a domain yet. Pick one on Step 0 when creating an interview.
          </p>
        ) : (
          <>
            {FINANCE_DOMAIN_IDS.map((id) => {
              const bucket = buckets[id];
              if (bucket.invited === 0 && bucket.interviews === 0) {
                return null;
              }
              const pct = total > 0 ? Math.max(2, Math.round((bucket.invited / total) * 100)) : 0;
              const completedPct =
                bucket.invited > 0
                  ? Math.round((bucket.completed / bucket.invited) * 100)
                  : 0;
              return (
                <div key={id} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-ink">
                      {FINANCE_DOMAINS[id].label}
                    </span>
                    <span className="font-mono tabular-nums text-ink-soft">
                      {bucket.invited}
                      <span className="text-muted ml-2">↳ {completedPct}% done</span>
                    </span>
                  </div>
                  <div className="h-2 rounded bg-paper-3 overflow-hidden flex">
                    <div
                      className="h-full bg-ink transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted">
                    {bucket.interviews} interview{bucket.interviews === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
            {unclassified.interviews > 0 && (
              <div className="space-y-1 pt-1 border-t border-rule">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-muted italic">
                    Unclassified
                  </span>
                  <span className="font-mono tabular-nums text-muted">
                    {unclassified.invited}
                  </span>
                </div>
                <p className="text-[11px] text-muted-2">
                  {unclassified.interviews} interview
                  {unclassified.interviews === 1 ? "" : "s"} without a domain.
                  Edit them to pick one.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
