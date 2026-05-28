import { useQuery } from "@tanstack/react-query";

export interface PoolStats {
  total: number;
  evaluated: number;
  quality_distribution: { gap: number; developing: number; strong: number; expert: number };
  experience_distribution: Record<string, number>;
  top_skills: { skill: string; count: number }[];
  jd_coverage: { candidate_id: string; skill: string; score: number }[];
}

export interface PoolCandidate {
  id: string;
  name?: string;
  email?: string;
  overallScore?: number;
  overall_score?: number;
  yearsExperience?: number;
  scores?: Record<string, number>;
  status?: string;
}

const apiBase = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Pool stats + candidate list for a qualified-list pool dashboard.
 * Returns both in a single hook so the page renders atomically (avoids
 * a flash where stats arrive before candidates).
 */
export function usePoolDashboardQuery(
  workspaceId: string | null | undefined,
  listId: string | undefined,
) {
  return useQuery({
    queryKey: ["pool-dashboard", workspaceId, listId],
    enabled: Boolean(workspaceId && listId),
    queryFn: async (): Promise<{ stats: PoolStats; candidates: PoolCandidate[] }> => {
      const headers = authHeaders();
      const [statsRes, candidatesRes] = await Promise.all([
        fetch(`${apiBase()}/api/workspaces/${workspaceId}/qualified-lists/${listId}/pool-stats`, { headers }).then((r) => r.json()),
        fetch(`${apiBase()}/api/workspaces/${workspaceId}/qualified-lists/${listId}/candidates?limit=500`, { headers }).then((r) => r.json()),
      ]);
      if (statsRes?.success === false) throw new Error("Pool stats failed");
      return {
        stats: statsRes as PoolStats,
        candidates: (candidatesRes?.candidates ?? []) as PoolCandidate[],
      };
    },
  });
}
