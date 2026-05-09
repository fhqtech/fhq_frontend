const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

// Email-only duplicate detection for reliable and fast matching

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export interface DuplicateAnalysis {
  totalCandidates: number;
  uniqueCandidates: number;
  totalDuplicates: number;
  duplicateRate: number;
  listAnalysis: ListAnalysis[];
  duplicateGroups: DuplicateGroup[];
  recommendations: string[];
  analysisTimestamp: string;
}

export interface ListAnalysis {
  listId: string;
  listName: string;
  totalCandidates: number;
  uniqueCandidates: number;
  duplicateCount: number;
  duplicateRate: number;
  internalDuplicates: number;
  externalDuplicates: number;
  sources: SourceSummary[];
}

export interface SourceSummary {
  sourceId: string;
  name: string;
  type: string;
  candidateCount: number;
}

export interface DuplicateGroup {
  duplicateType: 'email';
  duplicateKey: string;
  candidates: DuplicateCandidate[];
  count: number;
}

export interface DuplicateCandidate {
  name: string;
  email: string;
  phone: string;
  sourceId: string;
  listId: string;
  sourceName: string;
  sourceType: string;
  index: number;
}

export interface OverlapAnalysis {
  listInfo: Record<string, ListInfo>;
  overlapMatrix: OverlapMatrix[][];
  analysisTimestamp: string;
}

export interface ListInfo {
  id: string;
  name: string;
  description: string;
  totalCandidates: number;
  sourcesCount: number;
}

export interface OverlapMatrix {
  listId1: string;
  listId2: string;
  overlapCount: number;
  overlapPercentage: number;
  duplicates: OverlapDuplicate[];
}

export interface OverlapDuplicate {
  candidate1: CandidateInfo;
  candidate2: CandidateInfo;
  duplicateReason: string;
}

export interface CandidateInfo {
  name: string;
  email: string;
  sourceId: string;
  sourceName: string;
}

class DuplicateDetectionApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'DuplicateDetectionApiError';
  }
}

export const duplicateDetectionApi = {
  /**
   * Analyze duplicates across multiple candidate lists
   */
  async analyzeCrossListDuplicates(listIds: string[], workspaceId?: string, projectId?: string): Promise<DuplicateAnalysis> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/duplicate-detection/lists/duplicate-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          listIds,
          workspaceId,
          projectId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new DuplicateDetectionApiError(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      if (error instanceof DuplicateDetectionApiError) {
        throw error;
      }
      throw new DuplicateDetectionApiError(`Failed to analyze cross-list duplicates: ${error.message}`);
    }
  },

  /**
   * Analyze duplicates within a single list
   */
  async analyzeSingleListDuplicates(listId: string): Promise<DuplicateAnalysis> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/duplicate-detection/lists/${listId}/duplicate-analysis`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new DuplicateDetectionApiError(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      if (error instanceof DuplicateDetectionApiError) {
        throw error;
      }
      throw new DuplicateDetectionApiError(`Failed to analyze single list duplicates: ${error.message}`);
    }
  },

  /**
   * Analyze overlap between specific lists
   */
  async analyzeListOverlap(listIds: string[]): Promise<OverlapAnalysis> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/duplicate-detection/lists/overlap-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ listIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new DuplicateDetectionApiError(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      if (error instanceof DuplicateDetectionApiError) {
        throw error;
      }
      throw new DuplicateDetectionApiError(`Failed to analyze list overlap: ${error.message}`);
    }
  },

  /**
   * Check if duplicate detection service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/duplicate-detection/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      console.error('Duplicate detection health check failed:', error);
      return false;
    }
  },
};

export { DuplicateDetectionApiError };