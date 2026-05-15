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
 * Delete an interview, then invalidate the workspace+project list.
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
    onSuccess: () => {
      if (workspaceId && projectId) {
        qc.invalidateQueries({ queryKey: ["interviews", workspaceId, projectId] });
      }
    },
  });
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
