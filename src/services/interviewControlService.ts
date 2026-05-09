/**
 * Interview Control Service
 * Handles pause/stop/resume functionality for interviews
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface InterviewControlResponse {
  message: string;
  interview: any;
}

interface InterviewStatusResponse {
  status: string;
  interviewId: string;
}

/**
 * Pause an active interview
 */
export const pauseInterview = async (
  workspaceId: string,
  projectId: string,
  interviewId: string
): Promise<InterviewControlResponse> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/pause`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to pause interview');
  }

  return response.json();
};

/**
 * Stop an interview permanently
 */
export const stopInterview = async (
  workspaceId: string,
  projectId: string,
  interviewId: string
): Promise<InterviewControlResponse> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/stop`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to stop interview');
  }

  return response.json();
};

/**
 * Resume a paused interview
 */
export const resumeInterview = async (
  workspaceId: string,
  projectId: string,
  interviewId: string
): Promise<InterviewControlResponse> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(
    `${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/resume`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to resume interview');
  }

  return response.json();
};

/**
 * Get current interview status (no auth required for candidates)
 */
export const getInterviewStatus = async (interviewId: string): Promise<InterviewStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get interview status');
  }

  return response.json();
};