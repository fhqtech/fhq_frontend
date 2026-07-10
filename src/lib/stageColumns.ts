/**
 * P2-2 — group candidate journeys into typed stage columns for the pipeline
 * board. One column per template stage, in order; each journey lands in the
 * column matching its current_stage_id. A journey whose stage is not in the
 * template is never dropped: it falls into the last column so it stays visible.
 */
export interface StageColumn<S, J> {
  stage: S;
  journeys: J[];
}

/** Default column label per stage type (the canonical set from StageListEditor). */
const STAGE_LABEL: Record<string, string> = {
  screen: "Screen",
  assignment: "Assignment",
  review: "Review",
  interview: "Interview",
  fitment: "Fitment",
  decision: "Decision",
};

/**
 * P2-2 — append a typed stage to a role's template (append-only). Order follows
 * the current length, giving each stage a distinct order and id; the column
 * label defaults to the stage type's canonical label.
 */
export function appendStage<S extends { stage_id: string; order: number; type: string; title: string }>(
  stages: S[],
  type: string,
  title?: string,
): S[] {
  const order = stages.length;
  const next = { stage_id: `${type}-${order}`, order, type, title: title ?? STAGE_LABEL[type] ?? type } as S;
  return [...stages, next];
}

export function groupJourneysByStage<
  S extends { stage_id: string },
  J extends { current_stage_id?: string | null },
>(stages: S[], journeys: J[]): StageColumn<S, J>[] {
  const columns: StageColumn<S, J>[] = stages.map((stage) => ({ stage, journeys: [] }));
  if (columns.length === 0) return columns;

  const byStageId = new Map<string, StageColumn<S, J>>();
  for (const col of columns) byStageId.set(col.stage.stage_id, col);
  const lastColumn = columns[columns.length - 1];

  for (const journey of journeys) {
    const col = (journey.current_stage_id && byStageId.get(journey.current_stage_id)) || lastColumn;
    col.journeys.push(journey);
  }

  return columns;
}
