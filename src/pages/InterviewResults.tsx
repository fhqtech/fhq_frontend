import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TranscriptViewer } from "@/components/interview/TranscriptViewer";
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb, Sparkles, TrendingDown, MessageSquareQuote, ArrowLeft, Clock, RefreshCw, Maximize2 } from "lucide-react";
import { RatingPanel } from "@/components/interview/RatingPanel";
import { Spinner } from "@/components/ui/spinner";
import { useFlag } from "@/lib/flags/FlagProvider";
import { useOperationEta } from "@/queries/useOperationEta";
import { etaPhrase } from "@/lib/eta";
import { useAuth } from "@/contexts/AuthContext";
import { TalentAnalysisGraph, type TagGraphNode } from "@/components/tag/TalentAnalysisGraph";
import { FusedSkillProfile } from "@/components/assessment/FusedSkillProfile";
import { TransferableBand } from "@/components/trust/TransferableBand";
import { IntegrityNote } from "@/components/trust/IntegrityNote";
import { integrityApi } from "@/services/integrityApi";
import type { IntegrityFlag } from "@/lib/integrity";
import { StageResults } from "@/components/results/StageResults";
import { tagFromResult } from "@/components/tag/adapters";
import { SkillGapSummary } from "@/components/tag/SkillGapSummary";
import { summarizeFromNodes } from "@/lib/skillGap";
import { TagViewModal } from "@/components/views/TagViewModal";
import { track, Events } from "@/lib/analytics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSessionResultsQuery,
  useResultsStatusQuery,
  useReanalyzeMutation,
  ResultsPendingError,
  SESSION_RESULTS_POLL_MAX,
} from "@/queries/resultsQueries";
import type { InterviewResultsData } from "@/types/interviewResults";

// --- LEGACY INTERFACE for backward compatibility ---
interface Competency {
  skill: string;
  score: number;
  strength: string;
  weakness: string;
  evaluation?: string;
}

interface EvaluationData {
  overall_summary: string;
  competencies: Competency[];
  hireability_recommendation: string;
  suggested_next_steps: string[];
}

// Transform Interview Reviewer Agent output to legacy format for existing UI
function transformToLegacyFormat(data: InterviewResultsData): EvaluationData {
  // Safely handle skill_scores array
  const skillScores = data.skill_scores || [];

  const competencies: Competency[] = skillScores.map(skill => {
    const evidence = skill.evidence || [];
    const gaps = skill.gaps || [];

    return {
      skill: skill.skill_name || 'Unknown Skill',
      score: skill.score || 0,
      strength: evidence.length > 0 ? evidence[0] : 'No evidence provided',
      weakness: gaps.length > 0 ? gaps[0] : 'No gaps identified',
      evaluation: evidence.join('. ') || 'No detailed evaluation available'
    };
  });

  // Map recommendation to human-readable format
  const recommendationMap: Record<string, string> = {
    'STRONG_HIRE': 'Strongly Recommend - Excellent fit for the role',
    'ADVANCE_WITH_CONCERNS': 'Recommend with Reservations - Strong skills but needs development in some areas',
    'BORDERLINE': 'Borderline - Requires deeper review before decision',
    'REJECT': 'Not Recommended - Significant gaps in required skills'
  };

  // Safely handle strengths and development_areas arrays
  const strengths = data.strengths || [];
  const developmentAreas = data.development_areas || [];

  return {
    overall_summary: data.summary || 'No summary available',
    competencies,
    hireability_recommendation: recommendationMap[data.recommendation] || data.recommendation || 'Pending Review',
    suggested_next_steps: [
      ...strengths.slice(0, 2).map(s => `Strength: ${s}`),
      ...developmentAreas.slice(0, 3).map(d => `Development: ${d}`)
    ]
  };
}

export default function InterviewResults() {
  const { interviewId, sessionId } = useParams();
  const navigate = useNavigate();
  // AuthContextType has no getIdToken. Rest of the codebase reads the
  // JWT straight from localStorage. Drop the bogus destructure.
  useAuth();

  const [showTagModal, setShowTagModal] = useState(false);

  // Scroll to top immediately when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const resultsQuery = useSessionResultsQuery(sessionId);
  const rawResults = resultsQuery.data ?? null;
  const retryCount = resultsQuery.errorUpdateCount;
  const isResultsPending = resultsQuery.error instanceof ResultsPendingError;
  const realError =
    resultsQuery.error && !isResultsPending
      ? (resultsQuery.error instanceof Error ? resultsQuery.error.message : "Failed to load results")
      : null;
  const error = !sessionId ? "No session ID provided" : realError;
  // Single waiting state: covers both first fetch (TQ retrying internally) and
  // exhausted-retries (ResultsPendingError surfaces). One screen for the whole
  // ~60s polling window — user always sees the retry counter + Check Now CTA.
  const isWaiting = (resultsQuery.isPending || isResultsPending) && Boolean(sessionId);
  // P1-1: server-sourced ETA for the reviewer wait, behind async_progress.
  const asyncProgressFlag = useFlag("async_progress");
  // P5-3: consolidated stage-results surface (default-off -> legacy body below).
  const stageResultsFlag = useFlag("stage_results");
  const reviewerEta = useOperationEta("reviewer", isWaiting && asyncProgressFlag);
  const evaluation = useMemo(
    () => (rawResults ? transformToLegacyFormat(rawResults) : null),
    [rawResults],
  );
  // B3: zero-setup skill-gap summary derived from the TAG's own status buckets.
  // Renders only when the result carries scored skill nodes; null otherwise.
  const gapSummary = useMemo(() => {
    const nodes = (rawResults as any)?.graph_data?.nodes;
    if (!nodes || nodes.length === 0) return null;
    return summarizeFromNodes(tagFromResult(rawResults as any, (rawResults as any).role || "Role").nodes);
  }, [rawResults]);

  // Scroll to top when results land (replaces the old setTimeout cluster).
  useEffect(() => {
    if (rawResults) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [rawResults]);

  useEffect(() => {
    if (sessionId) {
      track(Events.interview.resultsViewed, { session_id: sessionId });
    }
  }, [sessionId]);

  const queryClient = useQueryClient();
  const handleRetry = () => {
    // Reset the cumulative errorUpdateCount so the polling window restarts
    // clean; otherwise we'd sit at the terminal state and refetch() alone
    // can't drop the counter back to 0.
    queryClient.resetQueries({ queryKey: ["results", "session", sessionId] });
  };

  // F30.3/F30.4: after the polling exhausts (errorUpdateCount >= cap while
  // still in pending state), peek at /api/results/status/{sid} to learn
  // whether the reviewer crashed (reviewer_failure present) vs results truly
  // still being generated (no failure recorded). Drives terminal-state copy.
  const pollingExhausted = isResultsPending && retryCount >= SESSION_RESULTS_POLL_MAX;
  const statusQuery = useResultsStatusQuery(sessionId, pollingExhausted);
  const reviewerFailure = statusQuery.data?.reviewer_failure ?? null;
  const reanalyze = useReanalyzeMutation();

  const handleReanalyze = async () => {
    if (!sessionId) return;
    try {
      await reanalyze.mutateAsync(sessionId);
    } catch (e) {
      // Mutation surfaces error via reanalyze.error; UI shows it below.
    }
  };

  const handleBackToInterview = () => {
    if (interviewId) {
      navigate(`/interviews/${interviewId}`);
    } else {
      navigate("/interviews/manage");
    }
  };

  if (isWaiting) {
    const hasAttempted = retryCount > 0;

    // Terminal state: polling exhausted. Show diagnostic copy + recovery.
    if (pollingExhausted) {
      const isReanalyzePending = reanalyze.isPending;
      const reanalyzeError = reanalyze.error instanceof Error ? reanalyze.error.message : null;

      return (
        <div className="min-h-dvh flex flex-col bg-paper-2">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-center w-14 h-14 rounded-full bg-warning-soft">
              <AlertCircle className="w-7 h-7 text-warning" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-ink mb-3">
              We couldn't load the results
            </h1>

            <p className="text-base text-ink-soft mb-6 leading-relaxed">
              {reviewerFailure
                ? "The interview was completed, but the analysis didn't finish. You can re-run the analysis below, or come back later."
                : "The interview was completed, but no analysis is available yet. Try again in a moment, or re-run the analysis below."}
            </p>

            {reviewerFailure?.error && (
              <div className="mb-6 w-full bg-paper border border-rule rounded-md p-4 text-left">
                <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">
                  Diagnostic
                </p>
                <p className="text-sm text-ink-soft break-words">
                  {reviewerFailure.error}
                </p>
                {(reviewerFailure.retry_count ?? 0) > 0 && (
                  <p className="text-xs text-muted mt-2 font-mono tabular-nums">
                    {reviewerFailure.retry_count} previous retry attempt{reviewerFailure.retry_count === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            )}

            {reanalyzeError && (
              <div className="mb-4 w-full bg-danger-soft border border-danger/30 rounded-md p-3 text-left text-sm text-danger">
                {reanalyzeError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={handleBackToInterview}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to interview
              </Button>
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
              <Button
                variant="gold"
                onClick={handleReanalyze}
                disabled={isReanalyzePending}
              >
                {isReanalyzePending ? (
                  <Spinner size="sm" variant="inverse" className="mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {isReanalyzePending ? "Dispatching…" : "Re-run analysis"}
              </Button>
            </div>

            <p className="text-xs text-muted mt-6 max-w-md">
              Re-run dispatches a fresh analysis on the stored conversation. Poll resumes automatically — you'll see the result within ~1 minute if successful.
            </p>
          </div>
        </div>
      );
    }

    // Pre-exhaustion: keep the in-flight polling screen.
    return (
      <div className="min-h-dvh flex flex-col bg-paper-2">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="mb-8 flex items-center justify-center">
            <Spinner size="lg" variant="brand" label="Processing" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-ink mb-3">
            Generating interview results
          </h1>

          <p className="text-base text-ink-soft max-w-3xl mx-auto mb-8 leading-relaxed">
            Our AI is analyzing the conversation and generating a detailed skill assessment.{" "}
            {asyncProgressFlag
              ? `Usually ready ${reviewerEta ? `in ${etaPhrase(reviewerEta)}` : "in under a minute"}.`
              : "This usually takes under a minute."}
          </p>

          <div className="flex items-center gap-2 text-sm bg-warning-soft px-4 py-2 rounded-md border border-warning/30 text-warning">
            <Clock className="w-4 h-4" />
            <span className="font-mono tabular-nums">
              {hasAttempted
                ? `Checking again · attempt ${Math.min(retryCount, SESSION_RESULTS_POLL_MAX)}/${SESSION_RESULTS_POLL_MAX}`
                : "Checking…"}
            </span>
          </div>

          <Button
            variant="outline"
            className="mt-6"
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check now
          </Button>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/interviews/manage`)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview results</h1>
        </div>

        <Card>
          <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Results</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry loading results
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/interviews/manage`)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview results</h1>
        </div>

        <Card>
          <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
              <p className="text-muted-foreground mb-4">Unable to load evaluation data</p>
              <Button onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry loading results
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { overall_summary, hireability_recommendation } = evaluation;
  // `competencies` and `suggested_next_steps` are kept on the evaluation
  // type for backward compatibility but no longer rendered — the unified
  // Talent Analysis Graph carries that signal now.

  const getBadgeClass = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return "bg-danger-soft text-red-800 border-danger/30";
    if (lowerDecision.includes("reservations")) return "bg-warning-soft text-yellow-800 border-warning/30";
    if (lowerDecision.includes("recommend")) return "bg-success-soft text-green-800 border-success/30";
    return "bg-paper-3 text-ink border-rule-strong";
  };

  const getIcon = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return <TrendingDown className="w-5 h-5 text-danger" />;
    if (lowerDecision.includes("reservations")) return <Lightbulb className="w-5 h-5 text-warning" />;
    if (lowerDecision.includes("recommend")) return <CheckCircle className="w-5 h-5 text-success" />;
    return null;
  };

  // P5-3: consolidated stage-agnostic results surface (flag-on). Reached only
  // after the waiting/error/no-evaluation guards, so rawResults is non-null. The
  // legacy body below is the unchanged flag-off path.
  if (stageResultsFlag) {
    return (
      <StageResults
        results={rawResults!}
        sessionId={sessionId}
        interviewId={interviewId}
        onOverridden={() => resultsQuery.refetch()}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-subtle p-4 animate-in fade-in duration-300">
      <main className="max-w-6xl mx-auto">
        <header className="mb-6 animate-in slide-in-from-top-2 fade-in duration-400">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate(`/interviews/${interviewId}`)}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Interview
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Interview Results</h1>
              </div>
            </div>
            
{rawResults?.generated_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-paper-2 px-3 py-2 rounded-lg border border-rule">
                <Clock className="w-4 h-4 text-muted" />
                <span className="text-muted">
                  Generated {new Date(rawResults.generated_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* N8: blueprint-error banner. When the interview's blueprint is
            missing `skills` / `skill_layout`, the reviewer agent emits
            placeholder nodes named "Blueprint Error N" with score=0. The
            recruiter sees a no-signal report that *looks* like a bad
            candidate but is actually an interview-config problem. Detect
            and surface a CTA. */}
        {(() => {
          const nodes = rawResults?.graph_data?.nodes || [];
          const hasBlueprintError =
            nodes.length > 0 &&
            nodes.every((n: any) =>
              (n?.skill_name || n?.name || '').toLowerCase().includes('blueprint error')
            );
          if (!hasBlueprintError) return null;
          return (
            <Card className="p-4 mb-6 border-warning/30 bg-warning-soft shadow-2">
              <h2 className="text-base font-semibold text-warning mb-2">
                Interview blueprint is misconfigured
              </h2>
              <p className="text-sm text-warning/90 mb-3">
                This interview's blueprint is missing required fields
                (skills / skill_layout). The candidate's answers can't be
                scored against a rubric, so the results below are placeholder
                values — not a signal about the candidate.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/interview-blueprint/${interviewId}`)}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-paper rounded-md"
                >
                  Open blueprint editor
                </button>
                <button
                  onClick={() => navigate(`/interviews/${interviewId}`)}
                  className="px-3 py-1.5 text-xs font-medium border border-amber-700 text-warning rounded-md"
                >
                  Back to interview
                </button>
              </div>
            </Card>
          );
        })()}

        <Tabs defaultValue="tag" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tag">Talent Analysis Graph</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="p-4 shadow-2">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
                <MessageSquareQuote className="w-5 h-5 mr-2 text-primary" />
                Overall Summary
              </h2>
              <p className="text-foreground/80 leading-relaxed text-sm">{overall_summary}</p>
            </Card>

            <Card className="p-4 shadow-2">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Hireability Recommendation
              </h2>
              <div className="flex items-start space-x-4">
                {getIcon(hireability_recommendation)}
                <div>
                  <Badge
                    variant="outline"
                    className={`text-base font-semibold ${getBadgeClass(hireability_recommendation)}`}
                  >
                    {hireability_recommendation}
                  </Badge>
                </div>
              </div>
            </Card>

            {sessionId && <RatingPanel sessionId={sessionId} />}
          </TabsContent>

          <TabsContent value="tag">
            {rawResults?.graph_data?.nodes && rawResults.graph_data.nodes.length > 0 ? (
              <Card className="p-4 shadow-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    Talent Analysis Graph
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      Click any node for evidence
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTagModal(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-gold-ink hover:underline"
                      aria-label="Expand Talent Analysis Graph"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Expand
                    </button>
                  </div>
                </div>
                <TalentAnalysisGraph
                  data={tagFromResult(rawResults as any, (rawResults as any).role || "Role")}
                  mode="result"
                  sessionId={sessionId}
                  onOverridden={() => resultsQuery.refetch()}
                />
              </Card>
            ) : (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Talent Analysis Graph data is not yet available for this session.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcript">
            {sessionId && <TranscriptViewer sessionId={sessionId} />}
          </TabsContent>
        </Tabs>

        {/* B3 — skill-gap summary: how many skills clear the role's bar, and which
            fall short. Derived from the TAG's own status buckets (zero setup);
            renders nothing when the result has no scored skills. */}
        {gapSummary && <SkillGapSummary data={gapSummary} className="mt-6" />}

        {/* P4-5 — transferable-skill band (self-gated on `transferable`; renders
            null when off, empty, or all rows filter out as non-finance). */}
        <TransferableBand skills={rawResults?.transferable_skills} className="mt-6" />

        {/* P4-4 — contestable integrity notes (self-gated on `integrity`). The
            payload carries no turn-cited flags today, so this stays dark until the
            backend persists them; an empty list renders nothing. */}
        {(((rawResults as any)?.integrity_flags ?? []) as IntegrityFlag[]).map((f) => (
          <IntegrityNote
            key={`${f.canonicalId ?? f.skillName}-${f.turn}`}
            flag={f}
            onMarkFair={(flag) => {
              // Fire-and-forget: the note keeps its optimistic state; the endpoint
              // is idempotent so a failure just retries on the next mark.
              if (sessionId) {
                integrityApi.markFair(sessionId, flag).catch(() => {
                  /* best-effort; optimistic UI already reflects the mark */
                });
              }
            }}
          />
        ))}

        {(rawResults as any)?.candidate_id && (
          <Card className="p-6 mt-6">
            <h3 className="text-sm font-semibold text-ink mb-1">Assessment skill profile</h3>
            <p className="text-xs text-muted mb-2">
              Cross-mode evidence (scenario, case, work-sample, defense) fused per skill.
            </p>
            <FusedSkillProfile candidateId={(rawResults as any).candidate_id} />
          </Card>
        )}

        <div className="mt-6 text-center">
          <Button onClick={() => navigate(`/interviews/manage`)}>
            Back to Interviews
          </Button>
        </div>
      </main>

      {rawResults?.graph_data?.nodes && rawResults.graph_data.nodes.length > 0 && (
        <TagViewModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          data={tagFromResult(rawResults as any, (rawResults as any).role || "Role")}
          roleTitle={(rawResults as any).role}
        />
      )}
    </div>
  );
}