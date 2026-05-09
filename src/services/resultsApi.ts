/**
 * Results API Service
 * Handles fetching interview results from backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export const resultsApi = {
  /**
   * Fetch results for a specific session
   */
  async fetchSessionResults(sessionId: string) {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/results/session/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Results not found');
      }
      throw new Error('Failed to fetch results');
    }

    const data = await response.json();
    return data.results;
  },

  /**
   * Fetch all results for a candidate in an interview (all attempts)
   */
  async fetchCandidateAllResults(interviewId: string, candidateId: string) {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(
      `${API_BASE_URL}/api/results/interview/${interviewId}/candidate/${candidateId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch candidate results');
    }

    const data = await response.json();
    return data.results || [];
  },

  /**
   * Fetch fitment interview results for a candidate
   */
  async fetchFitmentCandidateResults(fitmentInterviewId: string, candidateId: string) {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(
      `${API_BASE_URL}/api/results/fitment/${fitmentInterviewId}/candidate/${candidateId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch fitment results');
    }

    const data = await response.json();
    return data.results || [];
  },

  /**
   * Check if results exist and their status
   */
  async checkResultsStatus(sessionId: string) {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/results/status/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check results status');
    }

    const data = await response.json();
    return {
      status: data.status,
      sessionId: data.session_id,
      generatedAt: data.generated_at
    };
  }
};
