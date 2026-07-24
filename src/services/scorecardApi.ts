/**
 * Scorecard API — collaborative per-skill scorecards + the same-role comparison
 * matrix (Phase 5 slice P13). Additive; surfaced only behind the default-off
 * `scorecard` UI flag so the pilot is unchanged.
 *
 * Hand-written from the agreed backend contract (this is built in parallel with
 * the backend), mirroring services/recruiterJourneysApi.ts: `auth_token` bearer,
 * the same defensive detail-extraction, and `import.meta.env.VITE_API_BASE_URL`.
 * These routes are program-scoped (`/api/programs/{pid}/…`), not workspace-scoped
 * in the path — the workspace is resolved from the caller's token server-side.
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

/** One reviewer-cited quote backing a skill rating (session + verbatim text). */
export interface EvidenceRef {
  session_id: string;
  quote: string;
}

/**
 * One skill row on a candidate's scorecard. `rating` is the 0–100 manual score;
 * `canonical_id` is the resolved taxonomy id (null when the skill only aligns by
 * name). `grounded` is honest: under reviewer v1 it is false — the rating is a
 * model/human assertion, not verified against the transcript.
 */
export interface ScorecardRow {
  canonical_id: string | null;
  skill_id: string;
  skill_name: string;
  rating: number;
  tier_label?: string;
  note: string;
  ai_prefilled: boolean;
  grounded: boolean;
  evidence_refs: EvidenceRef[];
}

/** One threaded note on a scorecard (append-only; newest last). */
export interface ScorecardNote {
  author_email: string;
  at: string;
  body: string;
}

/** A candidate's full scorecard doc for a program. */
export interface Scorecard {
  program_id: string;
  candidate_id: string;
  rows: ScorecardRow[];
  notes: ScorecardNote[];
}

/** A candidate column in the comparison matrix. */
export interface MatrixCandidate {
  candidate_id: string;
  name: string;
}

/**
 * One (skill, candidate) cell. `score` is null when that candidate has no scored
 * tag for the skill — the UI renders "no scored tag yet", never a 0. `grounded`
 * is per-cell honesty (v1 → false).
 */
export interface MatrixCell {
  score: number | null;
  demonstrated_proficiency?: string;
  grounded: boolean;
  aligned_by: string;
  evidence: string[];
}

/**
 * One skill row across all candidates. `aligned_by === 'label'` means the row
 * was matched on skill name (not a shared canonical id) — the UI hedges that.
 */
export interface MatrixRow {
  canonical_id: string | null;
  skill_name: string;
  aligned_by: "canonical" | "label";
  cells: Record<string, MatrixCell>;
}

/** Why a subset of the matrix is missing (e.g. a candidate has no scored stage). */
export interface DegradedNote {
  reason: string;
  affected: string[];
}

/** The same-role comparison matrix payload. */
export interface ScorecardMatrixData {
  candidates: MatrixCandidate[];
  rows: MatrixRow[];
  /** Target bar per canonical skill id, when the role authored one. */
  target_skills: Record<string, number>;
  degraded: DegradedNote[];
}

/** AI-prefill availability. Default false — the button stays hidden. */
export interface PrefillStatus {
  enabled: boolean;
}

/** Drafted (unverified) scorecard rows returned by the AI-prefill run. */
export interface PrefillDrafts {
  rows: ScorecardRow[];
}

// ── Client ───────────────────────────────────────────────────────────────

const cardBase = (programId: string, candidateId: string) =>
  `${API_BASE_URL}/api/programs/${programId}/candidates/${candidateId}/scorecard`;

export const scorecardApi = {
  /** A candidate's scorecard (rows + threaded notes) for a program. */
  async getScorecard(programId: string, candidateId: string): Promise<Scorecard> {
    const r = await fetch(cardBase(programId, candidateId), { headers: authHeaders() });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load scorecard"));
    return r.json();
  },

  /** Replace the scorecard's skill rows; returns the saved doc. */
  async saveScorecard(
    programId: string,
    candidateId: string,
    rows: ScorecardRow[],
  ): Promise<Scorecard> {
    const r = await fetch(cardBase(programId, candidateId), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ rows }),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not save scorecard"));
    return r.json();
  },

  /** Append a threaded note; returns the updated doc. */
  async addNote(programId: string, candidateId: string, body: string): Promise<Scorecard> {
    const r = await fetch(`${cardBase(programId, candidateId)}/notes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ body }),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not add note"));
    return r.json();
  },

  /** The same-role comparison matrix for a program. */
  async getMatrix(programId: string): Promise<ScorecardMatrixData> {
    const r = await fetch(`${API_BASE_URL}/api/programs/${programId}/scorecard-matrix`, {
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load comparison matrix"));
    return r.json();
  },

  /**
   * Whether AI-prefill is available for this candidate's scorecard. Fail-soft:
   * any error resolves to `{ enabled: false }` so the deferred draft button
   * stays hidden rather than surfacing an error.
   */
  async getPrefillStatus(programId: string, candidateId: string): Promise<PrefillStatus> {
    try {
      const r = await fetch(`${cardBase(programId, candidateId)}/prefill/status`, {
        headers: authHeaders(),
      });
      if (!r.ok) return { enabled: false };
      const data = await r.json();
      return { enabled: Boolean(data?.enabled) };
    } catch {
      return { enabled: false };
    }
  },

  /** Run AI-prefill (only when enabled); returns drafted, unverified rows. */
  async runPrefill(programId: string, candidateId: string): Promise<PrefillDrafts> {
    const r = await fetch(`${cardBase(programId, candidateId)}/prefill`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not draft a prefill"));
    return r.json();
  },
};
