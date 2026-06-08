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

// The full editable payload (scenario or case/work-sample). Loose by design —
// the editor manipulates nested options/rubric arrays.
export type AssessmentItem = Record<string, any>;

async function jpost(path: string, body: any): Promise<any> {
  const r = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  if (!r.ok) {
    let detail = `Request failed (${r.status})`;
    try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return r.json();
}

export interface SubmissionClaim {
  canonical_id?: string; skill_name: string; value: number; confidence?: number;
  evidence?: string[]; extension?: number;
}
export interface AssessmentSubmission {
  evidence_id: string;
  mode: string;
  session?: string;
  artifact_ref?: string;
  provisional?: boolean;
  final?: boolean;
  raw_response?: string;
  integrity_flags: any[];
  created_at?: string;
  claims: SubmissionClaim[];
}

export const recruiterAssessmentsApi = {
  async getSubmissions(candidateId: string): Promise<{ submissions: AssessmentSubmission[]; count: number }> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/submissions/${encodeURIComponent(candidateId)}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`Could not load submissions (${r.status})`);
    return r.json();
  },

  async getCatalog(domain = "finance", workspaceId?: string): Promise<CatalogItem[]> {
    const qs = new URLSearchParams({ domain });
    if (workspaceId) qs.set("workspace_id", workspaceId);
    const r = await fetch(`${API_BASE_URL}/api/assessments/catalog?${qs.toString()}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`Could not load the assessment catalog (${r.status})`);
    const data = await r.json();
    return data.items || [];
  },

  // --- CRUD ---
  async getItem(itemId: string): Promise<AssessmentItem> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/items/${encodeURIComponent(itemId)}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(r.status === 404 ? "Item not found" : `Could not load item (${r.status})`);
    return (await r.json()).item;
  },
  async createItem(kind: string, item: AssessmentItem, workspaceId?: string): Promise<{ id: string }> {
    return jpost("/api/assessments/items", { kind, item, workspace_id: workspaceId, domain: "finance" });
  },
  async updateItem(itemId: string, kind: string, item: AssessmentItem): Promise<any> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/items/${encodeURIComponent(itemId)}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ kind, item }),
    });
    if (!r.ok) {
      let detail = `Save failed (${r.status})`;
      try { detail = (await r.json())?.detail || detail; } catch { /* ignore */ }
      throw new Error(detail);
    }
    return r.json();
  },
  async publishItem(itemId: string): Promise<any> {
    return jpost(`/api/assessments/items/${encodeURIComponent(itemId)}/publish`, {});
  },
  async deleteItem(itemId: string): Promise<any> {
    const r = await fetch(`${API_BASE_URL}/api/assessments/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE", headers: authHeaders(),
    });
    if (!r.ok) throw new Error(`Delete failed (${r.status})`);
    return r.json();
  },

  // --- AI authoring (returns drafts; recruiter reviews + saves) ---
  async aiDraft(brief: string, mode: string, difficulty = "mid"): Promise<{ kind: string; item: AssessmentItem }> {
    return jpost("/api/assessments/ai/draft", { brief, mode, difficulty });
  },
  async aiImprove(item: AssessmentItem, notes: string): Promise<{ item: AssessmentItem }> {
    return jpost("/api/assessments/ai/improve", { item, notes });
  },
  async aiSuggestScoring(item: AssessmentItem): Promise<{ options?: any[]; criteria?: any[] }> {
    return jpost("/api/assessments/ai/suggest-scoring", { item });
  },
  async aiFromJd(jdText: string, count = 5): Promise<{ items: AssessmentItem[] }> {
    return jpost("/api/assessments/ai/from-jd", { jd_text: jdText, count });
  },

  async assign(input: {
    item_id: string;
    mode: string;
    candidates?: AssignCandidate[];
    list_id?: string;
    workspace_id?: string;
    project_id?: string;
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
