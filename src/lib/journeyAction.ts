/**
 * P2-5 — resolve a candidate's journey into a single next-best-action verb for
 * the role board. Terminal journeys show their outcome; a decision stage is a
 * manual call (no engine start, per the board-contract gates); engine-backed
 * stages show Start until the stage completes, then Advance.
 */
/** What kind of move the action is — drives whether the board offers a button.
 * `start` provisions the current stage's engine artifact + invites the candidate. */
export type JourneyActionKind =
  | "start"
  | "advance"
  | "decide"
  | "progress"
  | "review"
  | "outcome"
  | "open";

export interface JourneyAction {
  label: string;
  terminal: boolean;
  kind: JourneyActionKind;
}

interface JourneyLike {
  status?: string;
  current_stage_id?: string;
  stages?: Array<{ stage_id: string; type?: string; status?: string }>;
}

interface StageLike {
  stage_id: string;
  type: string;
  title: string;
}

const OUTCOME: Record<string, string> = {
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  completed: "Completed",
};

export function journeyAction(journey: JourneyLike, stages: StageLike[]): JourneyAction {
  if (journey.status && OUTCOME[journey.status]) {
    return { label: OUTCOME[journey.status], terminal: true, kind: "outcome" };
  }

  const current = stages.find((s) => s.stage_id === journey.current_stage_id);
  if (!current) return { label: "Open", terminal: false, kind: "open" };

  if (current.type === "decision") return { label: "Decide", terminal: false, kind: "decide" };

  const instStatus = journey.stages?.find((s) => s.stage_id === journey.current_stage_id)?.status;
  if (instStatus === "in_progress") return { label: "In progress", terminal: false, kind: "progress" };
  if (instStatus === "complete" || instStatus === "passed") return { label: "Advance", terminal: false, kind: "advance" };
  if (instStatus === "failed") return { label: "Review", terminal: false, kind: "review" };

  return { label: `Start ${current.title.toLowerCase()}`, terminal: false, kind: "start" };
}
