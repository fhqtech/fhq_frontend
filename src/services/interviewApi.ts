/**
 * Interview API Service - Project-scoped interview management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface Interview {
  id: string;
  title: string;
  type: string;
  description: string;
  duration: number;
  status: string;
  voiceType?: string;
  voiceSpeed?: string;
  voiceAccent?: string;
  communications?: {
    email: boolean;
    phone: boolean;
    sms: boolean;
  };
  lists: string[];
  candidateCount: number;
  duplicateAnalysis?: any;
  emailsSent: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  blueprintStatus?: 'pending' | 'generating' | 'completed' | 'failed' | 'ready' | 'error';
  blueprintError?: string | null;
}

export interface CreateInterviewRequest {
  title: string;
  type: string;
  description: string;
  duration: number;
  voiceType?: string;
  voiceSpeed?: string;
  voiceAccent?: string;
  communications?: {
    email: boolean;
    phone: boolean;
    sms: boolean;
  };
  selectedListIds?: string[];
  duplicateAnalysis?: any;
}

export interface UpdateInterviewRequest {
  title?: string;
  type?: string;
  description?: string;
  duration?: number;
  status?: string;
  voiceType?: string;
  voiceSpeed?: string;
  voiceAccent?: string;
  communications?: {
    email: boolean;
    phone: boolean;
    sms: boolean;
  };
  selectedListIds?: string[];
  duplicateAnalysis?: any;
}

class InterviewApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Create a new interview
   */
  async createInterview(
    workspaceId: string,
    projectId: string,
    interviewData: CreateInterviewRequest
  ): Promise<Interview> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(interviewData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create interview');
    }

    // F8: Backend currently returns {message, interview, interviewId}.
    // Accept either shape so a wrapper change can't break creates.
    const data: any = await response.json();
    if (data?.interview) return data.interview as Interview;
    if (data?.id || data?.title) return data as Interview;
    return data as Interview;
  }

  /**
   * Get all interviews for a project
   */
  async getInterviews(
    workspaceId: string,
    projectId: string,
    filters?: {
      page?: number;
      limit?: number;
      status?: string[];
      type?: string;
      search?: string;
      start_date?: string;
      end_date?: string;
      min_candidates?: number;
      max_candidates?: number;
    }
  ): Promise<{ interviews: Interview[]; pagination: any }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.status) filters.status.forEach(s => queryParams.append('status', s));
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.min_candidates) queryParams.append('min_candidates', filters.min_candidates.toString());
      if (filters.max_candidates) queryParams.append('max_candidates', filters.max_candidates.toString());
    }

    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews?${queryParams}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get interviews');
    }

    return await response.json();
  }

  /**
   * Get a single interview by ID
   */
  async getInterview(
    workspaceId: string,
    projectId: string,
    interviewId: string
  ): Promise<Interview> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get interview');
    }

    const data = await response.json();
    return data.interview || data;
  }

  /**
   * Update an interview
   */
  async updateInterview(
    workspaceId: string,
    projectId: string,
    interviewId: string,
    updateData: UpdateInterviewRequest
  ): Promise<Interview> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.detail || 'Failed to update interview');
    }

    // Backend returns the interview dict directly (not wrapped in {interview:…}).
    // Tolerate both shapes so a future change can't break the page.
    const data: any = await response.json();
    if (data?.interview) return data.interview as Interview;
    if (data?.id || data?.title) return data as Interview;
    return data as Interview;
  }

  /**
   * Invite one or more candidates to an existing interview. Hits the
   * non-scoped legacy route POST /api/interviews/{id}/invite-candidates,
   * which mints invitations + sends emails via SES. Returns 200 on
   * success or 207 multi-status if any single invite failed (e.g.
   * duplicate, invalid email).
   */
  async inviteCandidates(
    interviewId: string,
    candidates: Array<{ name: string; email: string }>
  ): Promise<{
    success: boolean;
    invitations_created?: number;
    emails_sent?: number;
    emails_failed?: number;
    errors?: Array<any>;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/interviews/${interviewId}/invite-candidates`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ candidates }),
      }
    );

    if (!response.ok && response.status !== 207) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.error || 'Failed to invite candidates');
    }

    const data: any = await response.json();
    // 207 wraps the payload in `detail`; 200 returns it flat. Accept both.
    return response.status === 207 && data?.detail ? data.detail : data;
  }

  /**
   * Delete an interview
   */
  async deleteInterview(
    workspaceId: string,
    projectId: string,
    interviewId: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete interview');
    }
  }

  /**
   * Get interview configuration
   */
  async getInterviewConfiguration(
    workspaceId: string,
    projectId: string,
    interviewId: string
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/configuration`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get interview configuration');
    }

    return await response.json();
  }

  /**
   * Get interview candidates
   */
  async getInterviewCandidates(
    workspaceId: string,
    projectId: string,
    interviewId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/candidates?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get interview candidates');
    }

    return await response.json();
  }

  /**
   * Resend invitation email for a single candidate.
   * Phase 3a: backend persists email_sent / email_error / etc. and
   * returns the fresh state.
   */
  async resendInvitationEmail(invitationId: string): Promise<{
    success: boolean;
    invitation_id: string;
    email_sent: boolean;
    email_sent_at: string | null;
    email_error: string | null;
    email_message_id: string | null;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/invitations/${invitationId}/resend`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err: Error & { status?: number } = new Error(
        data?.detail || data?.error || 'Resend failed'
      );
      err.status = response.status;
      throw err;
    }
    return data;
  }

  /**
   * Get interview stats
   */
  async getInterviewStats(
    workspaceId: string,
    projectId: string,
    interviewId: string
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/stats`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.detail || 'Failed to get interview stats');
    }

    // Backend returns the stats object directly (not wrapped in {stats:…}).
    // Tolerate either shape — same defensive pattern as templates/update fixes.
    const data: any = await response.json();
    if (data?.stats) return data.stats;
    return data;
  }

  /**
   * Get interview blueprint
   */
  async getInterviewBlueprint(
    workspaceId: string,
    projectId: string,
    interviewId: string
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/blueprint`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get interview blueprint');
    }

    return await response.json();
  }

  /**
   * Generate blueprint for an interview
   */
  async generateBlueprint(
    workspaceId: string,
    projectId: string,
    data: { id: string; title: string; description: string; notes?: string }
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/generate-blueprint`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate blueprint');
    }

    return await response.json();
  }

  /**
   * Create a new fitment interview
   */
  async createFitmentInterview(
    workspaceId: string,
    projectId: string,
    fitmentData: {
      title: string;
      jobDescription: string;
      lists: string[];
    }
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/fitment-interviews`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(fitmentData)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create fitment interview');
    }

    return await response.json();
  }

  /**
   * Get all fitment interviews for a project
   */
  async getFitmentInterviews(
    workspaceId: string,
    projectId: string
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/fitment-interviews`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get fitment interviews');
    }

    return await response.json();
  }

  /**
   * Re-send invitation emails for specific candidates on an interview.
   * Does not mint new tokens — resends the email tied to the existing
   * invitation. Use for expired or stuck-on-scheduling candidates.
   */
  async resendInvitations(
    interviewId: string,
    candidateIds: string[],
    workspaceId?: string,
    projectId?: string,
  ): Promise<{
    invitations_resent: number;
    emails_sent: number;
    emails_failed: number;
    errors: string[];
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/interviews/${interviewId}/resend-invitations`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          candidate_ids: candidateIds,
          workspace_id: workspaceId,
          project_id: projectId,
        }),
      },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.error || 'Failed to resend invitations');
    }
    return await response.json();
  }
}

export const interviewApi = new InterviewApiService();
