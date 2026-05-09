/**
 * Workspace API Service
 * Handles all workspace and project-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberCount: number;
  stats: {
    totalProjects: number;
    totalLists: number;
    totalQualifiedLists: number;
    totalCandidates: number;
    totalInterviews: number;
    activeInterviews: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  stats: {
    interviewCount: number;
    listsCreated: number;
    qualifiedListsCreated: number;
  };
  createdAt: string;
  updatedAt: string;
}

class WorkspaceApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get all workspaces for the current user
   */
  async getUserWorkspaces(): Promise<Workspace[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workspaces');
    }

    return response.json();
  }

  /**
   * Get workspace stats
   */
  async getWorkspaceStats(workspaceId: string): Promise<Workspace['stats']> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workspace stats');
    }

    return response.json();
  }

  /**
   * Switch active workspace
   */
  async switchWorkspace(workspaceId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/switch`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to switch workspace');
    }
  }

  /**
   * Get all projects in a workspace
   */
  async getWorkspaceProjects(workspaceId: string): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    return response.json();
  }

  /**
   * Create a new project in workspace
   */
  async createProject(workspaceId: string, projectName: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name: projectName })
    });

    if (!response.ok) {
      throw new Error('Failed to create project');
    }

    return response.json();
  }

  /**
   * Get project details
   */
  async getProjectDetails(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project details');
    }

    return response.json();
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to update project');
    }
  }

  /**
   * Switch active project
   */
  async switchProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/switch`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to switch project');
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  }
}

export const workspaceApi = new WorkspaceApiService();
