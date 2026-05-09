/**
 * Template Library Service for Recruiter Portal
 * Enables access to workspace-wide interview templates
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

/**
 * Get authentication headers from localStorage JWT
 */
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    console.warn('No auth token found in localStorage');
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export interface TemplateResponse {
  id: string;
  interview_id: string;
  title: string;
  role: string;
  type: string;
  topics?: string;
  duration?: number;
  interview_type?: string;
  workspaceId: string;
  usedInProjects: string[];
  usedInInterviews: string[];
  source: 'control_tower' | 'project';
  scope: 'global' | 'private';
  isStarred: boolean;
  starredBy: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  blueprintStatus: 'pending' | 'generating' | 'ready' | 'error';
  tags?: string[];
}

export interface TemplateListResponse {
  success: boolean;
  templates: TemplateResponse[];
  count: number;
}

/**
 * Fetch all templates for a workspace (recruiters see global + their own private)
 */
export const fetchWorkspaceTemplates = async (
  workspaceId: string,
  filter?: 'all' | 'starred' | 'created'
): Promise<TemplateListResponse> => {
  try {
    let url = `${API_BASE_URL}/api/workspaces/${workspaceId}/templates`;
    const params = new URLSearchParams();

    if (filter && filter !== 'all') {
      params.append('filter', filter);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching workspace templates:', error);
    throw error;
  }
};

/**
 * Fetch a single template by ID
 */
export const fetchTemplate = async (
  workspaceId: string,
  templateId: string
): Promise<{ success: boolean; template: TemplateResponse }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/templates/${templateId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
};

/**
 * Toggle star status on a template
 */
export const toggleTemplateStar = async (
  workspaceId: string,
  templateId: string,
  userId: string
): Promise<{ success: boolean; isStarred: boolean; template: TemplateResponse }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/templates/${templateId}/star`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to toggle star: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling template star:', error);
    throw error;
  }
};

/**
 * Track template usage when creating an interview from template
 */
export const trackTemplateUsage = async (
  workspaceId: string,
  templateId: string,
  projectId: string,
  interviewId: string
): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/templates/${templateId}/track-usage`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          project_id: projectId,
          interview_id: interviewId
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to track usage: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error tracking template usage:', error);
    throw error;
  }
};

/**
 * Export all template API methods
 */
export const templateLibraryService = {
  fetchWorkspaceTemplates,
  fetchTemplate,
  toggleTemplateStar,
  trackTemplateUsage,
};
