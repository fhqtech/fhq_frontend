import { QueryClient } from "@tanstack/react-query";

/**
 * Single shared QueryClient for the workspace + applicant apps.
 *
 * Defaults are tuned for a finance-trust dashboard:
 *  - 30s staleTime: requests dedupe across components without going
 *    "stale" between page navigations (a recruiter clicking around
 *    Dashboard → Interview → Pool shouldn't re-fetch every workspace
 *    on each route).
 *  - 5min gcTime: cached pages survive a normal back/forward without
 *    re-hitting the backend.
 *  - refetchOnWindowFocus disabled: finance dashboards lose context
 *    if numbers shift while the recruiter is reading them. Live
 *    updates come through SSE/poll hooks that call
 *    queryClient.invalidateQueries explicitly.
 *  - retry once on network errors: production traffic is on Cloud Run
 *    asia-south1 with stable connectivity; aggressive retry would mask
 *    bugs.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
