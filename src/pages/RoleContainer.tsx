/**
 * P2-2 — RoleContainer. The role-as-home backbone surface (behind one_builder):
 * a role (today's Program) shown as a typed-column pipeline board. Reuses the
 * existing Programs/Journeys engine (getProgram + listJourneys) verbatim; the
 * legacy /programs/:id (RolePipeline) stays mounted untouched.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  recruiterJourneysApi,
  type Program,
  type JourneyInstance,
  type StageType,
} from "@/services/recruiterJourneysApi";
import { PipelineBoard } from "@/components/role/PipelineBoard";
import { PipelineTable } from "@/components/role/PipelineTable";
import { cn } from "@/lib/utils";
import { AddStageMenu } from "@/components/role/AddStageMenu";
import { AddCandidatesToRole } from "@/components/role/AddCandidatesToRole";
import { TargetEditor } from "@/components/journey/TargetEditor";
import { PipelineBuilder } from "@/components/journey/PipelineBuilder";
import { RoleCohortGap } from "@/components/role/RoleCohortGap";
import { useFlag } from "@/lib/flags/FlagProvider";
import type { GatingRule, Competency } from "@/services/recruiterJourneysApi";
import { Button } from "@/components/ui/button";
import { appendStage } from "@/lib/stageColumns";
import { PageSkeleton } from "@/components/ui/shimmer";
import { ErrorBanner } from "@/components/ui/error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/hooks/use-toast";
import { Users, Target, LayoutGrid, Table as TableIcon, Workflow } from "lucide-react";

export default function RoleContainer() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;

  const [program, setProgram] = useState<Program | null>(null);
  const [journeys, setJourneys] = useState<JourneyInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [view, setView] = useState<"board" | "table">("board");
  const cohortGapOn = useFlag("cohort_gap");
  const blueprintSeedOn = useFlag("blueprint_target_seed");
  const [seed, setSeed] = useState<Competency[] | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  // P7 — when the seed flag is on and the role has no target yet, fetch a
  // suggestion from the role blueprint before mounting the editor (read-only;
  // the recruiter still reviews + saves). Fail-soft to the flat default.
  useEffect(() => {
    if (!showTarget || !ws || !programId || !blueprintSeedOn) return;
    if ((program?.target_competencies?.length ?? 0) > 0) return;
    if (seed !== null) return;
    setSeedLoading(true);
    recruiterJourneysApi
      .suggestTarget(ws, programId)
      .then((s) => setSeed(s.competencies ?? []))
      .catch(() => setSeed([]))
      .finally(() => setSeedLoading(false));
  }, [showTarget, ws, programId, blueprintSeedOn, program?.target_competencies, seed]);

  const handleAddCandidates = async (emails: string[]) => {
    if (!ws || !programId) return;
    await Promise.all(
      emails.map((email) =>
        recruiterJourneysApi.enroll(ws, programId, { email }).catch(() => null),
      ),
    );
    const refreshed = await recruiterJourneysApi.listJourneys(ws, programId).catch(() => journeys);
    setJourneys(refreshed);
  };

  // Provision the candidate's current stage's engine artifact + invite them.
  // The linear engine auto-advances on completion, so per-stage "start" is the
  // one recruiter action the board needs to drive the loop.
  const handleStart = async (j: JourneyInstance) => {
    if (!ws || !programId) return;
    try {
      const res = await recruiterJourneysApi.startStage(
        ws,
        programId,
        j.journey_instance_id,
        j.current_stage_id,
      );
      const refreshed = await recruiterJourneysApi
        .listJourneys(ws, programId)
        .catch(() => journeys);
      setJourneys(refreshed);
      if (res.candidate_action_url) {
        try {
          await navigator.clipboard.writeText(res.candidate_action_url);
        } catch {
          /* clipboard may be unavailable; the link is still in the toast */
        }
        toast({
          title: "Stage started — invite link copied",
          description: res.candidate_action_url,
        });
      } else {
        toast({ title: "Stage started" });
      }
    } catch (e) {
      toast({
        title: "Couldn't start the stage",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddStage = async (type: StageType) => {
    if (!ws || !programId || !program) return;
    setSaving(true);
    try {
      const stages = appendStage(program.stages ?? [], type);
      // Preserve any existing gating rules; bump the template version.
      const rules = (program as { rules?: [] }).rules ?? [];
      const version = ((program as { template_version?: number }).template_version ?? 1) + 1;
      await recruiterJourneysApi.saveJourneyTemplate(ws, programId, { stages, rules, version });
      setProgram({ ...program, stages });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the stage");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!ws || !programId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      recruiterJourneysApi.getProgram(ws, programId),
      recruiterJourneysApi.listJourneys(ws, programId).catch(() => [] as JourneyInstance[]),
    ])
      .then(([p, js]) => {
        if (cancelled) return;
        setProgram(p);
        setJourneys(js);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load this role");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ws, programId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <PageSkeleton header rows={3} cols={4} message="Loading this role…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ErrorBanner tone="danger" title="Couldn't load this role" description={error} />
      </div>
    );
  }
  if (!program) return null;

  const stages = program.stages ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Role</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{program.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-mono tabular-nums">{stages.length}</span> stage
            {stages.length === 1 ? "" : "s"}
            {" · "}
            <span className="font-mono tabular-nums">{journeys.length}</span> candidate
            {journeys.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTarget((s) => !s)}
            aria-expanded={showTarget}
          >
            <Target className="mr-2 h-4 w-4 text-gold-ink" />
            {showTarget ? "Hide target" : "Set skill target"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPipeline((s) => !s)}
            aria-expanded={showPipeline}
          >
            <Workflow className="mr-2 h-4 w-4 text-gold-ink" />
            {showPipeline ? "Hide pipeline" : "Edit pipeline"}
          </Button>
          <AddCandidatesToRole onSubmit={handleAddCandidates} />
          <AddStageMenu onAdd={handleAddStage} disabled={saving} />
        </div>
      </header>

      {/* B2 — author the role's skill target bars (feeds the gap-vs-target read). */}
      {showTarget && ws && programId && !seedLoading && (
        <TargetEditor
          key={`target-${seed ? seed.length : "none"}`}
          ws={ws}
          programId={programId}
          initial={
            (program.target_competencies?.length ?? 0) > 0
              ? program.target_competencies ?? []
              : seed ?? []
          }
          seededFromBlueprint={
            blueprintSeedOn &&
            (program.target_competencies?.length ?? 0) === 0 &&
            (seed?.length ?? 0) > 0
          }
          onSaved={(competencies) =>
            setProgram((p) => (p ? { ...p, target_competencies: competencies } : p))
          }
        />
      )}

      {/* P5 — full pipeline builder: typed stages + score-gating rules. */}
      {showPipeline && ws && programId && (
        <PipelineBuilder
          ws={ws}
          programId={programId}
          initialStages={program.stages ?? []}
          initialRules={(program as { rules?: GatingRule[] }).rules ?? []}
          initialVersion={(program as { template_version?: number }).template_version ?? 1}
          onSaved={(nextStages, nextRules, nextVersion) =>
            setProgram((p) =>
              p ? { ...p, stages: nextStages, rules: nextRules, template_version: nextVersion } : p,
            )
          }
        />
      )}

      {/* P6 — cohort gap vs the authored target (flag-gated, honest empty states). */}
      {cohortGapOn && ws && programId && (
        <RoleCohortGap
          ws={ws}
          programId={programId}
          hasTarget={(program.target_competencies?.length ?? 0) > 0}
        />
      )}

      {stages.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No stages yet"
          description="Add a stage to start screening candidates for this role."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <div className="inline-flex rounded-md border border-rule bg-paper-2 p-0.5" role="group" aria-label="Pipeline view">
              <button
                type="button"
                onClick={() => setView("board")}
                aria-pressed={view === "board"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                  view === "board" ? "bg-paper text-ink shadow-1" : "text-muted hover:text-ink",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                Board
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                aria-pressed={view === "table"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                  view === "table" ? "bg-paper text-ink shadow-1" : "text-muted hover:text-ink",
                )}
              >
                <TableIcon className="h-3.5 w-3.5" aria-hidden />
                Table
              </button>
            </div>
          </div>
          {view === "board" ? (
            <PipelineBoard
              stages={stages}
              journeys={journeys}
              onOpenCandidate={(j) => navigate(`/roles/${programId}/candidates/${j.candidate_id}`)}
              onStart={handleStart}
            />
          ) : (
            <PipelineTable
              stages={stages}
              journeys={journeys}
              onOpenCandidate={(j) => navigate(`/roles/${programId}/candidates/${j.candidate_id}`)}
              onStart={handleStart}
            />
          )}
        </div>
      )}
    </div>
  );
}
