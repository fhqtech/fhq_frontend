/**
 * PipelineFunnel — invited → started → completed → strong match.
 *
 * Bar funnel using neutral palette + gold accent on the strong-match
 * stage. Each stage shows count and a percentage of the previous stage,
 * which is the recruiter's "is my pipeline narrowing too fast?" answer.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardFunnel } from "@/types/analytics";

interface PipelineFunnelProps {
  funnel: DashboardFunnel;
  className?: string;
}

const STAGES: Array<{
  key: keyof DashboardFunnel;
  label: string;
  description: string;
  accent?: boolean;
}> = [
  { key: "invited", label: "Invited", description: "Emails sent" },
  { key: "started", label: "Started", description: "Logged into interview" },
  { key: "completed", label: "Completed", description: "Finished all turns" },
  { key: "strong_match", label: "Strong match", description: "Score ≥ 80", accent: true },
];

const pct = (numerator: number, denominator: number): string => {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
};

export function PipelineFunnel({ funnel, className }: PipelineFunnelProps) {
  const maxValue = Math.max(funnel.invited, 1); // avoid /0 in width math

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-ink">Pipeline</CardTitle>
        <CardDescription className="text-xs text-muted">
          Where candidates are right now, across all interviews in this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {STAGES.map((stage, idx) => {
          const value = funnel[stage.key];
          const widthPct = Math.max(4, Math.round((value / maxValue) * 100));
          const previous = idx > 0 ? funnel[STAGES[idx - 1].key] : null;
          const conversion = previous !== null ? pct(value, previous) : null;
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-ink">
                  {stage.label}
                </span>
                <span className="font-mono tabular-nums text-ink-soft">
                  {value}
                  {conversion && (
                    <span className="text-muted ml-2">↳ {conversion}</span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded bg-paper-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    stage.accent ? "bg-gold-ink" : "bg-ink",
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted">{stage.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
