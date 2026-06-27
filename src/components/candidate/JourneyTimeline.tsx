/**
 * JourneyTimeline — dumb vertical stage rail for one journey.
 *
 * Renders each stage as a node on a connected rail:
 *   - done    → filled check
 *   - current → pulsing ring (front-and-centre card with a CTA + "stage N of M")
 *   - locked  → muted lock icon
 *
 * Presentational only: it takes a fully-resolved journey and a `renderCta`
 * render-prop for the current stage. It owns no data fetching and no routing
 * decisions — the page wires the CTA target in (and the integration pass maps
 * each stage type to its deep link). Motion is transform/opacity only, per the
 * repo motion baseline.
 */
import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import type { JourneyInstance, JourneyStage } from "@/services/journeysApi";

export interface JourneyTimelineProps {
  journey: JourneyInstance;
  /**
   * Render-prop for the current stage's call-to-action. Receives the current
   * stage so the caller decides label ("Start" vs "Continue") and target.
   * Returning null hides the CTA (e.g. terminal journeys with no live stage).
   */
  renderCta?: (stage: JourneyStage) => ReactNode;
  className?: string;
}

/** Human label for a stage type, e.g. "work_sample" → "Work sample". */
function stageTypeLabel(type: string): string {
  if (!type) return "Stage";
  const spaced = type.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function StageNode({ status }: { status: JourneyStage["status"] }) {
  if (status === "done") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-success text-paper shadow-1">
        <Check className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="relative grid h-7 w-7 place-items-center">
        <span className="absolute inline-flex h-7 w-7 animate-ping rounded-full bg-accent/40" aria-hidden />
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-accent bg-paper">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
      </span>
    );
  }
  // locked
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full border border-rule bg-paper-3 text-muted">
      <Lock className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}

export function JourneyTimeline({ journey, renderCta, className = "" }: JourneyTimelineProps) {
  const stages = journey.stages ?? [];
  const total = journey.total_stages || stages.length;

  return (
    <ol className={`relative ${className}`}>
      {stages.map((stage, idx) => {
        const isCurrent = stage.status === "current";
        const isLast = idx === stages.length - 1;
        // 1-based position for the "stage N of M" label. Prefer the backend's
        // current_stage_index when this is the current stage; fall back to
        // array position so the label is right even on partial payloads.
        const position =
          isCurrent && Number.isFinite(journey.current_stage_index)
            ? journey.current_stage_index + 1
            : idx + 1;

        return (
          <li key={stage.stage_id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector rail between nodes */}
            {!isLast && (
              <span
                className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px ${
                  stage.status === "done" ? "bg-success/50" : "bg-rule"
                }`}
                aria-hidden
              />
            )}

            <div className="shrink-0">
              <StageNode status={stage.status} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              {isCurrent ? (
                <div className="rounded-xl border border-accent/40 bg-paper p-4 shadow-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink tabular-nums">
                    Stage {position} of {total}
                  </p>
                  <h4 className="mt-1.5 text-base font-semibold leading-tight text-ink">
                    {stage.title || stageTypeLabel(stage.type)}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted">{stageTypeLabel(stage.type)}</p>
                  {renderCta && <div className="mt-3">{renderCta(stage)}</div>}
                </div>
              ) : (
                <div className="flex items-baseline justify-between gap-3 py-0.5">
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium ${
                        stage.status === "done" ? "text-ink" : "text-muted"
                      }`}
                    >
                      {stage.title || stageTypeLabel(stage.type)}
                    </p>
                    <p className="text-xs text-muted">{stageTypeLabel(stage.type)}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted tabular-nums">
                    {idx + 1}/{total}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default JourneyTimeline;
