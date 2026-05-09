const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface CandidateSource {
  id: string;
  type: 'google_sheet' | 'excel_file';
  name: string;
  candidateCount: number;
  status: 'validated' | 'ready';
  metadata?: any;
}

export interface CandidateList {
  id: string;
  name: string;
  description?: string;
  totalCandidates: number;
  sourcesCount: number;
  createdAt: string;
  updatedAt: string;
  usedInInterviews: string[];
  sourceIds: string[];
  collection?: string; // 'candidate_pools' or 'qualified_candidate_pools'
  // Duplicate insights (populated by frontend analysis)
  duplicateInsights?: {
    totalDuplicates: number;
    uniqueCandidates: number;
    duplicateRate: number;
    lastAnalyzed: string;
    hasMultipleSources: boolean;
  };
  isAnalyzingDuplicates?: boolean;
}

export interface CreateListRequest {
  name: string;
  description?: string;
}

export interface AddSourceRequest {
  type: 'google_sheet' | 'excel_file';
  metadata: {
    url?: string;
    file_path?: string;
    fileName?: string;
    [key: string]: any;
  };
  name?: string;
}

export interface ValidationResult {
  success: boolean;
  candidateCount: number;
  sourceId?: string;
  message?: string;
  errors?: string[];
  upload_info?: {
    gcs_url: string;
    uploaded_at: string;
    original_filename: string;
  };
  sheet_info?: {
    sheet_id: string;
    sheet_name: string;
    total_rows: number;
    columns: string[];
    last_validated: string;
  };
}

export interface DeleteImpact {
  listName: string;
  affectedInterviews: Array<{
    id: string;
    title: string;
    status: string;
    candidateCount: number;
  }>;
  sourcesToDelete: number;
  totalCandidates: number;
  canDelete: boolean;
  sources: CandidateSource[];
}

class ListsApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Get all lists in a workspace
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async getLists(workspaceId: string): Promise<CandidateList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch lists');
    }

    const data = await response.json();
    return data.lists;
  }

  /**
   * Create a new list in a project
   * @param projectId - Project ID from WorkspaceContext
   * @param listData - List creation data
   */
  async createList(projectId: string, listData: CreateListRequest): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/lists`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(listData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create list');
    }

    const data = await response.json();
    return data.listId;
  }

  /**
   * Update a list
   * @param workspaceId - Workspace ID from WorkspaceContext
   * @param listId - List ID to update
   * @param listData - Partial list data to update
   */
  async updateList(workspaceId: string, listId: string, listData: Partial<CreateListRequest>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(listData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update list');
    }
  }

  /**
   * Delete a list
   * @param workspaceId - Workspace ID from WorkspaceContext
   * @param listId - List ID to delete
   */
  async deleteList(workspaceId: string, listId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete list');
    }
  }

  async validateGoogleSheet(url: string): Promise<ValidationResult> {
    const response = await fetch(`${API_BASE_URL}/api/validate-google-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        expected_columns: ['Name', 'Email']
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        candidateCount: 0,
        errors: [error.error || 'Failed to validate Google Sheet']
      };
    }

    const data = await response.json();
    return {
      success: data.is_valid,
      candidateCount: data.total_rows || 0,
      errors: data.errors || [],
      sheet_info: data.sheet_info
    };
  }

  async uploadFile(file: File): Promise<ValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('expected_columns', 'Name,Email');

    const response = await fetch(`${API_BASE_URL}/api/upload-file`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        candidateCount: 0,
        errors: error.errors || ['Failed to upload file']
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      candidateCount: data.file_info?.total_rows || 0,
      errors: data.errors || [],
      upload_info: data.upload_info
    };
  }

  /**
   * Add source to list
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async addSourceToList(workspaceId: string, listId: string, sourceData: AddSourceRequest): Promise<ValidationResult> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/sources`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sourceData)
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        candidateCount: 0,
        errors: error.validation_errors || [error.error] || ['Failed to add source']
      };
    }

    const data = await response.json();
    return {
      success: true,
      candidateCount: data.candidateCount,
      sourceId: data.sourceId,
      message: data.message
    };
  }

  /**
   * Get list sources (project-level)
   * This is already defined as getProjectListSources, keeping this for compatibility
   */
  async getListSources(workspaceId: string, projectId: string, listId: string): Promise<CandidateSource[]> {
    return this.getProjectListSources(workspaceId, projectId, listId);
  }

  /**
   * Remove source from list
   * @param workspaceId - Workspace ID from WorkspaceContext
   * @param projectId - Project ID from WorkspaceContext
   */
  async removeSourceFromList(workspaceId: string, projectId: string, listId: string, sourceId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/sources/${sourceId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove source');
    }
  }

  /**
   * Get delete impact analysis
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async getDeleteImpact(workspaceId: string, listId: string): Promise<DeleteImpact> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/delete-impact`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get delete impact analysis');
    }

    const data = await response.json();
    return data.impact;
  }

  /**
   * Force delete list
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async forceDeleteList(workspaceId: string, listId: string): Promise<DeleteImpact> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/force-delete`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to force delete list');
    }

    const data = await response.json();
    return data.impact;
  }

  /**
   * Cleanup orphaned sources
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async cleanupOrphanedSources(workspaceId: string): Promise<{ orphanedSourcesDeleted: number }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/cleanup-orphaned`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cleanup orphaned sources');
    }

    const data = await response.json();
    return { orphanedSourcesDeleted: data.orphanedSourcesDeleted };
  }

  /**
   * Enhance list with AI insights
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async enhanceList(workspaceId: string, listId: string): Promise<{
    aiInsights: { summary: string; topSkill: string; diversityScore: number };
    starredCount: number;
    sampleCandidates: Array<{ id: string; name: string; email: string; starred: boolean }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/enhance`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to enhance list');
    }

    const data = await response.json();
    return data.enhancement;
  }

  /**
   * Enhance multiple lists in batch
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async enhanceListsBatch(workspaceId: string, listIds: string[]): Promise<Record<string, {
    aiInsights: { summary: string; topSkill: string; diversityScore: number };
    starredCount: number;
    sampleCandidates: Array<{ id: string; name: string; email: string; starred: boolean }>;
    totalCandidates: number;
    remainingCandidates: number;
  }>> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/enhance-batch`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ listIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to enhance lists');
    }

    const data = await response.json();
    return data.enhancements;
  }

  /**
   * Get list details
   * @param workspaceId - Workspace ID from WorkspaceContext
   * @param projectId - Project ID from WorkspaceContext
   */
  async getListDetails(workspaceId: string, projectId: string, listId: string): Promise<CandidateList> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get list details');
    }

    const data = await response.json();
    return data.list;
  }

  /**
   * Get list candidates with pagination
   * @param workspaceId - Workspace ID from WorkspaceContext
   * @param projectId - Project ID from WorkspaceContext
   */
  async getListCandidates(workspaceId: string, projectId: string, listId: string, page: number = 1, limit: number = 20): Promise<any[]> {
    const offset = (page - 1) * limit;
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/candidates?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get list candidates');
    }

    const data = await response.json();
    return data.candidates;
  }

  /**
   * Toggle candidate star status
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async toggleCandidateStar(workspaceId: string, listId: string, candidateId: string): Promise<{ success: boolean; starred: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/candidates/${candidateId}/star`, {
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
   * Check if source has new candidates
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async checkSourceForNewCandidates(workspaceId: string, listId: string, sourceId: string): Promise<{
    success: boolean;
    hasNew: boolean;
    currentRows: number;
    lastSyncedRows: number;
    newRows: number;
    lastSyncedAt?: any;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/sources/${sourceId}/check-new`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check for new candidates');
    }

    return await response.json();
  }

  /**
   * Sync new candidates from source
   * @param workspaceId - Workspace ID from WorkspaceContext
   */
  async syncNewCandidatesFromSource(workspaceId: string, listId: string, sourceId: string): Promise<{
    success: boolean;
    addedCandidates: number;
    duplicates: number;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/sources/${sourceId}/sync-new`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync new candidates');
    }

    return await response.json();
  }

  // ============================================================
  // PROJECT-LEVEL LISTS METHODS
  // ============================================================

  /**
   * Get all lists for a project (project-level)
   */
  async getProjectLists(workspaceId: string, projectId: string): Promise<CandidateList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project lists');
    }

    const data = await response.json();
    return data.lists || [];
  }

  /**
   * Get a single project list by ID
   */
  async getProjectList(workspaceId: string, projectId: string, listId: string): Promise<CandidateList> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project list');
    }

    const data = await response.json();
    return data.list;
  }

  /**
   * Create list at project level
   */
  async createProjectList(workspaceId: string, projectId: string, listData: CreateListRequest & {
    tags?: string[];
    color?: string;
  }): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(listData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project list');
    }

    const data = await response.json();
    return data.listId;
  }

  /**
   * Update project list metadata
   */
  async updateProjectList(workspaceId: string, projectId: string, listId: string, updateData: Partial<CreateListRequest & {
    tags?: string[];
    color?: string;
  }>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project list');
    }
  }

  /**
   * Delete project list
   */
  async deleteProjectList(workspaceId: string, projectId: string, listId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project list');
    }
  }

  /**
   * Get candidates in a project list
   */
  async getProjectListCandidates(workspaceId: string, projectId: string, listId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/candidates?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project list candidates');
    }

    const data = await response.json();
    return data.candidates || [];
  }

  // ============================================================
  // SHARING MECHANISM METHODS
  // ============================================================

  /**
   * Share list with other projects
   */
  async shareProjectList(workspaceId: string, projectId: string, listId: string, targetProjectIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/share`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ targetProjectIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to share list');
    }
  }

  /**
   * Remove sharing from a project
   */
  async unshareProjectList(workspaceId: string, projectId: string, listId: string, targetProjectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/unshare/${targetProjectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to unshare list');
    }
  }

  /**
   * Get lists shared with this project
   */
  async getSharedLists(workspaceId: string, projectId: string): Promise<CandidateList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/shared-lists`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch shared lists');
    }

    const data = await response.json();
    return data.lists || [];
  }

  /**
   * Get candidates from shared list
   */
  async getSharedListCandidates(workspaceId: string, projectId: string, sourceProjectId: string, listId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/shared-lists/${sourceProjectId}/${listId}/candidates?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch shared list candidates');
    }

    const data = await response.json();
    return data.candidates || [];
  }

  /**
   * Copy a list to the current project
   */
  async copyList(workspaceId: string, projectId: string, listId: string, newName?: string, sourceProjectId?: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/copy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newName, sourceProjectId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to copy list');
    }

    const data = await response.json();
    return data.listId;
  }

  // ============================================================
  // PROJECT-LEVEL SOURCE MANAGEMENT
  // ============================================================

  /**
   * Add source to project list
   */
  async addSourceToProjectList(workspaceId: string, projectId: string, listId: string, sourceData: AddSourceRequest): Promise<ValidationResult> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/sources`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sourceData)
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        candidateCount: 0,
        errors: error.validation_errors || [error.error] || ['Failed to add source']
      };
    }

    const result = await response.json();
    return {
      success: result.success,
      candidateCount: result.candidateCount || 0,
      sourceId: result.sourceId
    };
  }

  /**
   * Get sources for project list
   */
  async getProjectListSources(workspaceId: string, projectId: string, listId: string): Promise<CandidateSource[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/sources`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch list sources');
    }

    const data = await response.json();
    return data.sources || [];
  }

  /**
   * Remove source from project list
   */
  async removeSourceFromProjectList(workspaceId: string, projectId: string, listId: string, sourceId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/sources/${sourceId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove source');
    }
  }

  /**
   * Check if source has new candidates for project list
   */
  async checkSourceForNewCandidatesProjectList(workspaceId: string, projectId: string, listId: string, sourceId: string): Promise<{
    success: boolean;
    hasNew: boolean;
    currentRows: number;
    lastSyncedRows: number;
    newRows: number;
    lastSyncedAt?: any;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/sources/${sourceId}/check-new`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check for new candidates');
    }

    return await response.json();
  }

  /**
   * Sync new candidates from source for project list
   */
  async syncNewCandidatesFromProjectListSource(workspaceId: string, projectId: string, listId: string, sourceId: string): Promise<{
    success: boolean;
    addedCandidates: number;
    duplicates: number;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/lists/${listId}/sources/${sourceId}/sync-new`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync new candidates');
    }

    return await response.json();
  }

  // ============================================================
  // WORKSPACE LISTS (for Global Lists tab)
  // ============================================================

  /**
   * Get workspace lists (global/control tower)
   */
  async getWorkspaceLists(workspaceId: string): Promise<CandidateList[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workspace lists');
    }

    const data = await response.json();
    return data.lists || [];
  }

  /**
   * Get workspace list candidates
   */
  async getWorkspaceListCandidates(workspaceId: string, listId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/lists/${listId}/candidates?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch workspace list candidates');
    }

    const data = await response.json();
    return data.candidates || [];
  }
}

export const listsApi = new ListsApiService();