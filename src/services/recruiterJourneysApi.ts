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
  /** Existing candidate to enroll. Omit when enrolling a new candidate by email. */
  candidate_id?: string;
  account_id?: string;
  /** Enroll a new candidate by email — the backend mints a candidate_id anchor
   *  and reconciles the journey to their account by email once they register. */
  email?: string;
  name?: string;
}

export interface EnrollResult {
  journey_instance_id: string;
  current_stage_id: string;
}

/**
 * One fused skill claim from the candidate's role-TAG. `value` is the 0–100
 * score the TAG thresholds key off (>=80 strong, 50–79 developing, <50 gap);
 * `confidence` is the evidence-weighted certainty in that value.
 */
export interface RoleTagClaim {
  canonical_id: string;
  skill_name: string;
  value: number;
  confidence: number;
}

/** The candidate's fused role-TAG for a program (skills + evidence counts). */
export interface RoleTag {
  candidate_id: string;
  program_id: string;
  claims: RoleTagClaim[];
  skill_count: number;
  evidence_count: number;
}

/**
 * A rule-suggested next move for a journey. Rules recommend; the human
 * decides — `explanation` is the why, `action` + `to_stage_id` is the move.
 */
export interface JourneyRecommendation {
  rule_id: string;
  from_stage_id: string;
  action: GatingAction;
  to_stage_id: string;
  explanation: string;
}

/** The manual decisions a recruiter can apply to the current stage. */
export type DecisionAction = "advance" | "skip" | "reject";

export interface DecisionBody {
  stage_id: string;
  action: DecisionAction | GatingAction;
  to_stage_id?: string;
  reason?: string;
}

export interface DecisionResult {
  journey_instance_id: string;
  status: string;
  current_stage_id: string;
  applied: boolean;
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
  /** Raw stage instances from the candidate journey. `status` drives the stage
   *  runner: `unlocked` is startable; `in_progress` is awaiting the candidate. */
  stages?: Array<{
    stage_id: string;
    type?: string;
    title?: string;
    status: string; // locked | unlocked | in_progress | complete | skipped | failed
    engine_artifact_ref?: string | null;
    candidate_action_url?: string | null;
  }>;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Result of starting a stage — the provisioned artifact + candidate deep link. */
export interface StartStageResult {
  journey_instance_id: string;
  stage_id: string;
  artifact_ref: string;
  candidate_action_url?: string | null;
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

  /** Fused role-TAG for one candidate within a program (skills + evidence). */
  async getRoleTag(ws: string, programId: string, candidateId: string): Promise<RoleTag> {
    const r = await fetch(
      `${programsBase(ws)}/${programId}/candidates/${candidateId}/tag`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load profile"));
    return r.json();
  },

  /** Rule-suggested next moves for a journey instance. */
  async getRecommendations(
    ws: string,
    programId: string,
    journeyInstanceId: string,
  ): Promise<JourneyRecommendation[]> {
    const r = await fetch(
      `${programsBase(ws)}/${programId}/journeys/${journeyInstanceId}/recommendations`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load recommendations"));
    const data = await r.json();
    return (data?.recommendations ?? []) as JourneyRecommendation[];
  },

  /**
   * Start a candidate's stage — provisions the underlying engine artifact
   * (e.g. generates the practical + invites the candidate) and moves the stage
   * to in_progress. Returns the artifact ref + the candidate's deep-link URL.
   */
  async startStage(
    ws: string,
    programId: string,
    journeyInstanceId: string,
    stageId: string,
  ): Promise<StartStageResult> {
    const r = await fetch(
      `${programsBase(ws)}/${programId}/journeys/${journeyInstanceId}/stages/${stageId}/start`,
      { method: "POST", headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not start this stage"));
    return r.json();
  },

  /** Apply a human decision (confirmed recommendation or manual override). */
  async postDecision(
    ws: string,
    programId: string,
    journeyInstanceId: string,
    body: DecisionBody,
  ): Promise<DecisionResult> {
    const r = await fetch(
      `${programsBase(ws)}/${programId}/journeys/${journeyInstanceId}/decisions`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not apply decision"));
    return r.json();
  },
};
