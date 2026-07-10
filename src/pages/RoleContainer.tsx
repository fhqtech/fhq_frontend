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
import { AddStageMenu } from "@/components/role/AddStageMenu";
import { AddCandidatesToRole } from "@/components/role/AddCandidatesToRole";
import { TargetEditor } from "@/components/journey/TargetEditor";
import { Button } from "@/components/ui/button";
import { appendStage } from "@/lib/stageColumns";
import { PageSkeleton } from "@/components/ui/shimmer";
import { ErrorBanner } from "@/components/ui/error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Target } from "lucide-react";

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
          <AddCandidatesToRole onSubmit={handleAddCandidates} />
          <AddStageMenu onAdd={handleAddStage} disabled={saving} />
        </div>
      </header>

      {/* B2 — author the role's skill target bars (feeds the gap-vs-target read). */}
      {showTarget && ws && programId && (
        <TargetEditor
          ws={ws}
          programId={programId}
          initial={program.target_competencies ?? []}
          onSaved={(competencies) =>
            setProgram((p) => (p ? { ...p, target_competencies: competencies } : p))
          }
        />
      )}

      {stages.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No stages yet"
          description="Add a stage to start screening candidates for this role."
        />
      ) : (
        <PipelineBoard
          stages={stages}
          journeys={journeys}
          onOpenCandidate={(j) => navigate(`/roles/${programId}/candidates/${j.candidate_id}`)}
        />
      )}
    </div>
  );
}
