/**
 * P13 — collaborative scorecards + same-role comparison matrix.
 *
 * Behind the default-off `scorecard` flag, so the live pilot is untouched: off
 * (or outside any FlagProvider) → this surface renders nothing. When on, it shows
 * one column per candidate and one row per aligned canonical skill, plus a
 * per-candidate scorecard editor (manual ratings + threaded notes).
 *
 * Honesty rules (v1 reality — reviewer v1 emits no grounding):
 *   - a null-score cell renders "no scored tag yet", never a fabricated 0;
 *   - a row aligned only by skill name hedges "aligned by skill name, not
 *     canonical id" (lucide Unlink);
 *   - an ungrounded score is never shown as verified. When `evidence_contract`
 *     is on, ungrounded scores route through isUnverifiedScore + UnverifiedMark
 *     exactly as TagSidePanel does — a compact hedge in the dense grid cell, the
 *     full UnverifiedMark per skill in the (side-panel-like) editor.
 *
 * AI-prefill is deferred: the draft button is hidden unless the backend reports
 * `{enabled:true}`, and it never auto-runs.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDashed, Sparkles, Table2, Unlink } from "lucide-react";
import { useFlag } from "@/lib/flags/FlagProvider";
import {
  scorecardApi,
  type MatrixCell,
  type MatrixRow,
  type ScorecardMatrixData,
  type ScorecardRow,
} from "@/services/scorecardApi";
import { isUnverifiedScore, type EvidenceNode } from "@/lib/nodeEvidence";
import { UnverifiedMark } from "@/components/tag/UnverifiedMark";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Band = "gap" | "developing" | "strong";

const CHIP: Record<Band, string> = {
  gap: "bg-danger-soft text-danger",
  developing: "bg-warning-soft text-warning",
  strong: "bg-success-soft text-success",
};

/** Default strong bar when a row has no authored target (the TAG's own >=80). */
const DEFAULT_TARGET = 80;

/** ≥ target → strong; within 30 of target → developing; else gap. */
function bandFor(score: number, target: number): Band {
  if (score >= target) return "strong";
  if (score >= target - 30) return "developing";
  return "gap";
}

/** Target bar for a row, or the default when it has no canonical target. */
function targetForRow(row: MatrixRow, targets: Record<string, number>): number {
  const t = row.canonical_id ? targets[row.canonical_id] : undefined;
  return typeof t === "number" ? t : DEFAULT_TARGET;
}

/**
 * Map a cell/row to the minimal EvidenceNode the evidence contract reads. We
 * reflect the backend's `grounded` decision as the machine signal so
 * isUnverifiedScore agrees with it (v1 → no signal → unverified).
 */
function evidenceNode(score: number | null, grounded: boolean, evidence: string[]): EvidenceNode {
  return {
    score,
    evidence,
    confidence: grounded ? 1 : null,
    provenance: grounded ? { grounding_rate: 1, evidence_verified: evidence.length } : null,
  };
}

export default function ScorecardMatrix() {
  const on = useFlag("scorecard");
  // Off (or outside any FlagProvider) → render nothing; the pilot is untouched.
  if (!on) return null;
  return <ScorecardMatrixContent />;
}

function ScorecardMatrixContent() {
  const { programId } = useParams<{ programId?: string }>();
  const evidenceContract = useFlag("evidence_contract");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matrix = useQuery({
    queryKey: ["scorecard-matrix", programId],
    queryFn: () => scorecardApi.getMatrix(programId as string),
    enabled: !!programId,
    staleTime: 30_000,
  });

  // Default the editor to the first candidate once the matrix loads.
  useEffect(() => {
    if (!selectedId && matrix.data?.candidates.length) {
      setSelectedId(matrix.data.candidates[0].candidate_id);
    }
  }, [matrix.data, selectedId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header>
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Scorecards</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Comparison matrix</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-ink-soft">
          Same-role skill comparison across candidates, with collaborative per-skill scorecards. Scores
          under reviewer v1 are model assessments, not independently checked.
        </p>
      </header>

      {matrix.isPending ? (
        <div className="rounded-lg border border-rule bg-paper p-5">
          <p className="text-sm text-muted">Loading comparison matrix…</p>
        </div>
      ) : matrix.isError || !matrix.data ? (
        <ErrorBanner
          tone="danger"
          title="Could not load the comparison matrix"
          description={matrix.error instanceof Error ? matrix.error.message : undefined}
          retryLabel="Try again"
          onRetry={() => matrix.refetch()}
        />
      ) : (
        <MatrixView
          data={matrix.data}
          evidenceContract={evidenceContract}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      {programId && selectedId && (
        <ScorecardEditor
          programId={programId}
          candidateId={selectedId}
          candidateName={
            matrix.data?.candidates.find((c) => c.candidate_id === selectedId)?.name ?? selectedId
          }
          evidenceContract={evidenceContract}
        />
      )}
    </div>
  );
}

// ── Matrix grid ──────────────────────────────────────────────────────────

function MatrixView({
  data,
  evidenceContract,
  selectedId,
  onSelect,
}: {
  data: ScorecardMatrixData;
  evidenceContract: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const degradedReason = useMemo(
    () => data.degraded.map((d) => d.reason).filter(Boolean).join(" "),
    [data.degraded],
  );

  if (data.candidates.length === 0 || data.rows.length === 0) {
    return (
      <EmptyState
        icon={Table2}
        title="No comparison yet"
        description="The comparison matrix appears once candidates in this role have a scored skill tag."
      />
    );
  }

  return (
    <section aria-label="Comparison matrix" className="space-y-4">
      {data.degraded.length > 0 && (
        <ErrorBanner
          tone="warning"
          title="Some cells are missing"
          description={degradedReason || "Some candidates have no scored interview yet."}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-rule bg-paper">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule">
              <th className="p-3 text-[11px] font-medium uppercase tracking-wide text-muted">Skill</th>
              {data.candidates.map((c) => {
                const active = c.candidate_id === selectedId;
                return (
                  <th key={c.candidate_id} className="p-2 align-bottom">
                    <button
                      type="button"
                      onClick={() => onSelect(c.candidate_id)}
                      aria-pressed={active}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-paper-3 text-ink" : "text-ink-soft hover:bg-paper-2",
                      )}
                    >
                      {c.name}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {data.rows.map((row) => {
              const target = targetForRow(row, data.target_skills);
              return (
                <tr key={`${row.canonical_id ?? "label"}:${row.skill_name}`}>
                  <th
                    scope="row"
                    className="max-w-[16rem] p-3 align-top text-sm font-medium text-ink"
                  >
                    <span className="truncate">{row.skill_name}</span>
                    {row.aligned_by === "label" && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-normal text-muted">
                        <Unlink className="h-3 w-3" aria-hidden />
                        aligned by skill name, not canonical id
                      </span>
                    )}
                  </th>
                  {data.candidates.map((c) => (
                    <td key={c.candidate_id} className="p-3 align-top">
                      <MatrixCellView
                        cell={row.cells[c.candidate_id]}
                        target={target}
                        evidenceContract={evidenceContract}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MatrixCellView({
  cell,
  target,
  evidenceContract,
}: {
  cell: MatrixCell | undefined;
  target: number;
  evidenceContract: boolean;
}) {
  // No cell, or an explicitly null score → the candidate has no scored tag for
  // this skill. Show an honest placeholder, never a fabricated 0.
  if (!cell || cell.score === null) {
    return <span className="text-xs text-muted">no scored tag yet</span>;
  }

  const band = bandFor(cell.score, target);
  // Route the ungrounded score through the same contract TagSidePanel uses.
  const node = evidenceNode(cell.score, cell.grounded, cell.evidence);
  const unverified = evidenceContract && isUnverifiedScore(node);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums text-ink">
          {Math.round(cell.score)}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums",
            CHIP[band],
          )}
        >
          {band}
        </span>
      </div>
      {cell.demonstrated_proficiency && (
        <p className="text-[11px] text-muted">{cell.demonstrated_proficiency}</p>
      )}
      {unverified && (
        <span
          className="inline-flex items-center gap-1 text-[10px] text-muted"
          aria-label="Score unverified"
        >
          <CircleDashed className="h-3 w-3" aria-hidden />
          unverified
        </span>
      )}
    </div>
  );
}

// ── Per-candidate scorecard editor ─────────────────────────────────────────

function ScorecardEditor({
  programId,
  candidateId,
  candidateName,
  evidenceContract,
}: {
  programId: string;
  candidateId: string;
  candidateName: string;
  evidenceContract: boolean;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ScorecardRow[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [drafts, setDrafts] = useState<ScorecardRow[] | null>(null);

  const scorecard = useQuery({
    queryKey: ["scorecard", programId, candidateId],
    queryFn: () => scorecardApi.getScorecard(programId, candidateId),
    enabled: !!programId && !!candidateId,
  });

  // Local editable copy of the saved rows; reset when the doc (or candidate) changes.
  useEffect(() => {
    if (scorecard.data) setRows(scorecard.data.rows);
    setDrafts(null);
  }, [scorecard.data]);

  const prefillStatus = useQuery({
    queryKey: ["scorecard-prefill-status", programId, candidateId],
    queryFn: () => scorecardApi.getPrefillStatus(programId, candidateId),
    enabled: !!programId && !!candidateId,
  });

  const save = useMutation({
    mutationFn: () => scorecardApi.saveScorecard(programId, candidateId, rows),
    onSuccess: (saved) => qc.setQueryData(["scorecard", programId, candidateId], saved),
  });

  const addNote = useMutation({
    mutationFn: (body: string) => scorecardApi.addNote(programId, candidateId, body),
    onSuccess: (saved) => {
      qc.setQueryData(["scorecard", programId, candidateId], saved);
      setNoteBody("");
    },
  });

  const prefill = useMutation({
    mutationFn: () => scorecardApi.runPrefill(programId, candidateId),
    onSuccess: (res) => setDrafts(res.rows),
  });

  const setRating = (skillId: string, value: number) =>
    setRows((prev) =>
      prev.map((r) =>
        r.skill_id === skillId ? { ...r, rating: Math.max(0, Math.min(100, value)) } : r,
      ),
    );

  const setNote = (skillId: string, value: string) =>
    setRows((prev) => prev.map((r) => (r.skill_id === skillId ? { ...r, note: value } : r)));

  return (
    <section aria-label="Scorecard" className="rounded-lg border border-rule bg-paper p-5">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Scorecard</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{candidateName}</h2>
        </div>
        {prefillStatus.data?.enabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => prefill.mutate()}
            disabled={prefill.isPending}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {prefill.isPending ? "Drafting…" : "AI-prefill draft"}
          </Button>
        )}
      </header>

      {scorecard.isPending ? (
        <p className="mt-4 text-sm text-muted">Loading scorecard…</p>
      ) : scorecard.isError ? (
        <ErrorBanner
          className="mt-4"
          tone="danger"
          title="Could not load this scorecard"
          description={scorecard.error instanceof Error ? scorecard.error.message : undefined}
          retryLabel="Try again"
          onRetry={() => scorecard.refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No skills to score for this candidate yet.</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-rule">
            {rows.map((row) => {
              const node = evidenceNode(
                row.rating,
                row.grounded,
                row.evidence_refs.map((e) => e.quote),
              );
              const unverified = evidenceContract && isUnverifiedScore(node);
              return (
                <li key={row.skill_id} className="space-y-2 py-4 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{row.skill_name}</span>
                    <label className="flex items-center gap-2 text-[11px] text-muted">
                      rating
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={row.rating}
                        onChange={(e) => setRating(row.skill_id, Number(e.target.value))}
                        aria-label={`Rating for ${row.skill_name}`}
                        className="h-9 w-20 font-mono tabular-nums"
                      />
                    </label>
                  </div>
                  <Textarea
                    value={row.note}
                    onChange={(e) => setNote(row.skill_id, e.target.value)}
                    placeholder="Add a note for this skill"
                    aria-label={`Note for ${row.skill_name}`}
                    className="min-h-16 text-sm"
                  />
                  {/* Ungrounded rating → the same honest marker TagSidePanel shows. */}
                  {unverified && (
                    <UnverifiedMark reason="Model assessment from the interview, not independently checked." />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="gold"
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Save scorecard"}
            </Button>
            {save.isError && (
              <span className="text-xs text-danger">
                {save.error instanceof Error ? save.error.message : "Could not save"}
              </span>
            )}
            {save.isSuccess && <span className="text-xs text-muted">Saved.</span>}
          </div>

          {drafts && drafts.length > 0 && (
            <div className="mt-5 rounded-md border border-rule bg-paper-2 p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink">AI-prefill drafts</p>
                <span className="rounded-sm bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-warning">
                  draft, unverified
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {drafts.map((d) => (
                  <li key={d.skill_id} className="text-sm">
                    <span className="font-medium text-ink">{d.skill_name}</span>
                    {d.note && <span className="text-ink-soft"> — {d.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <NotesThread
            notes={scorecard.data?.notes ?? []}
            value={noteBody}
            onChange={setNoteBody}
            onAdd={() => addNote.mutate(noteBody)}
            pending={addNote.isPending}
          />
        </>
      )}
    </section>
  );
}

function NotesThread({
  notes,
  value,
  onChange,
  onAdd,
  pending,
}: {
  notes: { author_email: string; at: string; body: string }[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  pending: boolean;
}) {
  return (
    <div className="mt-6 border-t border-rule pt-4">
      <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Notes</p>
      {notes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {notes.map((n, i) => (
            <li key={`${n.author_email}:${n.at}:${i}`} className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink">{n.author_email}</span>
                <span className="font-mono text-[11px] text-muted">{n.at}</span>
              </div>
              <p className="text-sm text-ink-soft">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 space-y-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Add a note"
          aria-label="Add a note"
          className="min-h-16 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={pending || value.trim().length === 0}
        >
          {pending ? "Adding…" : "Add note"}
        </Button>
      </div>
    </div>
  );
}
