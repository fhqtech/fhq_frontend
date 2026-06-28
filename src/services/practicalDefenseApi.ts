/**
 * Practical submission + defense API — candidate-facing.
 * Auth: candidate JWT (`candidate_auth_token`), except the invitation
 * lookup which is public. Shapes hand-written from the backend routers
 * (practical_invitations.py, practical_submissions.py, practical_defense.py).
 *
 * Per CR-04, nothing here surfaces a score — the candidate only ever sees
 * confirmations + AI probe questions.
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
      // FastAPI validation errors arrive as a list of {msg, loc, ...} objects.
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

/**
 * Upload one file to the shared upload endpoint, returning its gs:// URL.
 * Mirrors uploadArtifact() in pages/candidate/CandidateArtifact.tsx.
 */
export async function uploadArtifact(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const token = localStorage.getItem("candidate_auth_token");
  const r = await fetch(`${API_BASE_URL}/api/upload-file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const result = await r.json().catch(() => ({}));
  if (!r.ok || !result?.upload_info?.gcs_url) {
    throw new Error(result?.errors?.[0] || "Could not upload your file");
  }
  return result.upload_info.gcs_url as string;
}

/** The Gemini-generated task the candidate must complete. */
export interface PracticalAssignmentBrief {
  task_brief?: string | null;
  expected_artifacts?: string[];
  estimated_effort_min?: number | null;
  format?: string | null;
}

export interface PracticalInvitationView {
  name: string;
  email: string;
  practicalId: string;
  /** Surfaced so the submit page can address the scoped submission routes. */
  workspaceId: string;
  projectId: string;
  status: string;
  /** Role title (e.g. "Senior Tax Analyst") + the generated task brief, so the
   *  candidate knows what to do. Best-effort — may be absent on older docs. */
  title?: string | null;
  assignment?: PracticalAssignmentBrief | null;
}

export interface AcceptInvitationResult {
  invitation_id: string;
  practical_id: string;
  status: string;
}

export interface StartSubmissionResult {
  submission_id: string;
  status: string;
}

export interface SubmitArtifactBody {
  artifact_refs: string[];
  provenance: { ai_tools_disclosed: string[]; approach_note: string };
}

export interface DefenseStartResult {
  session_id: string;
  message: string;
  done: boolean;
}

export interface DefenseMessageResult {
  message: string;
  done: boolean;
}

export interface DefenseTranscriptTurn {
  role: "ai" | "candidate";
  text: string;
  probe_index?: number;
}

export interface DefenseSession {
  session_id: string;
  status: string; // active | completed
  transcript: DefenseTranscriptTurn[];
  done: boolean;
}

/** Thrown by startDefense when the probe plan is still being prepared (HTTP 425). */
export class DefenseNotReadyError extends Error {
  constructor() {
    super("Defense is being prepared");
    this.name = "DefenseNotReadyError";
  }
}

export const practicalDefenseApi = {
  /** Public — no auth required. */
  async getInvitation(token: string): Promise<PracticalInvitationView> {
    const r = await fetch(
      `${API_BASE_URL}/api/practical-invitations/${encodeURIComponent(token)}`,
    );
    if (!r.ok) {
      throw new Error(
        r.status === 404
          ? "This invitation could not be found."
          : await detailFrom(r, "This invitation link is no longer valid."),
      );
    }
    return r.json();
  },

  /** Links the signed-in candidate account to the invitation. */
  async acceptInvitation(token: string): Promise<AcceptInvitationResult> {
    const r = await fetch(
      `${API_BASE_URL}/api/practical-invitations/${encodeURIComponent(token)}/accept`,
      { method: "POST", headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not accept this invitation."));
    return r.json();
  },

  async startSubmission(
    ws: string,
    pr: string,
    practicalId: string,
  ): Promise<StartSubmissionResult> {
    const r = await fetch(
      `${API_BASE_URL}/api/workspaces/${ws}/projects/${pr}/practicals/${practicalId}/submission/start`,
      { method: "POST", headers: authHeaders() },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not start your submission."));
    return r.json();
  },

  async submitArtifact(
    ws: string,
    pr: string,
    practicalId: string,
    submissionId: string,
    body: SubmitArtifactBody,
  ): Promise<{ submission_id: string; status: string; durationSeconds?: number }> {
    const r = await fetch(
      `${API_BASE_URL}/api/workspaces/${ws}/projects/${pr}/practicals/${practicalId}/submission/${submissionId}/submit`,
      { method: "POST", headers: authHeaders(), body: JSON.stringify(body) },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not submit your work."));
    return r.json();
  },

  async startDefense(submissionId: string): Promise<DefenseStartResult> {
    const r = await fetch(
      `${API_BASE_URL}/api/practical-submissions/${submissionId}/defense/start`,
      { method: "POST", headers: authHeaders() },
    );
    // 425: the probe plan is still being built in the background — caller retries.
    if (r.status === 425) throw new DefenseNotReadyError();
    if (!r.ok) throw new Error(await detailFrom(r, "Could not start the defense."));
    return r.json();
  },

  async sendDefenseMessage(
    sessionId: string,
    message: string,
  ): Promise<DefenseMessageResult> {
    const r = await fetch(
      `${API_BASE_URL}/api/practical-defense/${sessionId}/message`,
      { method: "POST", headers: authHeaders(), body: JSON.stringify({ message }) },
    );
    if (!r.ok) throw new Error(await detailFrom(r, "Could not send your reply."));
    return r.json();
  },

  async getDefenseSession(sessionId: string): Promise<DefenseSession> {
    const r = await fetch(`${API_BASE_URL}/api/practical-defense/${sessionId}`, {
      headers: authHeaders(),
    });
    if (!r.ok) throw new Error(await detailFrom(r, "Could not load the defense session."));
    return r.json();
  },
};
