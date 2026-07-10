/**
 * P5-3 — the reviewer-output → legacy-evaluation transform, lifted out of
 * InterviewResults.tsx so the consolidated StageResults surface can reuse the
 * EXACT same mapping without editing the 2.1k-LOC live page.
 *
 * Pure, read-only, zero side effects. The legacy page keeps its own inline copy
 * (it is DO-NOT-EDIT under P5-3); switching it to import this is an optional,
 * separate cleanup noted in sharedWiring. The logic here is a byte-faithful copy
 * so both surfaces stay in lock-step.
 */
import type { InterviewResultsData } from "@/types/interviewResults";

export interface Competency {
  skill: string;
  score: number;
  strength: string;
  weakness: string;
  evaluation?: string;
}

export interface EvaluationData {
  overall_summary: string;
  competencies: Competency[];
  hireability_recommendation: string;
  suggested_next_steps: string[];
}

/** Map the reviewer recommendation enum to human-readable, sentence-case copy. */
const RECOMMENDATION_MAP: Record<string, string> = {
  STRONG_HIRE: "Strongly Recommend - Excellent fit for the role",
  ADVANCE_WITH_CONCERNS:
    "Recommend with Reservations - Strong skills but needs development in some areas",
  BORDERLINE: "Borderline - Requires deeper review before decision",
  REJECT: "Not Recommended - Significant gaps in required skills",
};

/**
 * Transform Interview Reviewer Agent output to the legacy evaluation shape the
 * overview surface renders. `competencies` / `suggested_next_steps` are kept for
 * backward compatibility but the unified Talent Analysis Graph now carries that
 * signal, so the surface renders only `overall_summary` + recommendation.
 */
export function transformToLegacyFormat(
  data: InterviewResultsData,
): EvaluationData {
  const skillScores = data.skill_scores || [];

  const competencies: Competency[] = skillScores.map((skill) => {
    const evidence = skill.evidence || [];
    const gaps = skill.gaps || [];
    return {
      skill: skill.skill_name || "Unknown Skill",
      score: skill.score || 0,
      strength: evidence.length > 0 ? evidence[0] : "No evidence provided",
      weakness: gaps.length > 0 ? gaps[0] : "No gaps identified",
      evaluation: evidence.join(". ") || "No detailed evaluation available",
    };
  });

  const strengths = data.strengths || [];
  const developmentAreas = data.development_areas || [];

  return {
    overall_summary: data.summary || "No summary available",
    competencies,
    hireability_recommendation:
      RECOMMENDATION_MAP[data.recommendation] ||
      data.recommendation ||
      "Pending Review",
    suggested_next_steps: [
      ...strengths.slice(0, 2).map((s) => `Strength: ${s}`),
      ...developmentAreas.slice(0, 3).map((d) => `Development: ${d}`),
    ],
  };
}
