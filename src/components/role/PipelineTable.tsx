/**
 * PipelineTable — the table half of the role pipeline's dual view (the kanban
 * half is PipelineBoard). One row per candidate journey, sortable-at-a-glance
 * columns: candidate, current stage, score, action/status. Same props as
 * PipelineBoard so RoleContainer can swap them behind a view toggle.
 *
 * Score is client-derived from stage_progress (no separate per-journey score
 * field) and rendered through the shared ScoreChip so bands match everywhere.
 */
import { cn } from "@/lib/utils";
import { journeyAction } from "@/lib/journeyAction";
import { ScoreChip } from "@/components/ui/score-chip";
import type { JourneyStage, JourneyInstance } from "@/services/recruiterJourneysApi";

export interface PipelineTableProps {
  stages: JourneyStage[];
  journeys: JourneyInstance[];
  onOpenCandidate?: (journey: JourneyInstance) => void;
  onStart?: (journey: JourneyInstance) => void;
}

/** Best available score for a journey: the current stage's recorded score,
 * else the highest score across completed stages, else null (not assessed). */
function currentScore(j: JourneyInstance): number | null {
  const sp = j.stage_progress ?? [];
  const cur = sp.find((s) => s.stage_id === j.current_stage_id && s.score != null);
  if (cur?.score != null) return cur.score;
  const scored = sp.filter((s) => s.score != null).map((s) => s.score as number);
  return scored.length ? Math.max(...scored) : null;
}

export function PipelineTable({ stages, journeys, onOpenCandidate, onStart }: PipelineTableProps) {
  const ordered = [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const stageById = new Map(ordered.map((s) => [s.stage_id, s]));

  if (journeys.length === 0) {
    return (
      <p className="rounded-md border border-rule bg-paper-2 px-4 py-8 text-center text-sm text-muted">
        No candidates in this role yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-paper">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-rule text-left">
            <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-muted">Candidate</th>
            <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-muted">Current stage</th>
            <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-muted">Score</th>
            <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wide text-muted">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {journeys.map((j) => {
            const stage = stageById.get(j.current_stage_id);
            const action = journeyAction(j, ordered);
            return (
              <tr key={j.journey_instance_id} className="transition-colors hover:bg-paper-2">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenCandidate?.(j)}
                    className="max-w-[16rem] truncate text-left font-medium text-ink hover:text-gold-ink"
                  >
                    {j.candidate_name || j.candidate_id}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {stage ? (
                    <span className="text-ink-soft">{stage.title}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ScoreChip score={currentScore(j)} size="sm" />
                </td>
                <td className="px-4 py-3 text-right">
                  {action.kind === "start" ? (
                    <button
                      type="button"
                      onClick={() => onStart?.(j)}
                      className="inline-block rounded-sm bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold-ink transition-colors hover:bg-gold-ink hover:text-paper"
                    >
                      {action.label}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "inline-block rounded-sm px-2 py-0.5 text-xs font-medium",
                        action.terminal ? "bg-paper-3 text-muted" : "bg-gold-soft text-gold-ink",
                      )}
                    >
                      {action.label}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
