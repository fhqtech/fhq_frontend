/**
 * Shapes returned by the Interview Reviewer Agent (a.k.a. Analyzer)
 * via /api/results/session/:sessionId. Single source of truth so query
 * hooks + page components don't duplicate the interface.
 */

export interface SkillScore {
  skill_id: string;
  skill_name: string;
  score: number;
  proficiency_level: string;
  evidence: string[];
  gaps: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "role" | "skill" | "transferable";
  score?: number;
  is_core?: boolean;
  required_proficiency?: string;
  demonstrated_proficiency?: string;
  proficiency_label?: string;
  evidence?: string[];
  transferable_from?: string;
}

export interface CriticalGap {
  skill_id: string;
  skill_name: string;
  severity: string;
  impact: string;
  recommendation: string;
}

export interface TransferableSkill {
  source: string;
  skill_demonstrated: string;
  relevance_to_role: string;
  score: number;
}

export interface InterviewResultsData {
  session_id: string;
  interview_id: string;
  overall_score: number;
  recommendation: "STRONG_HIRE" | "ADVANCE_WITH_CONCERNS" | "BORDERLINE" | "REJECT";
  summary: string;
  skill_scores: SkillScore[];
  graph_data?: {
    nodes: GraphNode[];
    edges: unknown[];
    annotations: unknown[];
  };
  transferable_skills: TransferableSkill[];
  critical_gaps: CriticalGap[];
  strengths: string[];
  development_areas: string[];
  generated_at?: string;
  status?: string;
}
