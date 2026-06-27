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
  status: StageStatus;
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

export const journeysApi = {
  /** Journeys for the signed-in candidate across every workspace. */
  async getMyJourneys(): Promise<MyJourneysResponse> {
    const r = await fetch(`${API_BASE_URL}/api/candidate-me/journeys`, {
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load your journeys."));
    const data = await r.json();
    return {
      journeys: Array.isArray(data?.journeys) ? data.journeys : [],
      count: typeof data?.count === "number" ? data.count : (data?.journeys?.length ?? 0),
    };
  },
};

/** Convenience named export mirroring the prompt's getMyJourneys() ask. */
export const getMyJourneys = journeysApi.getMyJourneys;
