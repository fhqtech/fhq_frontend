import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InterviewResultsData } from "@/types/interviewResults";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export class ResultsPendingError extends Error {
  constructor() {
    super("Results pending");
    this.name = "ResultsPendingError";
  }
}

/**
 * Per-session results fetch.
 *
 * 404 from the backend means "agent is still processing" — distinct
 * from a real error. We surface that as a typed pending state so the
 * page can show a friendly "results coming" surface and poll.
 *
 * Polling: refetchInterval = 10s while pending, max ~1min total wait
 * (TanStack Query handles the timer; the page no longer manages it).
 */
export function useSessionResultsQuery(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["results", "session", sessionId],
    enabled: Boolean(sessionId),
    staleTime: 0, // always fresh — results are a one-shot view
    refetchInterval: (query) => (query.state.error instanceof ResultsPendingError ? 10_000 : false),
    queryFn: async (): Promise<InterviewResultsData> => {
      const r = await fetch(`${API_BASE_URL}/api/results/session/${sessionId}`, {
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (r.status === 404) throw new ResultsPendingError();
      if (!r.ok) throw new Error(`Failed to fetch results: ${r.statusText}`);
      const data = await r.json();
      if (!data.success || !data.results) throw new Error("Invalid results format");
      return data.results as InterviewResultsData;
    },
    retry: (failureCount, error) => {
      if (error instanceof ResultsPendingError) return failureCount < 6;
      return failureCount < 1;
    },
  });
}

/**
 * F30.3: lightweight status check that surfaces reviewer_failure metadata.
 *
 * Used by InterviewResults' terminal-state screen to distinguish:
 *  - reviewer ran and failed (show error + Try again CTA)
 *  - session not found (show "no session" copy)
 *  - results pending (still being generated; keep polling)
 *
 * Only fires once after `useSessionResultsQuery` exhausts its retries — no
 * sense polling status every 10s; the actual results query already does
 * that. We use this as a one-shot diagnostic when the user lands on the
 * terminal state.
 */
export interface ResultsStatus {
  success: boolean;
  status?: "completed" | "pending" | "failed" | "not_found";
  session_id?: string;
  generated_at?: string | null;
  candidate_id?: string;
  reviewer_failure?: {
    error?: string;
    retry_count?: number;
    failed_at?: string | null;
    last_retry_at?: string | null;
  };
}

export function useResultsStatusQuery(
  sessionId: string | undefined,
  enabled: boolean,
) {
  return useQuery<ResultsStatus>({
    queryKey: ["results", "status", sessionId],
    enabled: Boolean(sessionId) && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/api/results/status/${sessionId}`, {
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!r.ok) throw new Error(`Status check failed (${r.status})`);
      return (await r.json()) as ResultsStatus;
    },
  });
}

/**
 * F30.3: re-trigger the reviewer agent for a stuck session.
 *
 * On success, invalidate the session results cache so the polling resumes
 * fresh — the reviewer runs on a backend daemon thread so we don't wait
 * for it inline.
 */
export function useReanalyzeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const r = await fetch(`${API_BASE_URL}/api/results/reanalyze/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.detail || `Re-analysis failed (HTTP ${r.status})`);
      }
      return r.json();
    },
    onSuccess: (_data, sessionId) => {
      qc.invalidateQueries({ queryKey: ["results", "session", sessionId] });
      qc.invalidateQueries({ queryKey: ["results", "status", sessionId] });
    },
  });
}
