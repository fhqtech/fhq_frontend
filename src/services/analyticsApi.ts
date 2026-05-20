import { listsApi } from './listsApi';
import {
  AnalyticsCandidate,
  AnalyticsList,
  CandidateListStats,
  ProjectDashboardResponse,
  SkillGapsResponse,
} from '@/types/analytics';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

class AnalyticsApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Get all lists for analytics view
  async getLists(): Promise<AnalyticsList[]> {
    try {
      const response = await listsApi.getLists();
      // Transform to analytics format if needed
      return response.lists || [];
    } catch (error) {
      console.error('Failed to fetch lists for analytics:', error);
      return [];
    }
  }

  // Get candidates for a specific list with pagination
  async getListCandidates(listId: string, page: number = 1, limit: number = 20): Promise<AnalyticsCandidate[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/lists/${listId}/candidates?page=${page}&limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.ok) {
        console.warn(`Candidates endpoint returned ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.candidates || [];
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      return [];
    }
  }

  // Get analytics stats for a list
  async getListStats(listId: string): Promise<CandidateListStats | null> {
    try {
      // This endpoint might not exist yet
      const response = await fetch(
        `${API_BASE_URL}/api/lists/${listId}/analytics`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.stats || null;
    } catch (error) {
      console.error('Failed to fetch list stats:', error);
      return null;
    }
  }

  // Phase A workspace dashboard — single round-trip for all four panels
  async getProjectDashboard(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectDashboardResponse | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/dashboard`,
        { headers: this.getAuthHeaders() },
      );
      if (!response.ok) {
        console.warn(`Dashboard endpoint returned ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch project dashboard:', error);
      return null;
    }
  }

  // Phase B — skill-gap aggregation across completed sessions in the project
  async getSkillGaps(
    workspaceId: string,
    projectId: string,
    filters: { domain?: string; sub_domain?: string; date_from?: string } = {},
  ): Promise<SkillGapsResponse | null> {
    try {
      const qs = new URLSearchParams();
      if (filters.domain) qs.set('domain', filters.domain);
      if (filters.sub_domain) qs.set('sub_domain', filters.sub_domain);
      if (filters.date_from) qs.set('date_from', filters.date_from);
      const query = qs.toString();
      const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/skill-gaps${query ? `?${query}` : ''}`,
        { headers: this.getAuthHeaders() },
      );
      if (!response.ok) {
        console.warn(`skill-gaps endpoint returned ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch skill gaps:', error);
      return null;
    }
  }

  // Get detailed candidate profile
  async getCandidateProfile(candidateId: string): Promise<AnalyticsCandidate | null> {
    try {
      // This endpoint might not exist yet
      const response = await fetch(
        `${API_BASE_URL}/api/candidates/${candidateId}/profile`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.candidate || null;
    } catch (error) {
      console.error('Failed to fetch candidate profile:', error);
      return null;
    }
  }
}

export const analyticsApi = new AnalyticsApiService();
