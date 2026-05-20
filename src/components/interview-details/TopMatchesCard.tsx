/**
 * TopMatchesCard — surfaces candidates from OTHER interviews in the
 * workspace who'd be a good fit for THIS role's rubric. Phase C-matcher.
 *
 * Lives on the interview-details page below the candidate-sources panel.
 * Visible once the interview has a completed blueprint (the matcher
 * needs the blueprint's skill vector to score against).
 *
 * Click a candidate → opens their TAG (interview results page).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { analyticsApi } from "@/services/analyticsApi";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { MatcherResponse } from "@/types/analytics";
import { SkillChipStrip } from "@/components/skill-matcher/SkillChipStrip";

interface TopMatchesCardProps {
  interviewId: string;
  blueprintReady: boolean;
  className?: string;
}

const initials = (name?: string | null): string => {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("") || "?"
  );
};

const colorForMatch = (score: number): string => {
  if (score >= 75) return "bg-success-soft text-success";
  if (score >= 55) return "bg-gold-soft text-gold-ink";
  return "bg-paper-3 text-muted";
};

export function TopMatchesCard({ interviewId, blueprintReady, className }: TopMatchesCardProps) {
  const { currentWorkspace, currentProject } = useWorkspace();
  const navigate = useNavigate();
  const [data, setData] = useState<MatcherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (!blueprintReady) return;
    if (!currentWorkspace?.id || !currentProject?.id || !interviewId) return;
    let cancelled = false;
    setLoading(true);
    analyticsApi
      .getSkillMatches(currentWorkspace.id, currentProject.id, {
        roleInterviewId: interviewId,
        topN: 10,
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [blueprintReady, currentWorkspace?.id, currentProject?.id, interviewId]);

  if (!blueprintReady) return null;

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base text-ink flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-ink" />
            Cross-interview matches
          </CardTitle>
          <CardDescription className="text-xs text-muted">
            Candidates who interviewed for other roles in this workspace and look like a fit for this one.
          </CardDescription>
        </div>
        {data && data.matches.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" /> Show top 3
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" /> Show all {data.matches.length}
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading && !data ? (
          <p className="text-xs text-muted py-6 text-center">Finding matches…</p>
        ) : !data || data.matches.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-4 w-4 text-muted" />
            <p className="text-xs text-muted">
              No completed sessions in other interviews to match against yet.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted mb-3">
              Scored {data.total_candidates_considered} candidate
              {data.total_candidates_considered === 1 ? "" : "s"} against
              {" "}
              <span className="font-mono">{data.role.skill_count}</span> skills
              {data.role.core_skill_count > 0 && (
                <>
                  {" "}
                  (<span className="font-mono">{data.role.core_skill_count}</span> core, weighted 2×)
                </>
              )}
              .
            </p>
            <ul className="divide-y divide-rule">
              {(expanded ? data.matches : data.matches.slice(0, 3)).map((m) => (
                <li
                  key={m.session_id}
                  className="py-3 cursor-pointer hover:bg-paper-2 -mx-2 px-2 rounded"
                  onClick={() =>
                    navigate(
                      `/interview/${m.source_interview_id}/results/${m.session_id}`,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-paper-3 grid place-items-center text-[11px] font-mono font-semibold text-ink shrink-0">
                      {initials(m.candidate_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">
                        {m.candidate_name || m.candidate_email || "Unnamed candidate"}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        from {m.source_interview_title || m.source_interview_id}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-xs font-mono tabular-nums font-semibold px-2 py-0.5 rounded shrink-0",
                        colorForMatch(m.match_score),
                      )}
                    >
                      {Math.round(m.match_score)}%
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                  </div>
                  <SkillChipStrip
                    gaps={m.gaps}
                    transferable={m.transferable_strengths}
                    expanded={expandedRow === m.session_id}
                    visibleCount={5}
                    onExpand={() => setExpandedRow(m.session_id)}
                    className="mt-2 ml-11"
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
