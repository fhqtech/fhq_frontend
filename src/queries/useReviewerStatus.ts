/**
 * useReviewerStatus — Round 3 R3.1 polling hook for the reviewer's lifecycle state.
 *
 * Reads /api/interviews/{interview_id}/sessions/{session_id}/reviewer-status
 * which returns one of:
 *   - "pending"     — reviewer is running; poll every 5s
 *   - "ready"       — result_url points at the renderable result page
 *   - "error"       — reviewerError holds the reason; retry button enabled
 *   - "out_of_scope" — admission rejected at reviewer time
 *   - "incomplete"  — interview was too short to score
 *   - "unknown"     — session_id wrong or interview not yet finalized
 *
 * Polling stops automatically once status leaves "pending".
 *
 * The sibling `useRetryReviewer` mutation re-enqueues the reviewer when
 * status is "error". Invalidates the status query on success so the
 * polling UI flips back to "pending" immediately.
 *
 * Complements (does NOT replace) the existing `useResultsStatusQuery` in
 * resultsQueries.ts. That one reads `/api/results/status/{sessionId}` and
 * only covers screening/fitment + role-fit reviewer outputs. This new
 * hook reads the richer `reviewerStatus` field (Round 3 R2) which covers
 * both role-fit AND skill_analysis profile_tag outcomes, with a
 * result_url deep-link the caller can navigate to once ready.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ReviewerStatus =
  | "pending"
  | "ready"
  | "error"
  | "out_of_scope"
  | "incomplete"
  | "unknown";

export interface ReviewerStatusResponse {
  status: ReviewerStatus;
  error?: string | null;
  result_collection?: string | null;
  result_doc_id?: string | null;
  result_url?: string | null;
}

/**
 * Poll reviewer status for an interview session.
 *
 * @param interviewId Required for the URL.
 * @param sessionId Required for the URL. If undefined, the query is disabled.
 * @param options.pollIntervalMs Override the 5s default.
 * @param options.enabled Manual gate (e.g., parent component conditionally
 *                        renders before sessionId is known).
 */
export function useReviewerStatus(
  interviewId: string | undefined,
  sessionId: string | undefined,
  options: { pollIntervalMs?: number; enabled?: boolean } = {},
) {
  const { pollIntervalMs = 5000, enabled = true } = options;
  return useQuery<ReviewerStatusResponse>({
    queryKey: ["reviewer-status", interviewId, sessionId],
    enabled: Boolean(interviewId && sessionId) && enabled,
    queryFn: async () => {
      const r = await fetch(
        `${API_BASE_URL}/api/interviews/${encodeURIComponent(
          interviewId!,
        )}/sessions/${encodeURIComponent(sessionId!)}/reviewer-status`,
        {
          headers: { "Content-Type": "application/json", ...authHeaders() },
        },
      );
      if (!r.ok) {
        throw new Error(`reviewer-status check failed (${r.status})`);
      }
      return (await r.json()) as ReviewerStatusResponse;
    },
    // Stop polling once status leaves "pending" / "unknown". `unknown`
    // is also polled because it usually means the session doc hasn't
    // been written yet (race between WS-end and Firestore commit).
    refetchInterval: (query) => {
      const data = query.state.data as ReviewerStatusResponse | undefined;
      if (!data) return pollIntervalMs;
      return data.status === "pending" || data.status === "unknown"
        ? pollIntervalMs
        : false;
    },
  });
}

/**
 * Re-enqueue the reviewer for a session whose reviewerStatus == "error".
 * Backend resets status to "pending" before dispatch, so the polling UI
 * flips immediately back to the "generating" state.
 */
export function useRetryReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { interviewId: string; sessionId: string }) => {
      const r = await fetch(
        `${API_BASE_URL}/api/interviews/${encodeURIComponent(
          args.interviewId,
        )}/sessions/${encodeURIComponent(args.sessionId)}/retry-reviewer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
        },
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any)?.detail || `Retry failed (HTTP ${r.status})`);
      }
      return (await r.json()) as { success: boolean; message: string };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["reviewer-status", vars.interviewId, vars.sessionId],
      });
    },
  });
}
