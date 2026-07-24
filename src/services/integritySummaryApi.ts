/**
 * P8 — fetch the post-interview integrity & coverage summary for a session.
 *
 * Mirrors integrityApi.ts: `auth_token` bearer + VITE_API_BASE_URL. Read-only —
 * the backend endpoint is a pure read that NEVER gates, rejects, or mutates
 * anything (advisory only). Coverage/diff are present only for a grounded
 * practical-defense interview; null otherwise (honest by construction).
 *
 * Backend: GET /api/results/session/{sid}/integrity/summary.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

/** Skills defended / left hollow / never probed during the defense. */
export interface IntegritySummaryCoverage {
  defended?: string[];
  hollow?: string[];
  unprobed?: string[];
}

/** Model-answer-vs-submitted diff for a probed concept (grounded defense only). */
export interface IntegritySummaryDiff {
  concept?: string;
  target_level?: number | null;
  model_answer?: string;
  hollow_basis?: string;
  submitted?: string;
  grounding_ratio?: number;
  flag?: boolean;
}

/** A single turn-cited, contestable integrity flag. Never a verdict. */
export interface IntegritySummaryFlag {
  turn: number;
  quote: string;
  skill_name: string | null;
  canonical_id: string | null;
  note: string;
  /** Set when the recruiter previously judged this turn fair (survives reload). */
  marked_fair?: boolean;
}

export interface IntegritySummary {
  session_id: string;
  coverage: IntegritySummaryCoverage | null;
  expected_vs_submitted_diff: IntegritySummaryDiff | null;
  advisory_suspicion: number;
  advisory: boolean;
  integrity_flags: IntegritySummaryFlag[];
}

export const integritySummaryApi = {
  /** The advisory, contestable integrity + coverage read for a scored session. */
  async getIntegritySummary(sessionId: string): Promise<IntegritySummary> {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(
      `${API_BASE_URL}/api/results/session/${encodeURIComponent(sessionId)}/integrity/summary`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!res.ok) {
      throw new Error(`Could not load integrity summary (${res.status})`);
    }
    return res.json();
  },
};

/** Convenience free function mirroring the task's `getIntegritySummary(sessionId)`. */
export const getIntegritySummary = (sessionId: string): Promise<IntegritySummary> =>
  integritySummaryApi.getIntegritySummary(sessionId);
