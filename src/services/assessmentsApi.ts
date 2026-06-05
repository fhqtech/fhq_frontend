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
};
