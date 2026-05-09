/**
 * Credit API Service - Credit management for interviews
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface CreditInfo {
  hardLimit: number;
  softLimit: number;
  used: number;
  available: number;
  creditCosts: Record<number, number>;
}

export interface CreditEstimate {
  creditsPerInterview: number;
  totalCreditsNeeded: number;
  availableCredits: number;
  maxCandidatesPossible: number;
  isOverBudget: boolean;
  shortfall: number;
  candidateCount: number;
  durationMinutes: number;
  projectBudget: {
    hardLimit: number;
    softLimit: number;
    used: number;
  };
}

export interface CreditCheckResult {
  hasSufficientCredits: boolean;
  availableCredits: number;
  requiredCredits: number;
  shortfall: number;
}

class CreditApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get credit information for a project
   */
  async getCreditInfo(
    workspaceId: string,
    projectId: string
  ): Promise<CreditInfo> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/credit-info?workspace_id=${workspaceId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get credit info');
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get credit estimation for an interview
   */
  async getCreditEstimate(
    workspaceId: string,
    projectId: string,
    duration: number,
    candidateCount: number = 0
  ): Promise<CreditEstimate> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/credit-estimate?workspace_id=${workspaceId}&duration=${duration}&candidate_count=${candidateCount}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get credit estimate');
    }

    const data = await response.json();
    return data;
  }

  /**
   * Check if project has sufficient credits for another interview
   */
  async checkSufficientCredits(
    workspaceId: string,
    projectId: string,
    duration: number
  ): Promise<CreditCheckResult> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/check-credits?workspace_id=${workspaceId}&duration=${duration}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check credits');
    }

    const data = await response.json();
    return data;
  }
}

export const creditApi = new CreditApiService();
