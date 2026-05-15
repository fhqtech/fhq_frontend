import { useQuery } from "@tanstack/react-query";
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
