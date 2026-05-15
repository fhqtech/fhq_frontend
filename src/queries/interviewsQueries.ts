import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { interviewApi, type Interview } from "@/services/interviewApi";

const apiBase = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
const authHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Shared interviews list query — keyed on workspace+project+filters so
 * Dashboard / ManageInterviewsEnhanced / PoolDashboard share cache.
 */
export type InterviewsFilters = {
  page?: number;
  limit?: number;
  status?: string[];
  type?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  min_candidates?: number;
  max_candidates?: number;
};

export const interviewsQueryKey = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  filters?: InterviewsFilters,
) => ["interviews", workspaceId, projectId, filters ?? {}] as const;

export function useInterviewsQuery(
  workspaceId: string | undefined,
  projectId: string | undefined,
  filters?: InterviewsFilters,
) {
  return useQuery({
    queryKey: interviewsQueryKey(workspaceId, projectId, filters),
    enabled: Boolean(workspaceId && projectId),
    queryFn: async (): Promise<{ interviews: Interview[]; pagination: unknown }> => {
      // enabled gate guarantees these are defined
      return interviewApi.getInterviews(workspaceId!, projectId!, filters);
    },
  });
}

/**
 * Bridge SSE liveRevision (from useInterviewListLiveUpdates) into
 * TanStack Query: when revision bumps, invalidate the interviews
 * cache for the current workspace+project so all subscribers refetch.
 */
export function useInvalidateInterviewsOnRevision(
  workspaceId: string | undefined,
  projectId: string | undefined,
  revision: number,
) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    if (revision === 0) return; // initial mount, no invalidation needed
    qc.invalidateQueries({ queryKey: ["interviews", workspaceId, projectId] });
  }, [qc, workspaceId, projectId, revision]);
}

/**
 * Delete an interview — optimistic remove + rollback on error.
 *
 * F24.3: row disappears immediately on click. If the server 4xx's,
 * we put it back. Server-state via TanStack Query onMutate / onError.
 */
export function useDeleteInterviewMutation(
  workspaceId: string | undefined,
  projectId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (interviewId: string) => {
      if (!workspaceId || !projectId) throw new Error("Missing workspace or project");
      const r = await fetch(
        `${apiBase()}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete interview");
      }
      return interviewId;
    },
    onMutate: async (interviewId) => {
      if (!workspaceId || !projectId) return;
      const key = ["interviews", workspaceId, projectId];
      await qc.cancelQueries({ queryKey: key });
      const snapshots = qc.getQueriesData({ queryKey: key });
      qc.setQueriesData({ queryKey: key }, (old: { interviews?: Interview[]; pagination?: unknown } | undefined) => {
        if (!old?.interviews) return old;
        return {
          ...old,
          interviews: old.interviews.filter((i) => i.id !== interviewId),
        };
      });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      // rollback every snapshot we captured
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      if (workspaceId && projectId) {
        qc.invalidateQueries({ queryKey: ["interviews", workspaceId, projectId] });
      }
    },
  });
}

/**
 * Prefetch a single interview's detail on hover. Used by TableRow
 * onPointerEnter so the click → detail-page transition feels instant.
 *
 * Cap at one prefetch per interviewId per session (the React Query cache
 * survives navigation; a 30s staleTime means cold cache only on the
 * first hover).
 */
export function usePrefetchInterview(
  workspaceId: string | undefined,
  projectId: string | undefined,
) {
  const qc = useQueryClient();
  return (interviewId: string) => {
    if (!workspaceId || !projectId || !interviewId) return;
    const detailKey = ["interview-detail", workspaceId, projectId, interviewId];
    qc.prefetchQuery({
      queryKey: detailKey,
      staleTime: 30_000,
      queryFn: async () => {
        const r = await fetch(
          `${apiBase()}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/configuration`,
          { headers: authHeaders() },
        );
        if (!r.ok) throw new Error(`Prefetch failed (${r.status})`);
        return r.json();
      },
    }).catch(() => {
      // Prefetch is best-effort — never throw into the UI
    });
  };
}

/**
 * Start an interview (transition to active + send invitations).
 * Returns the API response payload so the caller can read .success etc.
 */
export function useStartInterviewMutation(
  workspaceId: string | undefined,
  projectId: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (interviewId: string) => {
      if (!workspaceId || !projectId) throw new Error("Missing workspace or project");
      const r = await fetch(
        `${apiBase()}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/start`,
        { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() } },
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.success) {
        throw new Error(data?.error || "Failed to start interview");
      }
      return data;
    },
    onSuccess: () => {
      if (workspaceId && projectId) {
        qc.invalidateQueries({ queryKey: ["interviews", workspaceId, projectId] });
      }
    },
  });
}
