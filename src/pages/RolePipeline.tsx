/**
 * RolePipeline — route /programs/:programId.
 *
 * Shows one hiring program and the candidates moving through it. Each row is
 * a candidate with their current-stage chip, journey status, and a compact
 * stage-progress strip. Data: getProgram (for stage labels + meta) and
 * listJourneys (the enrolled candidates).
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, GitBranch, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  recruiterJourneysApi,
  type JourneyInstance,
  type JourneyStage,
  type Program,
} from "@/services/recruiterJourneysApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShimmerTable } from "@/components/ui/shimmer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { cn } from "@/lib/utils";

// Journey status → sentence-case label + tone classes (token-wired).
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-info-soft text-info border-info/30" },
  completed: { label: "Completed", className: "bg-success-light text-success border-success/20" },
  hired: { label: "Hired", className: "bg-success-light text-success border-success/20" },
  rejected: { label: "Rejected", className: "bg-status-cancelled-light text-status-cancelled border-status-cancelled/20" },
  withdrawn: { label: "Withdrawn", className: "bg-paper-3 text-muted border-rule" },
};

function StatusChip({ status }: { status: string }) {
  const key = (status || "").toLowerCase();
  const cfg = STATUS_STYLES[key] ?? { label: status || "Unknown", className: "bg-paper-3 text-muted border-rule" };
  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// Per-stage progress dot colour by stage status.
const PROGRESS_TONE: Record<string, string> = {
  passed: "bg-success",
  in_progress: "bg-info",
  failed: "bg-danger",
  skipped: "bg-paper-4",
  pending: "bg-rule",
};

/**
 * Compact stage-progress strip. Prefers the journey's own stage_progress;
 * falls back to "everything up to current stage is done" when the backend
 * doesn't surface per-stage detail.
 */
function StageProgress({ journey, stages }: { journey: JourneyInstance; stages: JourneyStage[] }) {
  const byId = useMemo(() => {
    const m = new Map<string, string>();
    (journey.stage_progress ?? []).forEach((p) => m.set(p.stage_id, p.status));
    return m;
  }, [journey.stage_progress]);

  const currentIndex = stages.findIndex((s) => s.stage_id === journey.current_stage_id);

  const toneFor = (stage: JourneyStage, index: number): string => {
    const explicit = byId.get(stage.stage_id);
    if (explicit) return PROGRESS_TONE[explicit] ?? "bg-rule";
    if (currentIndex < 0) return "bg-rule";
    if (index < currentIndex) return "bg-success";
    if (index === currentIndex) return "bg-info";
    return "bg-rule";
  };

  if (stages.length === 0) return <span className="text-muted text-xs">—</span>;

  return (
    <div className="flex items-center gap-1" aria-label="Stage progress">
      {stages.map((stage, index) => (
        <span
          key={stage.stage_id}
          className={cn("h-1.5 w-6 rounded-full", toneFor(stage, index))}
          title={`${stage.order}. ${stage.title}`}
        />
      ))}
      <span className="ml-2 font-mono tabular-nums text-[11px] text-muted">
        {Math.max(0, currentIndex + 1)}/{stages.length}
      </span>
    </div>
  );
}

export default function RolePipeline() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ws = user?.activeWorkspaceId;

  const [program, setProgram] = useState<Program | null>(null);
  const [journeys, setJourneys] = useState<JourneyInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (!ws || !programId) return;
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [prog, journeyList] = await Promise.all([
        recruiterJourneysApi.getProgram(ws, programId),
        recruiterJourneysApi.listJourneys(ws, programId),
      ]);
      setProgram(prog);
      setJourneys(journeyList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this program.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, programId]);

  // Stage label lookup for the current-stage chip.
  const stages: JourneyStage[] = useMemo(
    () => [...(program?.stages ?? [])].sort((a, b) => a.order - b.order),
    [program?.stages],
  );
  const stageTitle = (id: string) => stages.find((s) => s.stage_id === id)?.title || "—";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              PIPELINE
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-gold-ink" aria-hidden />
              {program?.title ?? "Role pipeline"}
            </h1>
            {program && (
              <p className="text-xs text-muted mt-1 font-mono tabular-nums">
                {journeys.length} candidate{journeys.length === 1 ? "" : "s"} · {stages.length} stage
                {stages.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => load("refresh")}
          disabled={loading || refreshing || !ws}
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {!ws && (
        <ErrorBanner
          tone="warning"
          title="No active workspace"
          description="Select a workspace to view this pipeline."
        />
      )}

      {error && (
        <ErrorBanner
          tone="danger"
          title="Could not load program"
          description={error}
          retryLabel="Try again"
          onRetry={() => load("initial")}
        />
      )}

      {loading ? (
        <ShimmerTable />
      ) : journeys.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates enrolled yet"
          description="Once you enroll candidates into this program, they'll appear here with their current stage and progress."
        />
      ) : (
        <div className="rounded-md border border-rule bg-paper overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Current stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journeys.map((j) => (
                <TableRow key={j.journey_instance_id}>
                  <TableCell>
                    <div className="font-medium text-ink">
                      {j.candidate_name || j.candidate_id}
                    </div>
                    {j.candidate_email && (
                      <div className="text-xs text-muted">{j.candidate_email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {stageTitle(j.current_stage_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={j.status} />
                  </TableCell>
                  <TableCell>
                    <StageProgress journey={j} stages={stages} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
