const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface ProficiencyLevel {
  level: number;
  name: string;
  description: string;
}

export interface BlueprintSkill {
  skill_id: string;
  name: string;
  shortName: string;
  description: string;
  expected_proficiency: number;
  proficiency_levels: ProficiencyLevel[];
}

export interface DerivedSkill {
  skill_id: string;
  derives_from: string;
}

export interface SkillLayout {
  core_skills: string[];
  derived_skills: DerivedSkill[];
}

export interface EvaluationCriteria {
  skill_name: string;
  context: string;
  required_proficiency: string;
  interview_focus_areas: string[];
  integrates_with: string[];
}

export interface EvaluationPillar {
  pillar_name: string;
  pillar_description: string;
  description?: string;
  weight_percentage?: number;
  evaluation_criteria: EvaluationCriteria[];
  qualifying_topics?: string[];
}

export interface Tool {
  tool_id?: string;
  name: string;
  category: string;
}

export interface FullBlueprintData {
  id: string;
  title: string;
  role: string;
  type: string;
  duration: number;
  overview: string;
  description?: string;
  job_level?: string;
  experience_range?: string;
  scope: 'global' | 'private';
  source: 'control_tower' | 'project';
  blueprintStatus: 'pending' | 'generating' | 'ready' | 'error';
  skills?: BlueprintSkill[];
  skill_layout?: SkillLayout;
  tools?: Tool[];
  certifications_recommended?: string[];
  interview_notes?: string;
  evaluation_pillars?: EvaluationPillar[];
  ideal_candidate_profile?: string;
}

export interface InterviewTemplate {
  id: string;
  title: string;
  role: string;
  type: string;
  topics: string;
  duration: number;
  scope: 'global' | 'private';
  isStarred: boolean;
  source: 'control_tower' | 'project';
  tags: string[];
  workspaceId: string;
  projectIds: string[];
  usedInProjects: string[];
  usedInInterviews: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  blueprintStatus: 'pending' | 'generating' | 'ready' | 'error';
  usageCount: number;
}

class TemplateApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get available templates for a specific project
   * Returns global templates + private templates where projectIds includes this project
   * Only returns templates with ready blueprints
   * @param templateType - Optional filter for 'screening' or 'fitment' interview types
   */
  async getAvailableTemplates(
    projectId: string,
    workspaceId: string,
    templateType?: 'screening' | 'fitment'
  ): Promise<InterviewTemplate[]> {
    let url = `${API_BASE_URL}/api/projects/${projectId}/available-templates?workspace_id=${workspaceId}`;

    if (templateType) {
      url += `&template_type=${templateType}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch available templates');
    }

    // Backend returns the array directly (not wrapped in {templates: [...]}).
    // Be defensive: also accept the legacy wrapped shape, and always return
    // an array so callers can safely .length/.map without guards.
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.templates)) return data.templates;
    return [];
  }

  /**
   * Save an interview's blueprint as a reusable template
   */
  async saveInterviewAsTemplate(
    interviewId: string,
    workspaceId: string,
    projectId: string,
    title?: string
  ): Promise<InterviewTemplate> {
    const response = await fetch(
      `${API_BASE_URL}/api/interviews/${interviewId}/save-as-template`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: projectId,
          title
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save interview as template');
    }

    const data = await response.json();
    return data.template;
  }
}

export const templateApi = new TemplateApiService();

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export const fetchFullBlueprint = async (
  workspaceId: string,
  templateId: string
): Promise<{ success: boolean; blueprint: FullBlueprintData }> => {
  console.log('[fetchFullBlueprint] Starting fetch:', { workspaceId, templateId });

  try {
    const url = `${API_BASE_URL}/api/workspaces/${workspaceId}/templates/${templateId}/full`;
    console.log('[fetchFullBlueprint] Fetching URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('[fetchFullBlueprint] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[fetchFullBlueprint] Error response:', errorText);
      throw new Error(`Failed to fetch full blueprint: ${response.status}`);
    }

    const data = await response.json();
    console.log('[fetchFullBlueprint] Success! Blueprint data:', data);
    return data;
  } catch (error) {
    console.error('[fetchFullBlueprint] Exception caught:', error);
    throw error;
  }
};
