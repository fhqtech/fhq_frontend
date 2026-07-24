/**
 * P5-3 — StageResults: the consolidated, stage-agnostic results surface.
 *
 * WHAT IT IS
 * A single presentational body that renders the interview-results view for every
 * stage — screen, fitment, skill-analysis — identically: the Talent Analysis
 * Graph, the transcript, the scoring/overview, and the Phase-4 trust surfaces.
 * It replaces the per-page duplication the P5-3 plan feared; in reality the
 * legacy results surface (pages/InterviewResults.tsx) was ALREADY stage-agnostic
 * and the fitment URL already redirects, so this is a thin generalisation of
 * that success body, not a merge of two twins.
 *
 * WHERE THE FLAG LIVES
 * This component is the `stage_results`-ON branch. It does NOT self-gate — the
 * swap (flag on → StageResults, off → legacy inline body) happens in
 * InterviewResults, reported in sharedWiring, so the running pilot renders the
 * legacy path untouched until a workspace opts in.
 *
 * READ-ONLY / ZERO-WRITE
 * It consumes an already-fetched `results` payload and composes GET-only child
 * surfaces. No mutations, no new write endpoints. The merge/unmerge write path
 * is P5-4 (deferred, out of scope).
 *
 * SACRED REUSE
 * The TAG (TalentAnalysisGraph) and its trust stack (UnverifiedMark /
 * NodeProvenancePanel / TrustExpander, mounted inside TagSidePanel) are reused
 * as-is — never re-implemented. The data layer (resultsQueries + tagFromResult +
 * transformToLegacyFormat) is reused, never forked.
 *
 * DATA GAP (documented, not invented)
 * The results payload carries no stage field, no `role`, no `candidate_id`, and
 * no `integrity_flags` in the typed InterviewResultsData contract. `role` /
 * `candidate_id` / `integrity_flags` are read defensively off the runtime
 * payload (they exist today via `as any` on the legacy page); the stage is a
 * caller-supplied presentational prop that defaults gracefully to "Results".
 * Nothing here fabricates a backend field.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Lightbulb,
  MessageSquareQuote,
  TrendingDown,
  Clock,
  ArrowLeft,
  Maximize2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import { TranscriptViewer } from "@/components/interview/TranscriptViewer";
import { RatingPanel } from "@/components/interview/RatingPanel";
import { FusedSkillProfile } from "@/components/assessment/FusedSkillProfile";
import { PercentileBadge } from "./PercentileBadge";
import { TransferableBand } from "@/components/trust/TransferableBand";
import { IntegrityNote } from "@/components/trust/IntegrityNote";
import { TagViewModal } from "@/components/views/TagViewModal";
import { tagFromResult } from "@/components/tag/adapters";
import { transformToLegacyFormat } from "@/lib/results/legacyEvaluation";
import type { InterviewResultsData } from "@/types/interviewResults";
import type { IntegrityFlag } from "@/lib/integrity";

/**
 * The interview stage a results surface belongs to. Presentational only — it
 * drives the eyebrow label, nothing else. The results body is identical across
 * all three; there is no per-stage branch.
 */
export type StageKind = "screen" | "fitment" | "skill_analysis";

/** Sober, sentence-case eyebrow label per stage. */
const STAGE_EYEBROW: Record<StageKind, string> = {
  screen: "Screening",
  fitment: "Fitment",
  skill_analysis: "Skill analysis",
};

/**
 * Runtime superset of the typed results contract. `role`, `candidate_id`, and
 * `integrity_flags` are present on the live payload but absent from
 * InterviewResultsData — modelled here so we consume them type-safely instead of
 * casting to `any`, and so the gap is explicit rather than invented.
 */
export type StageResultsPayload = InterviewResultsData & {
  role?: string;
  candidate_id?: string;
  integrity_flags?: IntegrityFlag[];
};

export interface StageResultsProps {
  /** Already-fetched, session-scoped results payload (GET only). */
  results: StageResultsPayload;
  /** The session these results belong to; threads into the TAG, transcript, rating. */
  sessionId?: string;
  /** The parent interview, for back-navigation + blueprint-editor CTA. */
  interviewId?: string;
  /** Presentational stage tag; drives the eyebrow only. Optional by design. */
  stage?: StageKind;
  /** Explicit eyebrow override; wins over `stage`. */
  stageLabel?: string;
  /** Fired when a node score is overridden in the TAG panel — refetch upstream. */
  onOverridden?: () => void;
}

function eyebrowFor(stage?: StageKind, stageLabel?: string): string {
  if (stageLabel) return stageLabel;
  if (stage) return STAGE_EYEBROW[stage];
  return "Results";
}

function badgeClassFor(decision: string): string {
  const d = decision.toLowerCase();
  if (d.includes("not recommend")) return "bg-danger-soft text-red-800 border-danger/30";
  if (d.includes("reservations")) return "bg-warning-soft text-yellow-800 border-warning/30";
  if (d.includes("recommend")) return "bg-success-soft text-green-800 border-success/30";
  return "bg-paper-3 text-ink border-rule-strong";
}

function iconFor(decision: string) {
  const d = decision.toLowerCase();
  if (d.includes("not recommend")) return <TrendingDown className="w-5 h-5 text-danger" />;
  if (d.includes("reservations")) return <Lightbulb className="w-5 h-5 text-warning" />;
  if (d.includes("recommend")) return <CheckCircle className="w-5 h-5 text-success" />;
  return null;
}

export function StageResults({
  results,
  sessionId,
  interviewId,
  stage,
  stageLabel,
  onOverridden,
}: StageResultsProps) {
  const navigate = useNavigate();
  const [showTagModal, setShowTagModal] = useState(false);

  const evaluation = transformToLegacyFormat(results);
  const { overall_summary, hireability_recommendation } = evaluation;

  const nodes = results.graph_data?.nodes ?? [];
  const hasGraph = nodes.length > 0;
  const roleTitle = results.role || "Role";
  const eyebrow = eyebrowFor(stage, stageLabel);

  // N8 parity: every node is a "Blueprint Error N" placeholder → the interview's
  // blueprint is missing skills / skill_layout, so the scores are not a signal
  // about the candidate. Reads the backend node fields (skill_name / name), same
  // as the legacy detector.
  const hasBlueprintError =
    nodes.length > 0 &&
    nodes.every((n: any) =>
      (n?.skill_name || n?.name || "").toLowerCase().includes("blueprint error"),
    );

  const integrityFlags = results.integrity_flags ?? [];

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
                Back to interview
              </Button>
              <div>
                <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
                  {eyebrow}
                </span>
                <h1 className="text-3xl font-bold text-foreground">Interview results</h1>
              </div>
            </div>

            {results.generated_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-paper-2 px-3 py-2 rounded-lg border border-rule">
                <Clock className="w-4 h-4 text-muted" />
                <span className="text-muted">
                  Generated {new Date(results.generated_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </header>

        {hasBlueprintError && (
          <Card className="p-4 mb-6 border-warning/30 bg-warning-soft shadow-2">
            <h2 className="text-base font-semibold text-warning mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Interview blueprint is misconfigured
            </h2>
            <p className="text-sm text-warning/90 mb-3">
              This interview's blueprint is missing required fields (skills /
              skill_layout). The candidate's answers can't be scored against a
              rubric, so the results below are placeholder values — not a signal
              about the candidate.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/interview-blueprint/${interviewId}`)}
                className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-paper rounded-md"
              >
                Open blueprint editor
              </button>
              <button
                type="button"
                onClick={() => navigate(`/interviews/${interviewId}`)}
                className="px-3 py-1.5 text-xs font-medium border border-amber-700 text-warning rounded-md"
              >
                Back to interview
              </button>
            </div>
          </Card>
        )}

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
                Overall summary
              </h2>
              <p className="text-foreground/80 leading-relaxed text-sm">{overall_summary}</p>
            </Card>

            <Card className="p-4 shadow-2">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Hireability recommendation
              </h2>
              <div className="flex items-start space-x-4">
                {iconFor(hireability_recommendation)}
                <div>
                  <Badge
                    variant="outline"
                    className={`text-base font-semibold ${badgeClassFor(hireability_recommendation)}`}
                  >
                    {hireability_recommendation}
                  </Badge>
                </div>
                <PercentileBadge
                  candidateId={results.candidate_id}
                  interviewId={interviewId}
                  className="ml-auto"
                />
              </div>
            </Card>

            {sessionId && <RatingPanel sessionId={sessionId} />}
          </TabsContent>

          <TabsContent value="tag">
            {hasGraph ? (
              <Card className="p-4 shadow-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    Talent Analysis Graph
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">Click any node for evidence</span>
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
                  data={tagFromResult(results as any, roleTitle)}
                  mode="result"
                  sessionId={sessionId}
                  onOverridden={onOverridden}
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

        {/* P4-5 — transferable-skill band (self-gates on `transferable`; renders
            null when off, empty, or all rows filter out as non-finance). */}
        <TransferableBand skills={results.transferable_skills} className="mt-6" />

        {/* P4-4 — contestable integrity notes (self-gate on `integrity`). Dark by
            construction until the backend persists turn-cited flags. */}
        {integrityFlags.map((f) => (
          <IntegrityNote
            key={`${f.canonicalId ?? f.skillName}-${f.turn}`}
            flag={f}
            onMarkFair={() => {
              /* persistence is P5-4 / a later ticket; affordance only for now */
            }}
          />
        ))}

        {results.candidate_id && (
          <Card className="p-6 mt-6">
            <h3 className="text-sm font-semibold text-ink mb-1">Assessment skill profile</h3>
            <p className="text-xs text-muted mb-2">
              Cross-mode evidence (scenario, case, work-sample, defense) fused per skill.
            </p>
            <FusedSkillProfile candidateId={results.candidate_id} />
          </Card>
        )}

        <div className="mt-6 text-center">
          <Button onClick={() => navigate(`/interviews/manage`)}>Back to interviews</Button>
        </div>
      </main>

      {hasGraph && (
        <TagViewModal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          data={tagFromResult(results as any, roleTitle)}
          roleTitle={results.role}
        />
      )}
    </div>
  );
}

export default StageResults;
