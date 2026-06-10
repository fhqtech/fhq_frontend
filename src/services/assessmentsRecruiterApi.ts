/**
 * Recruiter-facing assessment API.
 * Auth: workspace JWT (`auth_token`) — distinct from the candidate client
 * (assessmentsApi.ts uses `candidate_auth_token`). Never reuse one for the other.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export type AssessmentMode = "scenario" | "case" | "work_sample" | "defense";

export interface AssignAssessmentBody {
  item_id: string;
  mode: AssessmentMode;
  candidates: { email: string; name?: string }[];
  domain?: string;
  workspace_id?: string;
  project_id?: string;
  blueprint_id?: string;
  title?: string;
}

export interface AssignAssessmentResult {
  success: boolean;
  assigned: number;
  assignments: { id: string; email: string }[];
}

export const assessmentsRecruiterApi = {
  /** Assign one assessment item to candidates (rides the invitation rails). */
  async assignAssessment(body: AssignAssessmentBody): Promise<AssignAssessmentResult> {
    const r = await fetch(`${API_BASE_URL}/api/invitation/assessments/assign`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let detail = `Could not assign assessment (${r.status})`;
      try {
        detail = (await r.json())?.detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return r.json();
  },

  /** Fused cross-mode skill profile for a candidate (recruiter view). */
  async getFusedProfile(candidateId: string): Promise<ProfileResponse> {
    const r = await fetch(
      `${API_BASE_URL}/api/assessments/recruiter/profile/${encodeURIComponent(candidateId)}`,
      { headers: authHeaders() },
    );
    if (!r.ok) {
      let detail = `Could not load profile (${r.status})`;
      try {
        detail = (await r.json())?.detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return r.json();
  },
};

export interface ProfileClaim {
  canonical_id?: string;
  skill_name: string;
  value: number;
  confidence: number;
  modes: string[];
  conflict: boolean;
}

export interface ProfileResponse {
  success: boolean;
  candidate_id: string;
  evidence_count: number;
  claims: ProfileClaim[];
}
