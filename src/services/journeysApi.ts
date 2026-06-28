/**
 * Candidate journeys API — candidate-facing.
 *
 * Auth: candidate JWT (`candidate_auth_token`). Shape hand-written from the
 * backend router that serves GET /api/candidate-me/journeys. Each journey is
 * a multi-stage program instance the candidate is progressing through; the
 * timeline UI renders one rail per journey.
 *
 * Mirrors the hand-written client pattern in practicalDefenseApi.ts (same
 * token key, same FastAPI-aware error extraction).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("candidate_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function detailFrom(r: Response, fallback: string): Promise<string> {
  try {
    const data: Record<string, unknown> = await r.json();
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      // FastAPI validation errors arrive as a list of {msg, loc, ...} objects.
      const msgs = detail
        .map((d) =>
          d && typeof d === "object" && typeof (d as Record<string, unknown>).msg === "string"
            ? ((d as Record<string, unknown>).msg as string)
            : typeof d === "string"
              ? d
              : null,
        )
        .filter((m): m is string => Boolean(m));
      if (msgs.length) return msgs.join("; ");
    }
    if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
      if (typeof d.error === "string") return d.error;
    }
    if (typeof detail === "string") return detail;
    if (typeof data?.error === "string") return data.error;
    return fallback;
  } catch {
    return fallback;
  }
}

/** Lifecycle of a single stage within a journey. */
export type StageStatus = "done" | "current" | "locked";

/**
 * Stage kind. The integration pass maps each type to its deep-link target
 * (interview / assessment / work-sample / defense / …); kept open as a string
 * so a new backend stage type never breaks the client.
 */
export type JourneyStageType = string;

export interface JourneyStage {
  stage_id: string;
  type: JourneyStageType;
  title: string;
  /** Normalised tri-state the rail renders (derived from the backend status
   *  + current_stage_id by {@link normaliseStage}). */
  status: StageStatus;
  /** Raw backend stage status (locked|unlocked|in_progress|complete|skipped|failed). */
  raw_status?: string;
  /** Candidate-facing deep link to act on this stage (e.g. the practical
   *  registration URL). Present once the stage has been started. */
  candidate_action_url?: string | null;
  /** The underlying engine artifact id (practical_id / interview_id). */
  engine_artifact_ref?: string | null;
}

export interface JourneyInstance {
  journey_instance_id: string;
  program_id: string;
  status: string;
  current_stage_id: string | null;
  current_stage_index: number;
  total_stages: number;
  stages: JourneyStage[];
  workspace_id: string;
  project_id: string;
}

export interface MyJourneysResponse {
  journeys: JourneyInstance[];
  count: number;
}

/**
 * Map a raw backend stage (status in locked|unlocked|in_progress|complete|
 * skipped|failed) to the rail's tri-state. The current stage is whichever
 * matches the journey's current_stage_id; finished stages are "done"; the
 * rest are "locked". Carries the deep-link fields through untouched.
 */
function normaliseStage(s: Record<string, unknown>, currentStageId: string | null): JourneyStage {
  const raw = typeof s.status === "string" ? s.status : "";
  let status: StageStatus;
  if (s.stage_id === currentStageId) status = "current";
  else if (raw === "complete" || raw === "skipped" || raw === "failed") status = "done";
  else status = "locked";
  return {
    stage_id: String(s.stage_id ?? ""),
    type: String(s.type ?? ""),
    title: typeof s.title === "string" ? s.title : "",
    status,
    raw_status: raw,
    candidate_action_url:
      typeof s.candidate_action_url === "string" ? s.candidate_action_url : null,
    engine_artifact_ref:
      typeof s.engine_artifact_ref === "string" ? s.engine_artifact_ref : null,
  };
}

function normaliseJourney(j: Record<string, unknown>): JourneyInstance {
  const currentStageId = (j.current_stage_id as string | null) ?? null;
  const rawStages = Array.isArray(j.stages) ? (j.stages as Record<string, unknown>[]) : [];
  return {
    journey_instance_id: String(j.journey_instance_id ?? ""),
    program_id: String(j.program_id ?? ""),
    status: String(j.status ?? ""),
    current_stage_id: currentStageId,
    current_stage_index: typeof j.current_stage_index === "number" ? j.current_stage_index : 0,
    total_stages: typeof j.total_stages === "number" ? j.total_stages : rawStages.length,
    stages: rawStages.map((s) => normaliseStage(s, currentStageId)),
    workspace_id: String(j.workspace_id ?? ""),
    project_id: String(j.project_id ?? ""),
  };
}

/** Grounded-interview payload — the candidate's submitted work shown alongside
 *  a journey voice interview. `grounded` is false for a standard interview. */
export interface InterviewGrounding {
  grounded: boolean;
  submission_text: string | null;
  submission_sections: Array<{
    section_id: string;
    char_start?: number;
    char_end?: number;
    preview_text?: string;
  }>;
}

export const journeysApi = {
  /** Journeys for the signed-in candidate across every workspace. */
  async getMyJourneys(): Promise<MyJourneysResponse> {
    const r = await fetch(`${API_BASE_URL}/api/candidate-me/journeys`, {
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load your journeys."));
    const data = await r.json();
    const rawJourneys = Array.isArray(data?.journeys) ? data.journeys : [];
    return {
      journeys: rawJourneys.map(normaliseJourney),
      count: typeof data?.count === "number" ? data.count : rawJourneys.length,
    };
  },

  /**
   * Grounded-interview payload for one interview (the candidate's submitted work
   * shown alongside the voice interview). Returns `grounded:false` for a standard
   * interview. Best-effort by the caller — a failure just means no panel.
   */
  async getInterviewGrounding(interviewId: string): Promise<InterviewGrounding> {
    const r = await fetch(
      `${API_BASE_URL}/api/candidate-me/interviews/${encodeURIComponent(interviewId)}/grounding`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load interview context."));
    const data = await r.json();
    return {
      grounded: !!data?.grounded,
      submission_text: typeof data?.submission_text === "string" ? data.submission_text : null,
      submission_sections: Array.isArray(data?.submission_sections) ? data.submission_sections : [],
    };
  },
};

/** Convenience named export mirroring the prompt's getMyJourneys() ask. */
export const getMyJourneys = journeysApi.getMyJourneys;
