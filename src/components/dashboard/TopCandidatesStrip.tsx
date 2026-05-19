/**
 * TopCandidatesStrip — horizontal list of the highest-scoring candidates
 * across all completed interviews in this project. Click → results page.
 */
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { DashboardTopCandidate } from "@/types/analytics";

interface TopCandidatesStripProps {
  candidates: DashboardTopCandidate[];
  className?: string;
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  STRONG_HIRE: "bg-success-soft text-success",
  ADVANCE_WITH_CONCERNS: "bg-gold-soft text-gold-ink",
  BORDERLINE: "bg-paper-3 text-ink-soft",
  REJECT: "bg-danger-soft text-danger",
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  STRONG_HIRE: "Strong hire",
  ADVANCE_WITH_CONCERNS: "Advance with concerns",
  BORDERLINE: "Borderline",
  REJECT: "Reject",
};

const initials = (name?: string | null) => {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("") || "?";
};

export function TopCandidatesStrip({ candidates, className }: TopCandidatesStripProps) {
  const navigate = useNavigate();

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-ink">Top candidates</CardTitle>
          <CardDescription className="text-xs text-muted">
            Highest scoring across all completed interviews.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {candidates.length === 0 ? (
          <EmptyState
            title="No completed interviews yet"
            description="Once candidates finish their interviews, the top performers show up here."
            icon={Users}
          />
        ) : (
          <ul className="divide-y divide-rule">
            {candidates.map((c) => (
              <li
                key={c.session_id}
                className="py-2.5 flex items-center gap-3 cursor-pointer hover:bg-paper-2 -mx-2 px-2 rounded"
                onClick={() =>
                  navigate(`/interview/${c.interview_id}/results/${c.session_id}`)
                }
              >
                <div className="h-8 w-8 rounded-full bg-paper-3 grid place-items-center text-[11px] font-mono font-semibold text-ink shrink-0">
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {c.name || c.email || "Unnamed candidate"}
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {c.interview_title || c.interview_id}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono tabular-nums font-semibold text-ink">
                    {c.overall_score ?? "—"}
                  </div>
                  {c.recommendation && (
                    <span
                      className={cn(
                        "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5",
                        RECOMMENDATION_STYLES[c.recommendation] || "bg-paper-3 text-muted",
                      )}
                    >
                      {RECOMMENDATION_LABELS[c.recommendation] || c.recommendation}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
