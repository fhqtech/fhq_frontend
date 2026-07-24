import type { JourneyInstance } from "@/services/recruiterJourneysApi";

/**
 * Best available score for a candidate journey, client-derived from
 * stage_progress (there is no single per-journey score field): the current
 * stage's recorded score if present, else the highest score across completed
 * stages, else null (not assessed). Shared by the pipeline board and table so
 * both render the same number through ScoreChip.
 */
export function currentScore(j: JourneyInstance): number | null {
  const sp = j.stage_progress ?? [];
  const cur = sp.find((s) => s.stage_id === j.current_stage_id && s.score != null);
  if (cur?.score != null) return cur.score;
  const scored = sp.filter((s) => s.score != null).map((s) => s.score as number);
  return scored.length ? Math.max(...scored) : null;
}
