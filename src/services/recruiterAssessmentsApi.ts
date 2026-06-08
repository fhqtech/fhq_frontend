/**
 * Recruiter-facing assessment API. Auth: workspace JWT (`auth_token`).
 * Lists assignable assessment items and assigns them to candidates.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export interface CatalogItem {
  id: string;
  mode: "scenario" | "case" | "work_sample" | "defense";
  title: string;
  status: "curated" | "draft" | "fixture";
  difficulty?: string;
  response_type?: "keyed" | "open";
  canonical_ids?: string[];
}

export interface AssignCandidate {
  name: string;
  email: string;
}

export const recruiterAssessmentsApi = {
  async getCatalog(domain = "finance"): Promise<CatalogItem[]> {
    const r = await fetch(
      `${API_BASE_URL}/api/assessments/catalog?domain=${encodeURIComponent(domain)}`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(`Could not load the assessment catalog (${r.status})`);
    const data = await r.json();
    return data.items || [];
  },

  async assign(input: {
    item_id: string;
    mode: string;
    candidates: AssignCandidate[];
    domain?: string;
    title?: string;
  }): Promise<{ assigned: number }> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/assign`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ domain: "finance", ...input }),
    });
    if (!r.ok) {
      let detail = `Assignment failed (${r.status})`;
      try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },
};
