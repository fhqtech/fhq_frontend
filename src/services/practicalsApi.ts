/**
 * Practicals API — recruiter-facing unified-evaluation flow.
 * Auth: workspace JWT (`auth_token`). All routes are workspace + project scoped.
 *
 * Backend routers return raw service dicts (no response_model), so the
 * generated OpenAPI types are untyped objects. The shapes below are
 * hand-written from the routers in ../recruiter-assist-backend/.../practical*.py
 * Casing is mixed on purpose: recruiter CRUD docs are camelCase
 * (jobDescription, assignmentStatus, registrationUrl), but the
 * submission / report layer is snake_case (submission_id, candidate_id,
 * overall_score, concept_verdicts).
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

export type PracticalFormat = "case_study" | "assignment" | "challenge" | "scenario";

export type AssignmentStatus = "generating" | "ready" | "failed";

export interface CreatePracticalBody {
  title: string;
  jobDescription: string;
  format?: PracticalFormat | null;
  domain?: string;
}

export interface Practical {
  id: string;
  title: string;
  jobDescription?: string;
  format?: string | null;
  domain?: string;
  status?: string;
  /** Set only after generate-assignment runs. */
  assignmentStatus?: AssignmentStatus;
  assignmentError?: string | null;
  assignmentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreatePracticalResult {
  success: boolean;
  practicalId: string;
  status: string;
}

/** The Gemini-generated brief — the task the candidate sees. For recruiter review. */
export interface PracticalAssignment {
  ready: boolean;
  task_brief?: string | null;
  expected_artifacts?: string[];
  estimated_effort_min?: number | null;
  format?: string | null;
  understanding_map?: Array<{ concept?: string; load_bearing?: boolean }>;
}

export interface PracticalInvitation {
  invitation_id: string;
  name: string;
  email: string;
  token: string;
  registrationUrl: string;
}

export interface Submission {
  submission_id: string;
  practical_id?: string;
  candidate_id: string;
  status: string; // in_progress | submitted | defending | synthesizing | report_ready
  artifact_refs?: string[];
  provenance?: { ai_tools_disclosed?: string[]; approach_note?: string };
  durationSeconds?: number | null;
  [key: string]: unknown;
}

export interface ConceptVerdict {
  concept: string;
  understood: boolean;
  score: number;
  evidence_quote: string;
  grounding_ratio: number;
  note: string;
}

export interface DefenseReport {
  submission_id: string;
  practical_id?: string;
  overall_score: number;
  recommendation: "strong_hire" | "advance_with_concerns" | "borderline" | "reject";
  concept_verdicts: ConceptVerdict[];
  integrity_flags: string[];
  grounding_rate: number;
  [key: string]: unknown;
}

const scope = (ws: string, pr: string) =>
  `${API_BASE_URL}/api/workspaces/${ws}/projects/${pr}/practicals`;

export const practicalsApi = {
  async createPractical(
    ws: string,
    pr: string,
    body: CreatePracticalBody,
  ): Promise<CreatePracticalResult> {
    const r = await fetch(scope(ws, pr), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not create practical"));
    return r.json();
  },

  async listPracticals(ws: string, pr: string): Promise<Practical[]> {
    const r = await fetch(scope(ws, pr), { headers: authHeaders() });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load practicals"));
    const data = await r.json();
    return (data?.practicals ?? []) as Practical[];
  },

  async getPractical(ws: string, pr: string, practicalId: string): Promise<Practical> {
    const r = await fetch(`${scope(ws, pr)}/${practicalId}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load practical"));
    return r.json();
  },

  /** The generated brief (task the candidate sees) — for recruiter review. */
  async getAssignment(ws: string, pr: string, practicalId: string): Promise<PracticalAssignment> {
    const r = await fetch(`${scope(ws, pr)}/${practicalId}/assignment`, { headers: authHeaders() });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load assignment"));
    return r.json();
  },

  /** Async (202). Poll getPractical until assignmentStatus === "ready". */
  async generateAssignment(
    ws: string,
    pr: string,
    practicalId: string,
  ): Promise<{ success: boolean; status: string; practicalId: string }> {
    const r = await fetch(`${scope(ws, pr)}/${practicalId}/generate-assignment`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not start assignment generation"));
    return r.json();
  },

  async inviteCandidates(
    ws: string,
    pr: string,
    practicalId: string,
    candidates: Array<{ name: string; email: string }>,
  ): Promise<{ invitations: PracticalInvitation[]; count: number }> {
    const r = await fetch(`${scope(ws, pr)}/${practicalId}/invite-candidates`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ candidates }),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not invite candidates"));
    return r.json();
  },

  async listSubmissions(ws: string, pr: string, practicalId: string): Promise<Submission[]> {
    const r = await fetch(`${scope(ws, pr)}/${practicalId}/submissions`, {
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load submissions"));
    const data = await r.json();
    return (data?.submissions ?? []) as Submission[];
  },

  async planProbes(
    ws: string,
    pr: string,
    practicalId: string,
    submissionId: string,
  ): Promise<{ success: boolean; submissionId: string; probeCount: number; groundingRate: number }> {
    const r = await fetch(
      `${scope(ws, pr)}/${practicalId}/submissions/${submissionId}/probe-plan`,
      { method: "POST", headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not plan probes"));
    return r.json();
  },

  async synthesize(
    ws: string,
    pr: string,
    practicalId: string,
    submissionId: string,
  ): Promise<{
    success: boolean;
    submissionId: string;
    overallScore: number;
    recommendation: string;
    groundingRate: number;
  }> {
    const r = await fetch(
      `${scope(ws, pr)}/${practicalId}/submissions/${submissionId}/synthesize`,
      { method: "POST", headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not synthesize report"));
    return r.json();
  },

  async getReport(
    ws: string,
    pr: string,
    practicalId: string,
    submissionId: string,
  ): Promise<DefenseReport> {
    const r = await fetch(
      `${scope(ws, pr)}/${practicalId}/submissions/${submissionId}/report`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load report"));
    return r.json();
  },
};
