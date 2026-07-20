/**
 * B3 — normalize a skill-gap read into one shape a summary card can render.
 *
 * Two honest sources, never a fabricated target:
 *  - summarizeFromNodes: the TAG's own status buckets (strong/developing/gap)
 *    from a completed interview. Works on every result with zero setup — this is
 *    the "skill gap of this candidate against the role" a recruiter gets today.
 *  - summarizeFromGapResult: the explicit gap-vs-target read (journeys workflow),
 *    when a role has authored target bars.
 */
import type { TagNode } from "@/components/tag/types";
import { nodeStatus, isNotAssessed } from "@/components/tag/adapters";
import type { GapResult } from "@/services/recruiterJourneysApi";

export type SkillGapStatus = "strong" | "developing" | "gap";

export interface SkillGapItem {
  skillName: string;
  status: SkillGapStatus;
  /** Demonstrated score (0–100). */
  score?: number;
  /** Target bar (0–100) — target mode only. */
  target?: number;
  /** Points short of target — target mode only. */
  gap?: number;
  /** Demonstrated proficiency level (e.g. "Awareness"), node/status mode. */
  demonstratedProficiency?: string;
  /** Required proficiency level (e.g. "Intermediate"), node/status mode. */
  requiredProficiency?: string;
}

export interface SkillGapSummaryData {
  /** Scored skills counted toward the bar (excludes the role centre + transferable). */
  total: number;
  /** Skills at or above the bar. */
  met: number;
  /** Below-bar skills, worst first. */
  gapItems: SkillGapItem[];
  mode: "status" | "target";
  /** Average points-short across skills — target mode only. */
  avgGap?: number;
}

/**
 * Summarize a completed interview's TAG nodes by their own status buckets.
 * Returns null when there are no scored skill nodes (nothing honest to show).
 */
export function summarizeFromNodes(nodes: TagNode[]): SkillGapSummaryData | null {
  const scored = nodes.filter(
    (n) =>
      n.type !== "role_center" &&
      n.type !== "transferable" &&
      typeof n.score === "number" &&
      !isNotAssessed(n), // un-probed skills are not a gap and don't count toward the bar
  );
  if (scored.length === 0) return null;

  let met = 0;
  const gapItems: SkillGapItem[] = [];
  for (const n of scored) {
    const status = nodeStatus(n); // "strong" | "developing" | "gap"
    if (status === "strong") {
      met += 1;
    } else if (status === "developing" || status === "gap") {
      gapItems.push({
        skillName: n.label,
        status,
        score: n.score,
        demonstratedProficiency: n.demonstrated_proficiency ?? undefined,
        requiredProficiency: n.required_proficiency ?? undefined,
      });
    }
  }
  // Worst first: lowest score leads.
  gapItems.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

  return { total: scored.length, met, gapItems, mode: "status" };
}

/** Summarize an explicit gap-vs-target read (journeys workflow). */
export function summarizeFromGapResult(gap: GapResult): SkillGapSummaryData {
  const gapItems: SkillGapItem[] = gap.gaps
    .filter((g) => !g.met)
    .sort((a, b) => b.gap - a.gap)
    .map((g) => ({
      skillName: g.skill_name,
      status: g.gap >= 30 ? "gap" : "developing",
      score: g.demonstrated,
      target: g.target,
      gap: g.gap,
    }));

  return {
    total: gap.summary.total,
    met: gap.summary.met_count,
    gapItems,
    mode: "target",
    avgGap: gap.summary.avg_gap,
  };
}
