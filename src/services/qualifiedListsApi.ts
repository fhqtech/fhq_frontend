const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface QualifiedList {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
  visibility?: 'private' | 'shared';
  isQualified: boolean;
  totalCandidates: number;
  sourcesCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sharedWith?: string[];
}

export interface CreateQualifiedListRequest {
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
  visibility?: 'private' | 'shared';
  candidateIds: string[];
  sourceListId?: string;  // Source list ID (for finding candidates in NEW structure)
  sourceProjectId?: string;  // Source project ID (for shared lists)
}

export interface AddCandidatesRequest {
  candidateIds: string[];
  sourceListId?: string;  // Source list ID (for finding candidates in NEW structure)
  sourceProjectId?: string;  // Source project ID (for shared lists)
}

export interface AddCandidatesResponse {
  success: boolean;
  addedCount: number;
  skippedCount: number;
  listId?: string;
}

class QualifiedListsApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get all qualified lists in a workspace
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async getQualifiedLists(workspaceId: string): Promise<QualifiedList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch qualified lists');
    }

    const data = await response.json();
    return data.qualifiedLists || [];
  }

  /**
   * Check which qualified lists contain a candidate
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async checkCandidateInLists(workspaceId: string, email: string): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/check-candidate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Failed to check candidate in lists');
    }

    const data = await response.json();
    return data.listIds || [];
  }

  /**
   * Add candidates to a qualified list
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async addCandidatesToList(workspaceId: string, listId: string, candidateIds: string[], sourceListId?: string): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/${listId}/candidates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ candidates: candidateIds, sourceListId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add candidates to list');
    }

    return await response.json();
  }

  /**
   * Create qualified list with candidates in one operation
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async createQualifiedListWithCandidates(workspaceId: string, listData: CreateQualifiedListRequest): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/create-with-candidates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(listData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create qualified list');
    }

    return await response.json();
  }

  /**
   * Get qualified list details
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async getQualifiedListDetails(workspaceId: string, listId: string) {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/${listId}/details`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch qualified list details');
    }

    const data = await response.json();
    return data.list;
  }

  /**
   * Get qualified list candidates
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async getQualifiedListCandidates(workspaceId: string, listId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/${listId}/candidates`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch qualified list candidates');
    }

    const data = await response.json();
    return data.candidates;
  }

  /**
   * Get qualified list sources
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async getQualifiedListSources(workspaceId: string, listId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/${listId}/sources`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch qualified list sources');
    }

    const data = await response.json();
    return data.sources;
  }

  /**
   * Delete a qualified list
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async deleteQualifiedList(workspaceId: string, listId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/${listId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete qualified list');
    }

    return await response.json();
  }

  /**
   * Toggle candidate star status
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async toggleCandidateStar(workspaceId: string, listId: string, candidateId: string): Promise<{ success: boolean; starred: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/${listId}/candidates/${candidateId}/star`, {
      method: 'PUT',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle star');
    }

    return await response.json();
  }

  /**
   * Enhance multiple qualified lists in batch
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async enhanceBatch(workspaceId: string, listIds: string[]): Promise<Record<string, any>> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/qualified-lists/enhance-batch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ listIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to enhance qualified lists');
    }

    const data = await response.json();
    return data.enhancements || {};
  }

  // ============================================================
  // PROJECT-SCOPED CURATION METHODS
  // ============================================================

  /**
   * Curate qualified list from project's own list
   */
  async curateFromProjectList(
    workspaceId: string,
    projectId: string,
    sourceListId: string,
    candidateIds: string[],
    listData: { name: string; description?: string }
  ): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/curate-from-project`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        sourceListId,
        candidateIds,
        ...listData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to curate from project list');
    }

    return await response.json();
  }

  /**
   * Curate qualified list from a shared list
   */
  async curateFromSharedList(
    workspaceId: string,
    projectId: string,
    sourceProjectId: string,
    sourceListId: string,
    candidateIds: string[],
    listData: { name: string; description?: string }
  ): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/curate-from-shared`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        sourceProjectId,
        sourceListId,
        candidateIds,
        ...listData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to curate from shared list');
    }

    return await response.json();
  }

  /**
   * Curate qualified list from workspace (global) list
   */
  async curateFromWorkspaceList(
    workspaceId: string,
    projectId: string,
    workspaceListId: string,
    candidateIds: string[],
    listData: { name: string; description?: string }
  ): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/curate-from-workspace`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        workspaceListId,
        candidateIds,
        ...listData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to curate from workspace list');
    }

    return await response.json();
  }

  /**
   * Transfer qualified list to another project
   */
  async transferToProject(
    workspaceId: string,
    sourceProjectId: string,
    qualifiedListId: string,
    targetProjectId: string
  ): Promise<{ success: boolean; newListId: string; candidateCount: number }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${sourceProjectId}/qualified-lists/${qualifiedListId}/transfer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ targetProjectId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to transfer qualified list');
    }

    return await response.json();
  }

  /**
   * Get all qualified lists for a project
   */
  async getProjectQualifiedLists(workspaceId: string, projectId: string): Promise<QualifiedList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project qualified lists');
    }

    const data = await response.json();
    return data.lists || [];
  }

  /**
   * Get qualified list details (project-scoped)
   */
  async getQualifiedListDetailsProject(workspaceId: string, projectId: string, qualifiedListId: string): Promise<QualifiedList> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/${qualifiedListId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch qualified list details');
    }

    const data = await response.json();
    return data.list;
  }

  /**
   * Delete qualified list (project-scoped)
   */
  async deleteQualifiedListProject(workspaceId: string, projectId: string, qualifiedListId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/${qualifiedListId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete qualified list');
    }
  }

  /**
   * Copy a qualified list to the current project
   */
  async copyQualifiedList(workspaceId: string, projectId: string, qualifiedListId: string, newName?: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/${qualifiedListId}/copy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to copy qualified list');
    }

    const data = await response.json();
    return data.listId;
  }

  /**
   * Share a qualified list with other projects
   */
  async shareQualifiedList(workspaceId: string, projectId: string, qualifiedListId: string, projectIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/${qualifiedListId}/share`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ projectIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to share qualified list');
    }
  }

  /**
   * Get shared qualified lists for a project
   */
  async getSharedQualifiedLists(workspaceId: string, projectId: string): Promise<QualifiedList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/shared-qualified-lists`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch shared qualified lists');
    }

    const data = await response.json();
    return data.lists || [];
  }

  /**
   * Add candidates to a qualified list (project-scoped)
   */
  async addCandidatesToQualifiedList(workspaceId: string, projectId: string, qualifiedListId: string, candidateIds: string[], sourceListId?: string, sourceProjectId?: string): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/${qualifiedListId}/candidates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ candidateIds, sourceListId, sourceProjectId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add candidates to qualified list');
    }

    return await response.json();
  }

  /**
   * Create a new qualified list with candidates (project-scoped)
   */
  async createQualifiedListWithCandidatesProject(workspaceId: string, projectId: string, listData: CreateQualifiedListRequest): Promise<AddCandidatesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/qualified-lists/create-with-candidates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(listData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create qualified list');
    }

    return await response.json();
  }
}

export const qualifiedListsApi = new QualifiedListsApiService();
