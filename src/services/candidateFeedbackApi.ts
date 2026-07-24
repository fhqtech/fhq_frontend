/**
 * Candidate feedback API — candidate-facing (P12).
 *
 * Auth: candidate JWT (`candidate_auth_token`). Hand-written client mirroring
 * journeysApi.ts (same token key, same FastAPI-aware error extraction). Serves
 * the consent-first, status-only feedback report from
 * GET/POST /api/candidate-me/feedback/{programId}[/consent].
 *
 * Security contract mirrored from the backend router:
 *  - the feedback payload only ever carries {skillName, status} per skill — no
 *    numeric target/gap/confidence or recruiter framing;
 *  - nothing is shown until the candidate has consented (consent-first);
 *  - a missing report degrades honestly (ready:false) — never an all-gaps list.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("candidate_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function detailFrom(r: Response, fallback: string): Promise<string> {
  try {
    const data: Record<string, unknown> = await r.json();
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) =>
          d && typeof d === "object" && typeof (d as Record<string, unknown>).msg === "string"
            ? ((d as Record<string, unknown>).msg as string)
            : typeof d === "string"
              ? d
              : null,
        )
        .filter((m): m is string => Boolean(m));
      if (msgs.length) return msgs.join("; ");
    }
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

/** The only per-skill shape the candidate ever sees. */
export type FeedbackStatus = "strong" | "developing" | "gap";

export interface FeedbackItem {
  skillName: string;
  status: FeedbackStatus;
}

/** The consent-first, status-only feedback report. */
export interface CandidateFeedback {
  /** False when the backend slice flag is off — the page shows a graceful notice. */
  enabled: boolean;
  /** True until the candidate has a consent record — gate any skill data behind it. */
  consentRequired: boolean;
  /** True only when there is real evidence to summarise (honest-empty otherwise). */
  ready: boolean;
  items: FeedbackItem[];
  generatedAt?: string | null;
  retentionUntil?: string | null;
  /** Present when not ready — e.g. "no_evidence". */
  reason?: string | null;
}

export interface ConsentState {
  enabled: boolean;
  consented: boolean;
  consentedAt?: string | null;
  consentVersion?: string | null;
  retentionUntil?: string | null;
  /** The current draft consent copy, sourced from the backend (never hard-coded). */
  consentText?: string | null;
}

const SAFE_STATUSES: FeedbackStatus[] = ["strong", "developing", "gap"];

function normaliseItem(raw: unknown): FeedbackItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // Backend sends snake_case {skill_name, status}; tolerate camelCase too.
  const name = typeof r.skill_name === "string" ? r.skill_name
    : typeof r.skillName === "string" ? r.skillName : "";
  const status = r.status;
  if (!name || typeof status !== "string" || !SAFE_STATUSES.includes(status as FeedbackStatus)) {
    return null;
  }
  return { skillName: name, status: status as FeedbackStatus };
}

export const candidateFeedbackApi = {
  /** Read the candidate's consent state for a program's feedback report. */
  async getConsentState(programId: string): Promise<ConsentState> {
    const r = await fetch(
      `${API_BASE_URL}/api/candidate-me/feedback/${encodeURIComponent(programId)}/consent`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load your consent state."));
    const data = await r.json();
    return {
      enabled: data?.enabled !== false,
      consented: !!data?.consented,
      consentedAt: typeof data?.consented_at === "string" ? data.consented_at : null,
      consentVersion: typeof data?.consent_version === "string" ? data.consent_version : null,
      retentionUntil: typeof data?.retention_until === "string" ? data.retention_until : null,
      consentText: typeof data?.consent_text === "string" ? data.consent_text : null,
    };
  },

  /** Record the candidate's consent, then the report becomes viewable. */
  async postConsent(programId: string, opts: { version?: string } = {}): Promise<ConsentState> {
    const r = await fetch(
      `${API_BASE_URL}/api/candidate-me/feedback/${encodeURIComponent(programId)}/consent`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ version: opts.version ?? null }),
      },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not record your consent."));
    const data = await r.json();
    return {
      enabled: data?.enabled !== false,
      consented: !!data?.consented,
      consentedAt: typeof data?.consented_at === "string" ? data.consented_at : null,
      consentVersion: typeof data?.consent_version === "string" ? data.consent_version : null,
      retentionUntil: typeof data?.retention_until === "string" ? data.retention_until : null,
    };
  },

  /** The status-only feedback report. Consent-first + honest-empty by contract. */
  async getFeedback(programId: string): Promise<CandidateFeedback> {
    const r = await fetch(
      `${API_BASE_URL}/api/candidate-me/feedback/${encodeURIComponent(programId)}`,
      { headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load your feedback."));
    const data = await r.json();
    const rawItems = Array.isArray(data?.items) ? data.items : [];
    return {
      enabled: data?.enabled !== false,
      consentRequired: !!data?.consent_required,
      ready: !!data?.ready,
      items: rawItems.map(normaliseItem).filter((i: FeedbackItem | null): i is FeedbackItem => i !== null),
      generatedAt: typeof data?.generated_at === "string" ? data.generated_at : null,
      retentionUntil: typeof data?.retention_until === "string" ? data.retention_until : null,
      reason: typeof data?.reason === "string" ? data.reason : null,
    };
  },
};
