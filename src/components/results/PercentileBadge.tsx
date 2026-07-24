/**
 * PercentileBadge — where does this candidate's AI interview score land against
 * the recruiter's other candidates of the same round? Honest by construction:
 * it benchmarks the candidate's own cohort row (ai_interview_score, the one
 * densely-populated comparable field), segments only by interview_type (no role/
 * level field exists), names that segment plainly, and renders NOTHING below
 * MIN_COHORT comparable peers rather than ranking against a handful. No
 * "verified/grounded" language — this is a relative position, not a grounding claim.
 */
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { scoreAnalyticsApi } from "@/services/scoreAnalyticsApi";
import { cohortPercentile, ordinal } from "@/lib/percentile";
import { cn } from "@/lib/utils";

const SEGMENT_LABEL: Record<string, string> = {
  preliminary: "screening",
  fitment: "fitment",
};

interface PercentileBadgeProps {
  candidateId?: string;
  interviewId?: string;
  className?: string;
}

export function PercentileBadge({ candidateId, interviewId, className }: PercentileBadgeProps) {
  const { data } = useQuery({
    queryKey: ["scores", "all"],
    queryFn: () => scoreAnalyticsApi.getAllScores(),
    staleTime: 30_000,
    enabled: Boolean(candidateId && interviewId),
  });

  if (!candidateId || !interviewId || !data) return null;

  const self = data.find((r) => r.candidate_id === candidateId && r.interview_id === interviewId);
  if (!self || self.ai_interview_score == null) return null;

  const type = self.interview_type;
  const cohort = data
    .filter(
      (r) =>
        r.interview_type === type &&
        !(r.candidate_id === candidateId && r.interview_id === interviewId),
    )
    .map((r) => r.ai_interview_score);

  const result = cohortPercentile(self.ai_interview_score, cohort);
  if (result.status !== "ok") return null; // too few peers to rank honestly

  const segment = SEGMENT_LABEL[type] ?? type;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-rule bg-paper px-3 py-1.5",
        className,
      )}
    >
      <BarChart3 className="h-4 w-4 shrink-0 text-gold-ink" aria-hidden />
      <div className="leading-tight">
        <p className="font-mono text-sm font-semibold tabular-nums text-ink">
          {ordinal(result.percentile)} percentile
        </p>
        <p className="text-[11px] text-muted">
          among your {result.n} {segment} candidate{result.n === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
