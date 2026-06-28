/**
 * RolePipeline — route /programs/:programId.
 *
 * Shows one hiring program and the candidates moving through it. Each row is
 * a candidate with their current-stage chip, journey status, and a compact
 * stage-progress strip. Data: getProgram (for stage labels + meta) and
 * listJourneys (the enrolled candidates).
 *
 * Each row expands into two human-in-the-loop panels:
 *   - profile   — the candidate's fused role-TAG, rendered as a compact bar
 *                 list keyed off the TAG thresholds (>=80 / 50–79 / <50).
 *   - decisions — rule recommendations the recruiter can confirm, plus a
 *                 manual override (advance | skip | reject) for the current
 *                 stage. Rules recommend; the human decides.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Link as LinkIcon,
  Play,
  RefreshCw,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  recruiterJourneysApi,
  type DecisionAction,
  type JourneyInstance,
  type JourneyRecommendation,
  type JourneyStage,
  type Program,
  type RoleTag,
} from "@/services/recruiterJourneysApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
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

/**
 * Stage runner — the recruiter's launch control for the current stage. When the
 * stage is `unlocked` it offers a Start button (provisions the engine artifact +
 * invites the candidate). Once `in_progress` it shows a live indicator plus a
 * copy-link affordance so the recruiter can hand the candidate the deep link
 * directly. Hidden for terminal journeys.
 */
function StageRunner({
  journey,
  stageTitle,
  busy,
  onStart,
  onCopyLink,
}: {
  journey: JourneyInstance;
  stageTitle: (id: string) => string;
  busy: boolean;
  onStart: () => void;
  onCopyLink: (url: string) => void;
}) {
  const terminal = ["rejected", "completed", "withdrawn", "hired"].includes(
    (journey.status || "").toLowerCase(),
  );
  if (terminal) return null;

  const stage = (journey.stages ?? []).find((s) => s.stage_id === journey.current_stage_id);
  const status = stage?.status;
  const title = stageTitle(journey.current_stage_id);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-paper px-4 py-3">
      <div className="min-w-0">
        <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-gold-ink">
          Current stage
        </span>
        <p className="text-sm font-medium text-ink">{title}</p>
      </div>
      {status === "unlocked" ? (
        <Button size="sm" variant="gold" disabled={busy} onClick={onStart}>
          <Play className="w-4 h-4" />
          {busy ? "Starting…" : "Start stage"}
        </Button>
      ) : status === "in_progress" ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-info">
            <span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" aria-hidden />
            In progress — candidate invited
          </span>
          {stage?.candidate_action_url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopyLink(stage.candidate_action_url as string)}
            >
              <LinkIcon className="w-4 h-4" />
              Copy link
            </Button>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted">Stage not ready to start.</span>
      )}
    </div>
  );
}

// ── Role-TAG threshold tones ───────────────────────────────────────────────
// Mirror the TAG color thresholds (TalentAnalysisGraph): >=80 strong/green,
// 50–79 developing/amber, <50 gap/red. Token colors only — no pure hex.
type TagBand = "strong" | "developing" | "gap";

function bandOf(value: number): TagBand {
  if (value >= 80) return "strong";
  if (value >= 50) return "developing";
  return "gap";
}

const BAND_BAR: Record<TagBand, string> = {
  strong: "bg-success",
  developing: "bg-warning",
  gap: "bg-danger",
};

const BAND_TEXT: Record<TagBand, string> = {
  strong: "text-success",
  developing: "text-warning",
  gap: "text-danger",
};

/**
 * Compact fused-skill bar list. One row per claim: dot + skill name on the
 * left, a threshold-colored bar and the mono value on the right.
 */
function RoleTagPanel({ tag }: { tag: RoleTag }) {
  if (tag.claims.length === 0) {
    return (
      <p className="text-xs text-muted">
        No profile yet — runs as stages complete.
      </p>
    );
  }

  const claims = [...tag.claims].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-2.5">
      <ul className="divide-y divide-rule rounded-md border border-rule bg-paper">
        {claims.map((claim) => {
          const band = bandOf(claim.value);
          return (
            <li
              key={claim.canonical_id}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", BAND_BAR[band])}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {claim.skill_name}
              </span>
              <div className="h-1.5 w-28 shrink-0 rounded-full bg-paper-3" aria-hidden>
                <div
                  className={cn("h-full rounded-full", BAND_BAR[band])}
                  style={{ width: `${Math.max(0, Math.min(100, claim.value))}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-9 shrink-0 text-right font-mono tabular-nums text-sm font-medium",
                  BAND_TEXT[band],
                )}
              >
                {Math.round(claim.value)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="font-mono tabular-nums text-[11px] text-muted">
        {tag.skill_count} skill{tag.skill_count === 1 ? "" : "s"} ·{" "}
        {tag.evidence_count} evidence point{tag.evidence_count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

// Recommendation action → sentence-case verb for the explanation line.
const ACTION_VERB: Record<string, string> = {
  skip: "skip ahead",
  reject: "reject",
  unlock: "unlock",
  advance: "advance",
};

const MANUAL_ACTIONS: { value: DecisionAction; label: string }[] = [
  { value: "advance", label: "Advance" },
  { value: "skip", label: "Skip" },
  { value: "reject", label: "Reject" },
];

/**
 * Decisions panel — the human-in-the-loop control. Lists rule
 * recommendations (each confirmable) and a manual override row for the
 * current stage. `busy` disables every control while a request is in flight.
 */
function DecisionsPanel({
  recs,
  loading,
  error,
  busy,
  stageTitle,
  onConfirm,
  onManual,
}: {
  recs: JourneyRecommendation[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  stageTitle: (id: string) => string;
  onConfirm: (rec: JourneyRecommendation) => void;
  onManual: (action: DecisionAction) => void;
}) {
  const [manualAction, setManualAction] = useState<DecisionAction>("advance");

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-muted">Loading recommendations…</p>
      ) : error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : recs.length === 0 ? (
        <p className="text-xs text-muted">
          No rule recommendations for this stage — use a manual decision below.
        </p>
      ) : (
        <ul className="space-y-2">
          {recs.map((rec) => (
            <li
              key={rec.rule_id}
              className="flex items-start justify-between gap-3 rounded-md border border-rule bg-paper px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink">{rec.explanation}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Recommends {ACTION_VERB[rec.action] ?? rec.action}
                  {rec.to_stage_id ? ` to ${stageTitle(rec.to_stage_id)}` : ""}.
                </p>
              </div>
              <Button
                size="sm"
                variant="gold"
                className="shrink-0"
                disabled={busy}
                onClick={() => onConfirm(rec)}
              >
                Confirm
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3">
        <span className="text-xs text-muted">Manual decision:</span>
        <Select
          value={manualAction}
          onValueChange={(v) => setManualAction(v as DecisionAction)}
          disabled={busy}
        >
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MANUAL_ACTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onManual(manualAction)}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

export default function RolePipeline() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const ws = user?.activeWorkspaceId;

  const [program, setProgram] = useState<Program | null>(null);
  const [journeys, setJourneys] = useState<JourneyInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which journey row is expanded (one at a time keeps the table calm).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lazy per-journey caches for the two panels.
  const [tags, setTags] = useState<Record<string, RoleTag>>({});
  const [tagLoading, setTagLoading] = useState<Record<string, boolean>>({});
  const [tagError, setTagError] = useState<Record<string, string | null>>({});

  const [recs, setRecs] = useState<Record<string, JourneyRecommendation[]>>({});
  const [recsLoading, setRecsLoading] = useState<Record<string, boolean>>({});
  const [recsError, setRecsError] = useState<Record<string, string | null>>({});

  // Journey ids with a decision request in flight (disables that row's buttons).
  const [decisionBusy, setDecisionBusy] = useState<Record<string, boolean>>({});

  // Journey ids with a start-stage request in flight.
  const [startBusy, setStartBusy] = useState<Record<string, boolean>>({});

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

  // Lazy-fetch the role-TAG once per candidate (cached after first open).
  const fetchTag = async (j: JourneyInstance) => {
    if (!ws || !programId) return;
    if (tags[j.journey_instance_id] || tagLoading[j.journey_instance_id]) return;
    setTagLoading((s) => ({ ...s, [j.journey_instance_id]: true }));
    setTagError((s) => ({ ...s, [j.journey_instance_id]: null }));
    try {
      const tag = await recruiterJourneysApi.getRoleTag(ws, programId, j.candidate_id);
      setTags((s) => ({ ...s, [j.journey_instance_id]: tag }));
    } catch (err) {
      setTagError((s) => ({
        ...s,
        [j.journey_instance_id]: err instanceof Error ? err.message : "Could not load profile.",
      }));
    } finally {
      setTagLoading((s) => ({ ...s, [j.journey_instance_id]: false }));
    }
  };

  // Lazy-fetch recommendations for the journey (refetched after a decision).
  const fetchRecs = async (j: JourneyInstance, force = false) => {
    if (!ws || !programId) return;
    if (!force && (recs[j.journey_instance_id] || recsLoading[j.journey_instance_id])) return;
    setRecsLoading((s) => ({ ...s, [j.journey_instance_id]: true }));
    setRecsError((s) => ({ ...s, [j.journey_instance_id]: null }));
    try {
      const list = await recruiterJourneysApi.getRecommendations(
        ws,
        programId,
        j.journey_instance_id,
      );
      setRecs((s) => ({ ...s, [j.journey_instance_id]: list }));
    } catch (err) {
      setRecsError((s) => ({
        ...s,
        [j.journey_instance_id]: err instanceof Error ? err.message : "Could not load recommendations.",
      }));
    } finally {
      setRecsLoading((s) => ({ ...s, [j.journey_instance_id]: false }));
    }
  };

  const toggleRow = (j: JourneyInstance) => {
    const open = expandedId === j.journey_instance_id;
    setExpandedId(open ? null : j.journey_instance_id);
    if (!open) {
      fetchTag(j);
      fetchRecs(j);
    }
  };

  // Apply a decision (confirmed recommendation or manual override), then
  // refetch the journeys list and this row's recommendations.
  const applyDecision = async (
    j: JourneyInstance,
    body: { stage_id: string; action: DecisionAction; to_stage_id?: string; reason?: string },
  ) => {
    if (!ws || !programId || decisionBusy[j.journey_instance_id]) return;
    setDecisionBusy((s) => ({ ...s, [j.journey_instance_id]: true }));
    try {
      const res = await recruiterJourneysApi.postDecision(
        ws,
        programId,
        j.journey_instance_id,
        body,
      );
      toast({
        title: res.applied ? "Decision applied" : "Decision recorded",
        description: `${j.candidate_name || j.candidate_id} → ${stageTitle(res.current_stage_id)}.`,
      });
      await Promise.all([load("refresh"), fetchRecs(j, true)]);
    } catch (err) {
      toast({
        title: "Could not apply decision",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDecisionBusy((s) => ({ ...s, [j.journey_instance_id]: false }));
    }
  };

  const confirmRecommendation = (j: JourneyInstance, rec: JourneyRecommendation) =>
    applyDecision(j, {
      stage_id: rec.from_stage_id,
      action: rec.action as DecisionAction,
      to_stage_id: rec.to_stage_id || undefined,
      reason: "recruiter confirmed",
    });

  const applyManual = (j: JourneyInstance, action: DecisionAction) =>
    applyDecision(j, {
      stage_id: j.current_stage_id,
      action,
      reason: "recruiter manual decision",
    });

  // Start the current stage — provisions the engine artifact + invites the
  // candidate, then refreshes so the row reflects in_progress.
  const startCurrentStage = async (j: JourneyInstance) => {
    if (!ws || !programId || startBusy[j.journey_instance_id]) return;
    const stageId = j.current_stage_id;
    setStartBusy((s) => ({ ...s, [j.journey_instance_id]: true }));
    try {
      const res = await recruiterJourneysApi.startStage(
        ws,
        programId,
        j.journey_instance_id,
        stageId,
      );
      toast({
        title: "Stage started",
        description: res.candidate_action_url
          ? `${j.candidate_name || j.candidate_id} was invited to ${stageTitle(stageId)}.`
          : `${stageTitle(stageId)} started.`,
      });
      await load("refresh");
    } catch (err) {
      toast({
        title: "Could not start stage",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartBusy((s) => ({ ...s, [j.journey_instance_id]: false }));
    }
  };

  // Copy a candidate deep link (absolutising relative paths) to the clipboard.
  const copyCandidateLink = async (url: string) => {
    const abs = /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(abs);
      toast({ title: "Link copied", description: "Candidate stage link is on your clipboard." });
    } catch {
      toast({
        title: "Could not copy",
        description: abs,
        variant: "destructive",
      });
    }
  };

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
                <TableHead className="w-8" />
                <TableHead>Candidate</TableHead>
                <TableHead>Current stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journeys.map((j) => {
                const open = expandedId === j.journey_instance_id;
                const busy = !!decisionBusy[j.journey_instance_id];
                return (
                  <Fragment key={j.journey_instance_id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleRow(j)}
                      aria-expanded={open}
                    >
                      <TableCell className="pr-0">
                        {open ? (
                          <ChevronDown className="w-4 h-4 text-muted" aria-hidden />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted" aria-hidden />
                        )}
                      </TableCell>
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

                    {open && (
                      <TableRow className="bg-paper-2 hover:bg-paper-2">
                        <TableCell colSpan={5} className="p-0">
                          <div
                            className="space-y-5 px-5 py-5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <StageRunner
                              journey={j}
                              stageTitle={stageTitle}
                              busy={!!startBusy[j.journey_instance_id]}
                              onStart={() => startCurrentStage(j)}
                              onCopyLink={copyCandidateLink}
                            />
                            <div className="grid gap-6 md:grid-cols-2">
                            <section>
                              <div className="mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-gold-ink" aria-hidden />
                                <h4 className="text-sm font-semibold text-ink">Profile</h4>
                              </div>
                              {tagLoading[j.journey_instance_id] ? (
                                <p className="text-xs text-muted">Loading profile…</p>
                              ) : tagError[j.journey_instance_id] ? (
                                <p className="text-xs text-danger">
                                  {tagError[j.journey_instance_id]}
                                </p>
                              ) : tags[j.journey_instance_id] ? (
                                <RoleTagPanel tag={tags[j.journey_instance_id]} />
                              ) : (
                                <p className="text-xs text-muted">
                                  No profile yet — runs as stages complete.
                                </p>
                              )}
                            </section>

                            <section>
                              <div className="mb-3 flex items-center gap-2">
                                <ScrollText className="w-4 h-4 text-gold-ink" aria-hidden />
                                <h4 className="text-sm font-semibold text-ink">Decisions</h4>
                              </div>
                              <DecisionsPanel
                                recs={recs[j.journey_instance_id] ?? []}
                                loading={!!recsLoading[j.journey_instance_id]}
                                error={recsError[j.journey_instance_id] ?? null}
                                busy={busy}
                                stageTitle={stageTitle}
                                onConfirm={(rec) => confirmRecommendation(j, rec)}
                                onManual={(action) => applyManual(j, action)}
                              />
                            </section>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
