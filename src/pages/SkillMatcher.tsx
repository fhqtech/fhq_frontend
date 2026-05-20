/**
 * /skill-matcher — standalone page for the cross-interview matcher.
 *
 * Pick any interview (role) in the current project; we show the top 10
 * candidates from OTHER interviews ranked by how well they fit this
 * role's blueprint. Useful when a recruiter wants to browse "who else
 * in my workspace could fill this seat" without going through the
 * interview-details page.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useInterviewsQuery } from "@/queries/interviewsQueries";
import { analyticsApi } from "@/services/analyticsApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MatcherResponse } from "@/types/analytics";
import { SkillChipStrip } from "@/components/skill-matcher/SkillChipStrip";

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

export default function SkillMatcher() {
  const { currentWorkspace, currentProject } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const interviewsQuery = useInterviewsQuery(currentWorkspace?.id, currentProject?.id, { limit: 100 });
  const interviews = interviewsQuery.data?.interviews ?? [];

  const [selectedInterviewId, setSelectedInterviewId] = useState<string>(
    () => searchParams.get("role") || "",
  );

  // Default to the most recent active/completed interview once loaded.
  useEffect(() => {
    if (selectedInterviewId) return;
    if (interviews.length === 0) return;
    const first = interviews.find((i) => i.status !== "draft") || interviews[0];
    if (first) {
      setSelectedInterviewId(first.id);
    }
  }, [interviews, selectedInterviewId]);

  // Reflect selection in URL so deep links work.
  useEffect(() => {
    if (!selectedInterviewId) return;
    if (searchParams.get("role") === selectedInterviewId) return;
    const next = new URLSearchParams(searchParams);
    next.set("role", selectedInterviewId);
    setSearchParams(next, { replace: true });
  }, [selectedInterviewId, searchParams, setSearchParams]);

  const [data, setData] = useState<MatcherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id || !currentProject?.id || !selectedInterviewId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    analyticsApi
      .getSkillMatches(currentWorkspace.id, currentProject.id, {
        roleInterviewId: selectedInterviewId,
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
  }, [currentWorkspace?.id, currentProject?.id, selectedInterviewId]);

  const sortedInterviews = useMemo(
    () =>
      [...interviews].sort((a, b) => {
        const ta = new Date(a.created ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.created ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      }),
    [interviews],
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">
          Skill matcher
        </p>
        <h1 className="text-2xl font-semibold text-ink">Find candidates for a role</h1>
        <p className="text-sm text-muted mt-1 max-w-xl">
          Pick any interview in this project. We'll score every candidate
          from your other interviews against its blueprint and rank the
          best fits.
        </p>
      </div>

      <Card className="p-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-ink">Role</CardTitle>
          <CardDescription className="text-xs text-muted">
            Choose the interview whose blueprint defines the role you're hiring for.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={selectedInterviewId} onValueChange={setSelectedInterviewId}>
            <SelectTrigger className="bg-paper" style={{ boxShadow: "var(--shadow-1)" }}>
              <SelectValue placeholder="Pick a role" />
            </SelectTrigger>
            <SelectContent>
              {sortedInterviews.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted">
                  No interviews in this project yet.
                </div>
              ) : (
                sortedInterviews.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {(i.title || "(untitled)") + (i.status ? ` · ${i.status}` : "")}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-ink flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-ink" />
            Top matches
          </CardTitle>
          {data && (
            <CardDescription className="text-xs text-muted">
              Scored {data.total_candidates_considered} candidate
              {data.total_candidates_considered === 1 ? "" : "s"} against
              {" "}
              <span className="font-mono">{data.role.skill_count}</span> skills
              {data.role.core_skill_count > 0 && (
                <>
                  {" "}(<span className="font-mono">{data.role.core_skill_count}</span> core)
                </>
              )}
              .
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-xs text-muted py-8 text-center">Scoring candidates…</p>
          ) : !data ? (
            <p className="text-xs text-muted py-8 text-center">Pick a role above.</p>
          ) : data.matches.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-4 w-4 text-muted" />
              <p className="text-xs text-muted">
                No completed sessions in other interviews to match against yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-rule">
              {data.matches.map((m) => (
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
                    <div className="h-9 w-9 rounded-full bg-paper-3 grid place-items-center text-xs font-mono font-semibold text-ink shrink-0">
                      {initials(m.candidate_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">
                        {m.candidate_name || m.candidate_email || "Unnamed candidate"}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        from {m.source_interview_title || m.source_interview_id}
                        {m.overall_score != null && (
                          <>
                            {" · "}
                            overall <span className="font-mono">{m.overall_score}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-mono tabular-nums font-semibold px-2.5 py-1 rounded shrink-0",
                        colorForMatch(m.match_score),
                      )}
                    >
                      {Math.round(m.match_score)}%
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted shrink-0" />
                  </div>
                  <SkillChipStrip
                    gaps={m.gaps}
                    transferable={m.transferable_strengths}
                    expanded={expandedRow === m.session_id}
                    visibleCount={10}
                    onExpand={() => setExpandedRow(m.session_id)}
                    className="mt-2 ml-12"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
