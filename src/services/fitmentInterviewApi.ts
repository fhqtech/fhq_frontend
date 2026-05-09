const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export interface FitmentInterview {
  id: string;
  title: string;
  jobDescription: string;
  status: 'draft' | 'active' | 'paused' | 'stopped' | 'completed' | 'cancelled';
  lists: string[];
  candidateCount: number;
  listsCount: number;
  parentInterviews: ParentInterview[];
  parentInterviewIds: string[];
  parentInterviewsCount: number;
  created: string;
  createdAt: any;
  updatedAt: any;
  userId: string;
  createdBy: string;
}

export interface ParentInterview {
  interviewId: string;
  interviewTitle: string;
  attachedAt: any;
}

export interface CreateFitmentInterviewRequest {
  title: string;
  jobDescription: string;
  lists: string[];
  parentInterviewIds?: string[];
}

export interface CreateFitmentInterviewResponse {
  success: boolean;
  fitmentInterviewId: string;
  candidateCount: number;
  listsCount: number;
  message: string;
}

export interface GetFitmentInterviewsResponse {
  success: boolean;
  fitmentInterviews: FitmentInterview[];
  count: number;
}

export interface GetFitmentInterviewResponse {
  success: boolean;
  fitmentInterview: FitmentInterview;
}

export interface UpdateFitmentInterviewRequest {
  title?: string;
  jobDescription?: string;
  lists?: string[];
  status?: 'draft' | 'active' | 'paused' | 'stopped' | 'completed' | 'cancelled';
}

export interface UpdateFitmentInterviewResponse {
  success: boolean;
  message: string;
  updatedFields: string[];
  candidateCount: number;
}

export interface LinkToParentInterviewRequest {
  parentInterviewId: string;
}

export interface LinkToParentInterviewResponse {
  success: boolean;
  message: string;
  linkedToInterview: ParentInterview;
  totalParentInterviews: number;
}

export interface DeleteFitmentInterviewResponse {
  success: boolean;
  message: string;
  deletedFitmentInterviewId: string;
  deletedTitle: string;
}

class FitmentInterviewApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Create a new fitment interview
  async createFitmentInterview(data: CreateFitmentInterviewRequest): Promise<CreateFitmentInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create fitment interview');
    }

    return response.json();
  }

  // Get all fitment interviews for the user
  async getFitmentInterviews(): Promise<GetFitmentInterviewsResponse> {
    console.log('🔄 Making API call to /fitment-interviews');
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fitment interviews');
    }

    const data = await response.json();
    console.log('✅ API response:', data);
    return data;
  }

  // Get a single fitment interview by ID
  async getFitmentInterview(id: string): Promise<GetFitmentInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fitment interview');
    }

    return response.json();
  }

  // Update a fitment interview
  async updateFitmentInterview(id: string, data: UpdateFitmentInterviewRequest): Promise<UpdateFitmentInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update fitment interview');
    }

    return response.json();
  }

  // Delete a fitment interview
  async deleteFitmentInterview(id: string): Promise<DeleteFitmentInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete fitment interview');
    }

    return response.json();
  }

  // Link fitment interview to parent interview
  async linkToParentInterview(id: string, data: LinkToParentInterviewRequest): Promise<LinkToParentInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${id}/link`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to link to parent interview');
    }

    return response.json();
  }

  // Start fitment interview
  async startFitmentInterview(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${id}/start`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start fitment interview');
    }

    return response.json();
  }

  // Get candidates for a fitment interview
  async getFitmentInterviewCandidates(id: string, page: number = 1, pageSize: number = 50) {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${id}/candidates?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch fitment interview candidates');
    }

    return response.json();
  }

  // Get video session data for a fitment interview candidate
  async getCandidateVideoSession(fitmentInterviewId: string, candidateId: string, sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${fitmentInterviewId}/candidates/${candidateId}/video/${sessionId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get candidate video session');
    }

    return response.json();
  }

  // Create video session for a fitment interview candidate
  async createCandidateVideoSession(fitmentInterviewId: string, candidateId: string, candidateData: any = {}) {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${fitmentInterviewId}/candidates/${candidateId}/sessions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(candidateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create candidate video session');
    }

    return response.json();
  }

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }
}

export const fitmentInterviewApi = new FitmentInterviewApiService();