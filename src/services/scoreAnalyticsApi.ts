/**
 * Score Analytics API - Fetch candidate scores for analytics and graphing
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface CandidateScore {
  candidate_id: string;
  candidate_name: string | null;
  candidate_email: string | null;
  interview_type: 'preliminary' | 'fitment';
  interview_id: string;
  ats_score: number | null;
  ats_method: 'gemini-2.5-flash' | 'rule-based' | null;
  ai_interview_score: number | null;
  human_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScoresResponse {
  success: boolean;
  total_candidates: number;
  scores: CandidateScore[];
}

export const scoreAnalyticsApi = {
  /**
   * Get all candidate scores (preliminary + fitment) for the logged-in recruiter
   */
  async getAllScores(): Promise<CandidateScore[]> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/scores/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch candidate scores');
    }

    const data: ScoresResponse = await response.json();
    return data.scores;
  },

  /**
   * Get only preliminary interview scores
   */
  async getPreliminaryScores(): Promise<CandidateScore[]> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/scores/preliminary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch preliminary scores');
    }

    const data = await response.json();
    return data.scores;
  },

  /**
   * Get only fitment interview scores
   */
  async getFitmentScores(): Promise<CandidateScore[]> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/scores/fitment`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fitment scores');
    }

    const data = await response.json();
    return data.scores;
  }
};
