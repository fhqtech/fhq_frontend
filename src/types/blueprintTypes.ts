// Enhanced TypeScript interfaces for the rich interview blueprint data

export type ProficiencyLevel =
  | 'Expert'
  | 'Advanced'
  | 'Intermediate'
  | 'Basic'
  | 'Hands-On Experience' // Legacy
  | 'Required' // Legacy
  | 'Operational Experience'; // Legacy

export interface EvaluationCriteria {
  skill_name: string;
  context: string;
  required_proficiency: ProficiencyLevel;
  interview_focus_areas: string[];
  integrates_with: string[];
}

export interface EvaluationPillar {
  pillar_name: string;
  pillar_description: string;
  description?: string; // Fallback for backward compatibility
  weight_percentage?: number;
  evaluation_criteria: EvaluationCriteria[];
  qualifying_topics?: string[];
}

export interface RoleSummary {
  mission: string;
  key_responsibilities: string[];
  team_structure: string;
}

export interface EnhancedBlueprintData {
  role_summary: RoleSummary;
  evaluation_pillars: EvaluationPillar[];
  qualifying_questions: string[];
  ideal_candidate_profile: string;
}

// Simple blueprint data interface (for backward compatibility)
export interface SimpleBlueprintData {
  mission: string;
  evaluation_pillars: string[];
  key_responsibilities: string;
  qualifying_questions: string[];
  ideal_candidate_profile: string;
}

// Mind map node interface for visualization
export interface SkillNode {
  id: string;
  name: string;
  proficiency: ProficiencyLevel;
  pillar: string;
  pillarDescription?: string;
  connections: string[];
  focusAreas: string[];
  context: string;
}

// Proficiency level configuration
export const PROFICIENCY_CONFIG = {
  'Expert': {
    color: 'red-700',
    bgColor: 'red-100',
    borderColor: 'red-500',
    label: 'Expert',
    description: 'Highest level of expertise required'
  },
  'Advanced': {
    color: 'orange-700',
    bgColor: 'orange-100',
    borderColor: 'orange-500',
    label: 'Advanced',
    description: 'Advanced proficiency and deep knowledge'
  },
  'Intermediate': {
    color: 'blue-700',
    bgColor: 'blue-50',
    borderColor: 'blue-500',
    label: 'Intermediate',
    description: 'Solid working knowledge and practical experience'
  },
  'Basic': {
    color: 'green-700',
    bgColor: 'green-100',
    borderColor: 'green-500',
    label: 'Basic',
    description: 'Fundamental understanding and basic competency'
  },
  // Legacy mappings
  'Hands-On Experience': {
    color: 'blue-700',
    bgColor: 'blue-50',
    borderColor: 'blue-500',
    label: 'Hands-On',
    description: 'Practical experience with demonstrated results'
  },
  'Required': {
    color: 'orange-700',
    bgColor: 'orange-100',
    borderColor: 'orange-500',
    label: 'Required',
    description: 'Essential knowledge and basic competency'
  },
  'Operational Experience': {
    color: 'green-700',
    bgColor: 'green-100',
    borderColor: 'green-500',
    label: 'Operational',
    description: 'Proficient user level experience'
  }
} as const;