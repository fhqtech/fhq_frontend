/**
 * SkillHeatmap — top skill gaps across the project's completed sessions.
 *
 * v1 ships as a sorted list of skills with avg-score + gap-rate badges
 * rather than a literal 2D heatmap. The 2D version waits until we have
 * a denser dataset to make it readable.
 *
 * The endpoint already sorts by gap_rate desc, so we just render the
 * top 10 here and link out to a future drill-down.
 */
import { useEffect, useState } from "react";
import { TrendingDown, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { analyticsApi } from "@/services/analyticsApi";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { SkillGapsResponse } from "@/types/analytics";

interface SkillHeatmapProps {
  className?: string;
  /** Live revision bump from the dashboard's SSE pipe — re-fetch on bump. */
  refreshKey?: number;
}

export function SkillHeatmap({ className, refreshKey }: SkillHeatmapProps) {
  const { currentWorkspace, currentProject } = useWorkspace();
  const [data, setData] = useState<SkillGapsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id || !currentProject?.id) return;
    let cancelled = false;
    setLoading(true);
    analyticsApi
      .getSkillGaps(currentWorkspace.id, currentProject.id)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id, currentProject?.id, refreshKey]);

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-ink flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-gold-ink" />
          Top skill gaps
        </CardTitle>
        <CardDescription className="text-xs text-muted">
          Skills where candidates score below 65, ranked by frequency. Aggregate across all completed interviews in this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && !data ? (
          <p className="text-xs text-muted py-6 text-center">Loading skill gaps…</p>
        ) : !data || data.skills.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-5 w-5 text-muted" />
            <p className="text-xs text-muted">
              No completed interviews yet. Once candidates finish, the recurring weak spots show up here.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted mb-3">
              Across {data.candidate_count} completed candidate
              {data.candidate_count === 1 ? "" : "s"}.
            </p>
            <ul className="divide-y divide-rule">
              {data.skills.slice(0, 10).map((row) => {
                const gapPct = Math.round(row.gap_rate * 100);
                return (
                  <li
                    key={row.skill_id}
                    className="py-2 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink truncate">{row.label}</div>
                      <div className="text-[11px] text-muted">
                        {row.candidates} candidate{row.candidates === 1 ? "" : "s"}
                        {" · "}
                        avg <span className="font-mono tabular-nums">{Math.round(row.avg_score)}</span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-xs font-mono tabular-nums px-2 py-0.5 rounded shrink-0",
                        gapPct >= 50
                          ? "bg-danger-soft text-danger"
                          : gapPct >= 25
                          ? "bg-gold-soft text-gold-ink"
                          : "bg-paper-3 text-muted",
                      )}
                    >
                      {gapPct}% gap
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
