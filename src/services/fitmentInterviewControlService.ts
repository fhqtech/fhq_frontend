/**
 * Fitment Interview Control Service
 * Handles pause/stop/resume functionality for fitment interviews
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface FitmentInterviewControlResponse {
  success: boolean;
  message: string;
  fitmentInterview: any;
}

interface FitmentInterviewStatusResponse {
  success: boolean;
  status: string;
  fitmentInterviewId: string;
}

/**
 * Pause an active fitment interview
 */
export const pauseFitmentInterview = async (fitmentInterviewId: string): Promise<FitmentInterviewControlResponse> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${fitmentInterviewId}/pause`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to pause fitment interview');
  }

  return response.json();
};

/**
 * Stop a fitment interview permanently
 */
export const stopFitmentInterview = async (fitmentInterviewId: string): Promise<FitmentInterviewControlResponse> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${fitmentInterviewId}/stop`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to stop fitment interview');
  }

  return response.json();
};

/**
 * Resume a paused fitment interview
 */
export const resumeFitmentInterview = async (fitmentInterviewId: string): Promise<FitmentInterviewControlResponse> => {
  const token = localStorage.getItem('auth_token');

  const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${fitmentInterviewId}/resume`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to resume fitment interview');
  }

  return response.json();
};

/**
 * Get current fitment interview status (no auth required for candidates)
 */
export const getFitmentInterviewStatus = async (fitmentInterviewId: string): Promise<FitmentInterviewStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/fitment-interviews/${fitmentInterviewId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get fitment interview status');
  }

  return response.json();
};