export interface NowDiscussingCueProps {
  skillLabel: string;
  questionIndex: number;
  questionTotal: number;
}

/**
 * Candidate-facing "now discussing: <skill> · question N of M" cue, driven by
 * the defense active_probe event. Candidate-safe by construction — it only ever
 * receives the skill label + question progress, never the rubric or rationale.
 */
export function NowDiscussingCue({ skillLabel, questionIndex, questionTotal }: NowDiscussingCueProps) {
  if (!skillLabel) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-ink/70 px-3 py-1 text-xs text-paper">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-line">
        now discussing
      </span>
      <span>{skillLabel}</span>
      {questionTotal > 0 && (
        <span className="font-mono tabular-nums text-paper/70">
          · question {questionIndex} of {questionTotal}
        </span>
      )}
    </div>
  );
}
