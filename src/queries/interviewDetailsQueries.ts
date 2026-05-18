/**
 * F29.1 — TanStack Query data layer for the InterviewDetails page.
 *
 * Replaces 4 manual fetch + setState pipelines (interview, stats, candidates,
 * candidate-sources) and 1 ad-hoc retry-fetch (blueprint). Adds:
 *  - request dedup + caching
 *  - `enabled` gating (kills the "fires before deps are ready" race)
 *  - SSE liveRevision invalidation via useInvalidateInterviewDetailsOnRevision
 *
 * Mirrors the patterns in interviewsQueries.ts so cache keys stay
 * compatible with usePrefetchInterview's existing key shape.
 */
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect } from "react";
import { interviewApi } from "@/services/interviewApi";
import { listsApi } from "@/services/listsApi";
import { qualifiedListsApi } from "@/services/qualifiedListsApi";
import { checkBlueprintExists } from "@/services/blueprintService";

// ---------------------------------------------------------------------------
// Cache keys
// ---------------------------------------------------------------------------

export const interviewDetailQueryKey = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
) => ["interview-detail", workspaceId, projectId, interviewId] as const;

export const interviewStatsQueryKey = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
) => ["interview-stats", workspaceId, projectId, interviewId] as const;

export const interviewCandidatesQueryKey = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
  page: number,
  pageSize: number,
) =>
  [
    "interview-candidates",
    workspaceId,
    projectId,
    interviewId,
    page,
    pageSize,
  ] as const;

export const interviewSourcesQueryKey = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
  listIds: string[] | undefined,
) =>
  [
    "interview-sources",
    workspaceId,
    projectId,
    interviewId,
    [...(listIds ?? [])].sort().join(","),
  ] as const;

export const interviewBlueprintQueryKey = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
) => ["interview-blueprint", workspaceId, projectId, interviewId] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Single interview configuration. Backend returns the config directly (not
 * wrapped); the api method already tolerates both shapes via
 * `getInterviewConfiguration`. We surface that response unchanged.
 */
export function useInterviewDetailQuery(
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
) {
  return useQuery({
    queryKey: interviewDetailQueryKey(workspaceId, projectId, interviewId),
    enabled: Boolean(workspaceId && projectId && interviewId),
    // Detail page is the canonical truth for the user's "current view". Refetch
    // on mount so stale dashboard cache doesn't flash. placeholderData keeps
    // the previous render visible while the refetch is in flight so the user
    // doesn't see a skeleton on every navigation.
    staleTime: 0,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const data: any = await interviewApi.getInterviewConfiguration(
        workspaceId!,
        projectId!,
        interviewId!,
      );
      if (!data) return null;
      if (data.interview) return data.interview;
      if (data.id || data.title) return data;
      return null;
    },
  });
}

export function useInterviewStatsQuery(
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
) {
  return useQuery({
    queryKey: interviewStatsQueryKey(workspaceId, projectId, interviewId),
    enabled: Boolean(workspaceId && projectId && interviewId),
    staleTime: 10_000,
    queryFn: async () => {
      try {
        const stats = await interviewApi.getInterviewStats(
          workspaceId!,
          projectId!,
          interviewId!,
        );
        return stats || {};
      } catch {
        return {};
      }
    },
  });
}

/**
 * Paged candidate list for an interview. Gated on interview being loaded
 * AND not in draft status — kills the wasted "fetch with status=draft" call
 * that the old useEffect could fire before the interview state was ready.
 */
export function useInterviewCandidatesQuery(
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
  page: number,
  pageSize: number,
  interviewStatus: string | undefined,
) {
  return useQuery({
    queryKey: interviewCandidatesQueryKey(
      workspaceId,
      projectId,
      interviewId,
      page,
      pageSize,
    ),
    enabled: Boolean(
      workspaceId &&
        projectId &&
        interviewId &&
        interviewStatus &&
        interviewStatus !== "draft",
    ),
    staleTime: 10_000,
    queryFn: async () => {
      const data = await interviewApi.getInterviewCandidates(
        workspaceId!,
        projectId!,
        interviewId!,
        page,
        pageSize,
      );
      return {
        candidates: data.candidates || [],
        totalCandidates: data.totalCandidates || 0,
        totalPages: data.totalPages || 0,
        page: data.page || 1,
        limit: data.limit || pageSize,
      };
    },
  });
}

export interface InterviewSourcesResult {
  sources: Array<Record<string, any>>;
  hasSharedLists: boolean;
  hasQualifiedLists: boolean;
}

/**
 * Candidate sources — Google Sheet sources + classification of any list
 * that has zero sheet-sources (qualified vs shared).
 *
 * **Race fix**: the old useEffect fired with `interview` undefined, then
 * again when interview landed. The `enabled` gate now requires interview
 * to be loaded (workspace + project + interviewId + listIds defined).
 */
export function useInterviewSourcesQuery(
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
  listIds: string[] | undefined,
  candidateCount: number | undefined,
) {
  return useQuery<InterviewSourcesResult>({
    queryKey: interviewSourcesQueryKey(
      workspaceId,
      projectId,
      interviewId,
      listIds,
    ),
    enabled: Boolean(
      workspaceId && projectId && interviewId && listIds !== undefined,
    ),
    staleTime: 30_000,
    queryFn: async () => {
      const ids = listIds ?? [];
      if (ids.length === 0) {
        return { sources: [], hasSharedLists: false, hasQualifiedLists: false };
      }
      const allSources: Array<Record<string, any>> = [];
      let foundSharedList = false;
      let foundQualifiedList = false;

      for (const listId of ids) {
        try {
          const sources = await listsApi.getListSources(
            workspaceId!,
            projectId!,
            listId,
          );
          const googleSheetSources = sources.filter(
            (s: any) => s.type === "google_sheet",
          );
          allSources.push(
            ...googleSheetSources.map((s: any) => ({ ...s, listId })),
          );
          if (sources.length === 0 && (candidateCount ?? 0) > 0) {
            try {
              await qualifiedListsApi.getQualifiedList(
                workspaceId!,
                projectId!,
                listId,
              );
              foundQualifiedList = true;
            } catch {
              foundSharedList = true;
            }
          }
        } catch {
          if ((candidateCount ?? 0) > 0) {
            try {
              await qualifiedListsApi.getQualifiedList(
                workspaceId!,
                projectId!,
                listId,
              );
              foundQualifiedList = true;
            } catch {
              foundSharedList = true;
            }
          }
        }
      }

      return {
        sources: allSources,
        hasSharedLists: foundSharedList,
        hasQualifiedLists: foundQualifiedList,
      };
    },
  });
}

export function useInterviewBlueprintQuery(
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
) {
  return useQuery({
    queryKey: interviewBlueprintQueryKey(workspaceId, projectId, interviewId),
    enabled: Boolean(workspaceId && projectId && interviewId),
    // Blueprint status is volatile (generating → completed/failed in seconds).
    // No placeholderData — surfacing another interview's stale "failed" via
    // cross-query carryover would mislead users into thinking their fresh
    // submission already failed. A brief skeleton beats a wrong pill.
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const result = await checkBlueprintExists(
        workspaceId!,
        projectId!,
        interviewId!,
        3,
      );
      return result;
    },
  });
}

// ---------------------------------------------------------------------------
// SSE bridge
// ---------------------------------------------------------------------------

/**
 * Bridge SSE liveRevision (bumped by EventSource 'update' events in the page)
 * into TanStack Query: when revision bumps, invalidate every interview-detail
 * cache for the current workspace+project so subscribers refetch.
 *
 * Mirrors useInvalidateInterviewsOnRevision shape in interviewsQueries.ts.
 */
export function useInvalidateInterviewDetailsOnRevision(
  workspaceId: string | undefined,
  projectId: string | undefined,
  interviewId: string | undefined,
  revision: number,
) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!workspaceId || !projectId || !interviewId) return;
    if (revision === 0) return;
    qc.invalidateQueries({
      queryKey: interviewDetailQueryKey(workspaceId, projectId, interviewId),
    });
    qc.invalidateQueries({
      queryKey: interviewStatsQueryKey(workspaceId, projectId, interviewId),
    });
    qc.invalidateQueries({
      queryKey: interviewBlueprintQueryKey(workspaceId, projectId, interviewId),
    });
  }, [qc, workspaceId, projectId, interviewId, revision]);
}
