import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TranscriptViewer } from "@/components/interview/TranscriptViewer";
import { CheckCircle, AlertTriangle, Lightbulb, TrendingDown, MessageSquareQuote, ArrowLeft, Clock, RefreshCw } from "lucide-react";
import { RatingPanel } from "@/components/interview/RatingPanel";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { TalentAnalysisGraph, type TagGraphNode } from "@/components/tag/TalentAnalysisGraph";
import { tagFromResult } from "@/components/tag/adapters";
import { track, Events } from "@/lib/analytics";
import { useSessionResultsQuery, ResultsPendingError } from "@/queries/resultsQueries";
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

  // Scroll to top immediately when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const resultsQuery = useSessionResultsQuery(sessionId);
  const rawResults = resultsQuery.data ?? null;
  const isResultsPending = resultsQuery.error instanceof ResultsPendingError;
  const realError =
    resultsQuery.error && !isResultsPending
      ? (resultsQuery.error instanceof Error ? resultsQuery.error.message : "Failed to load results")
      : null;
  const error = !sessionId ? "No session ID provided" : realError;
  const isLoading = resultsQuery.isPending && !isResultsPending && Boolean(sessionId);
  const evaluation = useMemo(
    () => (rawResults ? transformToLegacyFormat(rawResults) : null),
    [rawResults],
  );

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

  const handleRetry = () => {
    resultsQuery.refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col bg-paper-2   ">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="mb-8 flex items-center justify-center">
            <Spinner size="lg" variant="brand" label="Processing" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4 animate-pulse">
            Analyzing Interview Results
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Processing competency assessments and generating comprehensive evaluation...
          </p>

          <div className="w-full max-w-md mb-6">
            <div className="w-full bg-paper-3 rounded-full h-3">
              <div
                className="bg-paper-2 from-primary  h-3 rounded-full transition-all duration-300 ease-out animate-pulse"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground opacity-75">
            Generating detailed competency analysis...
          </p>
        </div>
      </div>
    );
  }

  // Show pending state - results being generated
  if (isResultsPending) {
    return (
      <div className="min-h-dvh flex flex-col bg-paper-2   ">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="mb-8 flex items-center justify-center">
            <Spinner size="lg" variant="brand" label="Processing" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4">
            Generating Interview Results
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Our AI is analyzing the interview conversation and generating a detailed skill assessment...
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 ">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-amber-700 ">
              Checking again in {10 - (retryCount % 10)} seconds... (Attempt {retryCount + 1}/6)
            </span>
          </div>

          <Button
            variant="outline"
            className="mt-6"
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Now
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
            Back to Interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview Results</h1>
        </div>

        <Card>
          <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
            Back to Interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview Results</h1>
        </div>

        <Card>
          <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
    if (lowerDecision.includes("not recommend")) return "bg-red-100 text-red-800 border-red-300";
    if (lowerDecision.includes("reservations")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (lowerDecision.includes("recommend")) return "bg-green-100 text-green-800 border-green-300";
    return "bg-paper-3 text-ink border-rule-strong";
  };

  const getIcon = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return <TrendingDown className="w-5 h-5 text-red-600" />;
    if (lowerDecision.includes("reservations")) return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    if (lowerDecision.includes("recommend")) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return null;
  };

  return (
    <div className="min-h-dvh bg-gradient-subtle p-4">
      <main className="max-w-6xl mx-auto">
        <header className="mb-6">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-paper-2 px-3 py-2 rounded-lg border border-rule ">
                <Clock className="w-4 h-4 text-muted" />
                <span className="text-muted ">
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
            <Card className="p-4 mb-6 border-amber-300 bg-amber-50 shadow-2">
              <h2 className="text-base font-semibold text-amber-900 mb-2">
                Interview blueprint is misconfigured
              </h2>
              <p className="text-sm text-amber-900/90 mb-3">
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
                  className="px-3 py-1.5 text-xs font-medium border border-amber-700 text-amber-900 rounded-md"
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
                  <span className="text-xs uppercase tracking-wider text-muted">
                    Click any node for evidence
                  </span>
                </div>
                <TalentAnalysisGraph
                  data={tagFromResult(rawResults as any, (rawResults as any).role || "Role")}
                  mode="result"
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

        <div className="mt-6 text-center">
          <Button onClick={() => navigate(`/interviews/manage`)}>
            Back to Interviews
          </Button>
        </div>
      </main>
    </div>
  );
}