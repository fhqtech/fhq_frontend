// Data transformation utilities for blueprint data

import {
  EnhancedBlueprintData,
  SimpleBlueprintData,
  SkillNode,
  EvaluationCriteria,
  ProficiencyLevel
} from '@/types/blueprintTypes';

/**
 * Transform the complex JSON structure to our enhanced blueprint format
 */
export function transformInterviewData(rawData: any): EnhancedBlueprintData | null {
  if (!rawData) {
    console.error('[Blueprint Transform] No raw data provided');
    return null;
  }

  console.log('[Blueprint Transform] Raw data keys:', Object.keys(rawData));

  // Handle nested blueprint structure: { blueprint: { blueprint: {...} } }
  const output = rawData.blueprint || rawData[0]?.output || rawData.output || rawData;

  if (!output || !output.evaluation_pillars) {
    console.error('[Blueprint Transform] Invalid data structure:', output);
    return null;
  }

  console.log('[Blueprint Transform] Found', output.evaluation_pillars?.length || 0, 'pillars');

  // Log first pillar to verify structure
  if (output.evaluation_pillars && output.evaluation_pillars.length > 0) {
    console.log('[Blueprint Transform] First pillar sample:', {
      name: output.evaluation_pillars[0].pillar_name,
      description: output.evaluation_pillars[0].pillar_description,
      weight: output.evaluation_pillars[0].weight_percentage,
      topics: output.evaluation_pillars[0].qualifying_topics
    });
  }

  // Extract qualifying topics from all pillars to create qualifying questions
  const qualifyingQuestions: string[] = [];
  output.evaluation_pillars?.forEach((pillar: any) => {
    if (pillar.qualifying_topics && Array.isArray(pillar.qualifying_topics)) {
      qualifyingQuestions.push(...pillar.qualifying_topics);
    }
  });

  // Map the API structure to our component structure
  const transformed = {
    role_summary: {
      mission: output.overall_role_expectations || '',
      key_responsibilities: output.interview_flow_notes ? [output.interview_flow_notes] : [],
      team_structure: ''
    },
    evaluation_pillars: output.evaluation_pillars || [],
    qualifying_questions: qualifyingQuestions,
    ideal_candidate_profile: output.ideal_candidate_profile || output.overall_role_expectations || ''
  };

  console.log('[Blueprint Transform] Transformed data:', {
    pillarsCount: transformed.evaluation_pillars.length,
    qualifyingQuestionsCount: transformed.qualifying_questions.length,
    hasProfile: !!transformed.ideal_candidate_profile
  });

  return transformed;
}

/**
 * Convert enhanced blueprint to simple format for backward compatibility
 */
export function convertToSimpleFormat(enhanced: EnhancedBlueprintData): SimpleBlueprintData {
  return {
    mission: enhanced.role_summary.mission,
    evaluation_pillars: enhanced.evaluation_pillars.map(pillar => pillar.pillar_name),
    key_responsibilities: JSON.stringify(enhanced.role_summary.key_responsibilities),
    qualifying_questions: enhanced.qualifying_questions,
    ideal_candidate_profile: enhanced.ideal_candidate_profile
  };
}

/**
 * Extract all skills as nodes for mind map visualization
 */
export function extractSkillNodes(enhanced: EnhancedBlueprintData): SkillNode[] {
  const nodes: SkillNode[] = [];

  if (!enhanced?.evaluation_pillars) {
    console.warn('[extractSkillNodes] No evaluation_pillars found');
    return nodes;
  }

  console.log('[extractSkillNodes] Processing', enhanced.evaluation_pillars.length, 'pillars');

  enhanced.evaluation_pillars.forEach((pillar: any, index) => {
    // Support both 'evaluation_criteria' and 'skills' arrays
    const criteriaArray = pillar.evaluation_criteria || pillar.skills || [];

    console.log(`[Pillar ${index}]`, {
      name: pillar.pillar_name || pillar.pillar,
      description: pillar.pillar_description || pillar.description,
      weight: pillar.weight_percentage || pillar.weight,
      criteriaCount: criteriaArray.length
    });

    const pillarName = pillar.pillar_name || pillar.pillar;
    const pillarProficiency = pillar.proficiency;
    const pillarFocusAreas = pillar.interview_focus_areas || [];

    criteriaArray.forEach((criteria: any) => {
      // Handle both old format (strings) and new format (objects with skill_name)
      let skillName: string;
      let proficiency: ProficiencyLevel;
      let focusAreas: string[];
      let connections: string[];
      let context: string;

      if (typeof criteria === 'string') {
        // Old format: evaluation_criteria is array of strings
        skillName = criteria;
        proficiency = pillarProficiency as ProficiencyLevel;
        focusAreas = pillarFocusAreas;
        connections = [];
        context = '';
      } else {
        // New format: evaluation_criteria or skills is array of objects
        // Support both 'skill_name' and 'skill' field names
        const name = criteria.skill_name || criteria.skill;
        if (!name) {
          console.warn('[extractSkillNodes] Skipping criteria without skill_name or skill');
          return;
        }
        skillName = name;
        proficiency = (criteria.required_proficiency || criteria.proficiency) as ProficiencyLevel;
        focusAreas = criteria.interview_focus_areas || [];
        connections = criteria.integrates_with || [];
        context = criteria.context || '';
      }

      nodes.push({
        id: generateSkillId(skillName),
        name: skillName,
        proficiency: proficiency,
        pillar: pillarName,
        pillarDescription: pillar.pillar_description || pillar.description || '',
        connections: connections?.map((skill: string) => generateSkillId(skill)).filter((id: string) => id) || [],
        focusAreas: focusAreas,
        context: context
      });
    });
  });

  console.log('[extractSkillNodes] Total nodes created:', nodes.length);
  return nodes;
}

/**
 * Generate consistent skill IDs for connections
 */
function generateSkillId(skillName: string | undefined): string {
  if (!skillName) return '';
  return skillName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Group skills by pillar for organized display
 */
export function groupSkillsByPillar(enhanced: EnhancedBlueprintData): Record<string, EvaluationCriteria[]> {
  const grouped: Record<string, EvaluationCriteria[]> = {};

  enhanced.evaluation_pillars.forEach(pillar => {
    grouped[pillar.pillar_name] = pillar.evaluation_criteria;
  });

  return grouped;
}

/**
 * Get skill connections for a specific skill
 */
export function getSkillConnections(skillName: string, allNodes: SkillNode[]): SkillNode[] {
  const skillId = generateSkillId(skillName);
  const targetSkill = allNodes.find(node => node.id === skillId);

  if (!targetSkill) return [];

  return allNodes.filter(node =>
    targetSkill.connections.includes(node.id) ||
    node.connections.includes(skillId)
  );
}

/**
 * Calculate skill complexity score based on focus areas and connections
 */
export function calculateSkillComplexity(skill: SkillNode): number {
  const focusAreaWeight = skill.focusAreas.length * 0.3;
  const connectionWeight = skill.connections.length * 0.5;
  const proficiencyWeight = getProficiencyWeight(skill.proficiency);

  return focusAreaWeight + connectionWeight + proficiencyWeight;
}

/**
 * Get numeric weight for proficiency levels
 */
function getProficiencyWeight(proficiency: ProficiencyLevel): number {
  const weights = {
    'Expert': 4,
    'Advanced': 3,
    'Intermediate': 2,
    'Basic': 1,
    // Legacy mappings
    'Hands-On Experience': 3,
    'Required': 2,
    'Operational Experience': 1
  };
  return weights[proficiency] || 1;
}

/**
 * Find the most connected skills (central nodes in the network)
 */
export function findCentralSkills(nodes: SkillNode[], limit: number = 5): SkillNode[] {
  return nodes
    .sort((a, b) => b.connections.length - a.connections.length)
    .slice(0, limit);
}

/**
 * Generate skill relationship map for visualization
 */
export interface SkillRelationship {
  source: string;
  target: string;
  strength: number;
}

export function generateSkillRelationships(nodes: SkillNode[]): SkillRelationship[] {
  const relationships: SkillRelationship[] = [];

  nodes.forEach(node => {
    node.connections.forEach(connectionId => {
      const targetNode = nodes.find(n => n.id === connectionId);
      if (targetNode) {
        relationships.push({
          source: node.id,
          target: connectionId,
          strength: calculateRelationshipStrength(node, targetNode)
        });
      }
    });
  });

  return relationships;
}

/**
 * Calculate relationship strength between two skills
 */
function calculateRelationshipStrength(skill1: SkillNode, skill2: SkillNode): number {
  // Skills in the same pillar have stronger relationships
  const samePillar = skill1.pillar === skill2.pillar ? 0.5 : 0.1;

  // Similar proficiency levels indicate related complexity
  const proficiencyDiff = Math.abs(
    getProficiencyWeight(skill1.proficiency) - getProficiencyWeight(skill2.proficiency)
  );
  const proficiencyScore = (4 - proficiencyDiff) / 4 * 0.3;

  // Base connection strength
  const baseStrength = 0.2;

  return Math.min(samePillar + proficiencyScore + baseStrength, 1.0);
}