/**
 * P4-4 — persist a recruiter's "mark as fair" verdict on a turn-cited integrity
 * flag. Fire-and-forget from the optimistic IntegrityNote: the endpoint is
 * idempotent (deterministic doc id + merge), so a re-fire is safe and a failure
 * only means the local optimistic state is ahead of the server (retried on the
 * next mark). Backend: POST /api/results/session/{sid}/integrity/mark-fair.
 */
import type { IntegrityFlag } from "@/lib/integrity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export interface MarkFairResult {
  success: boolean;
  session_id: string;
  turn: number;
  marked_fair: boolean;
}

export const integrityApi = {
  /** Record that the recruiter judged a flagged turn fair (a false positive). */
  async markFair(sessionId: string, flag: IntegrityFlag): Promise<MarkFairResult> {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(
      `${API_BASE_URL}/api/results/session/${encodeURIComponent(sessionId)}/integrity/mark-fair`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          turn: flag.turn,
          canonical_id: flag.canonicalId ?? null,
          skill_name: flag.skillName ?? null,
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Could not save mark-as-fair (${res.status})`);
    }
    return res.json();
  },
};
