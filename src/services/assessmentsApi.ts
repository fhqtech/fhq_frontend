/**
 * Candidate-facing assessment API (A1/A2).
 * Auth: candidate JWT (`candidate_auth_token`).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("candidate_auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export interface ScenarioOptionView {
  id: string;
  text: string;
}

export interface ScenarioView {
  id: string;
  prompt: string;
  response_type: "keyed" | "open";
  difficulty: string;
  options: ScenarioOptionView[];
}

export interface ScenarioScoreBody {
  candidate_id: string;
  scenario_id: string;
  session_id?: string;
  domain?: string;
  chosen_option_id?: string;
  response?: string;
}

export interface RubricCriterionView {
  id: string;
  label: string;
  weight: number;
  canonical_ids: string[];
}

export interface ArtifactItemView {
  id: string;
  mode: "case" | "work_sample";
  difficulty: string;
  task_brief: string;
  criteria: RubricCriterionView[];
}

export interface SkillEntry {
  canonical_id?: string;
  skill_name: string;
  value: number;
  confidence: number;
  modes: string[];
  status: "strong" | "developing" | "gap" | "unproven" | "conflicting";
}

export interface ImprovementStep {
  title: string;
  type: string;
  detail: string;
}

export interface PracticeRef {
  item_id: string;
  mode: string;
  domain: string;
}

export interface ImprovementItem {
  skill_canonical_id?: string;
  skill_name: string;
  current_value: number;
  target_value: number;
  status: string;
  rationale: string;
  steps: ImprovementStep[];
  practice?: PracticeRef | null;
}

export interface SkillJourney {
  fused_tag: { nodes: any[] };
  strengths: SkillEntry[];
  gaps: SkillEntry[];
  improvement_plan: ImprovementItem[];
  skill_count: number;
  sources_count: { interview: number; assessment: number };
  evidence_count: number;
  practice_candidate_id?: string | null;
}

export const assessmentsApi = {
  async getScenario(scenarioId: string, domain = "finance"): Promise<ScenarioView> {
    const r = await fetch(
      `${API_BASE_URL}/api/assessments/scenario/${encodeURIComponent(scenarioId)}?domain=${encodeURIComponent(domain)}`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(r.status === 404 ? "Scenario not found" : `Could not load scenario (${r.status})`);
    return r.json();
  },

  /** Submit + score. Returns success only — the score itself is never shown to the candidate (CR-04). */
  async scoreScenario(body: ScenarioScoreBody): Promise<{ success: boolean }> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/scenario/score`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let detail = `Submission failed (${r.status})`;
      try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return { success: true };
  },

  /** The candidate's unified skill journey: fused TAG + strengths/gaps + improvement plan. */
  async getSkillJourney(): Promise<SkillJourney> {
    const r = await fetch(`${API_BASE_URL}/api/candidate-me/skill-journey`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`Could not load your skill journey (${r.status})`);
    return r.json();
  },

  /** Fetch a case / work-sample item (answer key + anchors stripped server-side). */
  async getArtifactItem(itemId: string, domain = "finance"): Promise<ArtifactItemView> {
    const r = await fetch(
      `${API_BASE_URL}/api/assessments/artifact/${encodeURIComponent(itemId)}?domain=${encodeURIComponent(domain)}`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(r.status === 404 ? "Item not found" : `Could not load item (${r.status})`);
    return r.json();
  },

  /** Upload a deliverable; returns the GCS artifact_ref to pass to submitArtifact. */
  async uploadArtifact(candidateId: string, itemId: string, file: File): Promise<{ artifact_ref: string }> {
    const token = localStorage.getItem("candidate_auth_token");
    const form = new FormData();
    form.append("candidate_id", candidateId);
    form.append("item_id", itemId);
    form.append("file", file);
    // NB: no Content-Type header — the browser sets the multipart boundary.
    const r = await fetch(`${API_BASE_URL}/api/assessments/artifact/upload`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: form,
    });
    if (!r.ok) {
      let detail = `Upload failed (${r.status})`;
      try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },

  /** Submit a deliverable for scoring (PROVISIONAL — a defense round follows). */
  async submitArtifact(body: {
    candidate_id: string; item_id: string; artifact_ref: string; session_id?: string; domain?: string;
  }): Promise<{ success: boolean; defense_required: boolean }> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/artifact/submit`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(body),
    });
    if (!r.ok) {
      let detail = `Submission failed (${r.status})`;
      try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    const j = await r.json();
    return { success: true, defense_required: j?.defense_required ?? true };
  },

  /** Submit the defense round; finalizes the artifact into a defense-gated score. */
  async submitDefense(body: {
    candidate_id: string; item_id: string; defense_transcript: string; session_id?: string; domain?: string;
  }): Promise<{ success: boolean }> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/defense/submit`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(body),
    });
    if (!r.ok) {
      let detail = `Submission failed (${r.status})`;
      try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return { success: true };
  },

  /** Mark one battery item complete (after a submit) so the dashboard shows N of M done. */
  async markBatteryItem(invitationId: string, itemId: string): Promise<{ done: number; total: number }> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/battery/${encodeURIComponent(invitationId)}/mark`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ item_id: itemId }),
    });
    if (!r.ok) throw new Error(`Could not update progress (${r.status})`);
    return r.json();
  },
};
