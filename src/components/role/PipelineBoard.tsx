/**
 * P2-2 — typed-column pipeline board. Promotes the existing Programs/Journeys
 * engine to a Kanban: one column per template stage (in order), each candidate's
 * journey card under its current stage. Pure presentation over the program's
 * stages + journeys; grouping is groupJourneysByStage (never drops a candidate).
 *
 * Engine contract (pinned by tests/test_p2_pipeline_gates.py): advance is linear
 * and `decision` stages have no start adapter, so this board is a read/triage
 * surface here; per-stage start/decision actions land in the integration pass.
 */
import { cn } from "@/lib/utils";
import { groupJourneysByStage } from "@/lib/stageColumns";
import { journeyAction } from "@/lib/journeyAction";
import type { JourneyStage, JourneyInstance } from "@/services/recruiterJourneysApi";

export interface PipelineBoardProps {
  stages: JourneyStage[];
  journeys: JourneyInstance[];
  onOpenCandidate?: (journey: JourneyInstance) => void;
  /** Provision the candidate's current stage + invite them (the `start` action). */
  onStart?: (journey: JourneyInstance) => void;
}

export function PipelineBoard({ stages, journeys, onOpenCandidate, onStart }: PipelineBoardProps) {
  const ordered = [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const columns = groupJourneysByStage(ordered, journeys);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map(({ stage, journeys: items }) => (
        <section key={stage.stage_id} className="w-64 shrink-0">
          <header className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink">{stage.title}</h3>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{stage.type}</p>
            </div>
            <span className="font-mono tabular-nums text-xs text-ink-soft">{items.length}</span>
          </header>
          <div className="min-h-24 space-y-2 rounded-md border border-rule bg-paper-2 p-2">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted">No one here yet</p>
            ) : (
              items.map((j) => {
                const action = journeyAction(j, ordered);
                return (
                  <div
                    key={j.journey_instance_id}
                    className="w-full rounded-md border border-rule bg-paper px-3 py-2 transition-colors hover:border-gold-ink"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenCandidate?.(j)}
                      className="block w-full truncate text-left text-sm font-medium text-ink"
                    >
                      {j.candidate_name || j.candidate_id}
                    </button>
                    {action.kind === "start" ? (
                      <button
                        type="button"
                        onClick={() => onStart?.(j)}
                        className="mt-1 inline-block rounded-sm bg-gold-soft px-1.5 py-0.5 text-[10px] font-medium text-gold-ink transition-colors hover:bg-gold-ink hover:text-paper"
                      >
                        {action.label}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                          action.terminal ? "bg-paper-3 text-muted" : "bg-gold-soft text-gold-ink",
                        )}
                      >
                        {action.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
