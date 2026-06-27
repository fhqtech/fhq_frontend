/**
 * Recruiter Journeys API — program + journey-template + enrollment flow.
 * Auth: workspace JWT (`auth_token`). All routes are workspace scoped;
 * `ws` is the recruiter's activeWorkspaceId (from AuthContext/useAuth).
 *
 * Hand-written from the backend program/journey endpoints. The backend
 * returns raw service dicts (no response_model), so these shapes are the
 * frontend's source of truth. Stage / rule identifiers (`stage_id`,
 * `from_stage_id`, …) are stable backend symbols — don't rename them.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function detailFrom(r: Response, fallback: string): Promise<string> {
  try {
    const data: Record<string, unknown> = await r.json();
    const detail = data?.detail;
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

// ── Domain types ─────────────────────────────────────────────────────────

/** The two evaluation flows. Mirrors the backend `purpose` Literal. */
export type ProgramPurpose = "hiring" | "skill_analysis";

export type ProgramStatus = "draft" | "active" | "archived";

/** A typed stage in the role pipeline. `type` drives the stage's behaviour. */
export type StageType =
  | "screen"
  | "assignment"
  | "review"
  | "interview"
  | "fitment"
  | "decision";

export interface JourneyStage {
  stage_id: string;
  order: number;
  type: StageType;
  title: string;
}

/** Declarative gating rule evaluated when a candidate completes `from_stage_id`. */
export type GatingMetric = "score";
export type GatingOp = ">=" | "<=" | "==";
export type GatingAction = "skip" | "reject" | "unlock";

export interface GatingRule {
  from_stage_id: string;
  metric: GatingMetric;
  op: GatingOp;
  value: number;
  action: GatingAction;
  /** Target stage for skip/unlock. Ignored (may be empty) for reject. */
  to_stage_id: string;
}

export interface CreateProgramBody {
  purpose: ProgramPurpose;
  title: string;
  jdText?: string;
  domain: string;
}

export interface CreateProgramResult {
  program_id: string;
  purpose: ProgramPurpose;
  status: ProgramStatus;
}

export interface Program {
  program_id: string;
  title: string;
  purpose: ProgramPurpose;
  status: ProgramStatus;
  domain?: string;
  jdText?: string;
  stages?: JourneyStage[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface JourneyTemplateBody {
  stages: JourneyStage[];
  rules: GatingRule[];
  version: number;
}

export interface JourneyTemplateResult {
  template_id: string;
  stages: JourneyStage[];
}

export interface EnrollBody {
  candidate_id: string;
  account_id?: string;
}

export interface EnrollResult {
  journey_instance_id: string;
  current_stage_id: string;
}

/** A candidate's live position within a program's pipeline. */
export interface JourneyInstance {
  journey_instance_id: string;
  candidate_id: string;
  candidate_name?: string;
  candidate_email?: string;
  account_id?: string | null;
  current_stage_id: string;
  status: string; // active | rejected | hired | withdrawn | completed
  /** Per-stage progress, when the backend surfaces it. */
  stage_progress?: Array<{
    stage_id: string;
    status: string; // pending | in_progress | passed | failed | skipped
    score?: number | null;
  }>;
  updatedAt?: string;
  [key: string]: unknown;
}

// ── Client ───────────────────────────────────────────────────────────────

const programsBase = (ws: string) => `${API_BASE_URL}/api/workspaces/${ws}/programs`;

export const recruiterJourneysApi = {
  async createProgram(ws: string, body: CreateProgramBody): Promise<CreateProgramResult> {
    const r = await fetch(programsBase(ws), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not create program"));
    return r.json();
  },

  async listPrograms(ws: string): Promise<Program[]> {
    const r = await fetch(programsBase(ws), { headers: authHeaders() });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load programs"));
    const data = await r.json();
    return (data?.programs ?? []) as Program[];
  },

  async getProgram(ws: string, programId: string): Promise<Program> {
    const r = await fetch(`${programsBase(ws)}/${programId}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load program"));
    return r.json();
  },

  async saveJourneyTemplate(
    ws: string,
    programId: string,
    body: JourneyTemplateBody,
  ): Promise<JourneyTemplateResult> {
    const r = await fetch(`${programsBase(ws)}/${programId}/journey-template`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not save journey template"));
    return r.json();
  },

  async enroll(ws: string, programId: string, body: EnrollBody): Promise<EnrollResult> {
    const r = await fetch(`${programsBase(ws)}/${programId}/enroll`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not enroll candidate"));
    return r.json();
  },

  async listJourneys(ws: string, programId: string): Promise<JourneyInstance[]> {
    const r = await fetch(`${programsBase(ws)}/${programId}/journeys`, {
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load journeys"));
    const data = await r.json();
    return (data?.journeys ?? []) as JourneyInstance[];
  },
};
