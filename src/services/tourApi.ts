const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface TourStatusResponse {
  tour_status: TourStatus;
}

export interface UpdateTourStatusResponse {
  message: string;
  tour_status: TourStatus;
}

/**
 * Get the current user's tour status
 */
export const getTourStatus = async (): Promise<TourStatus> => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No auth token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/tour-status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get tour status');
  }

  const data: TourStatusResponse = await response.json();
  return data.tour_status;
};

/**
 * Update the current user's tour status
 */
export const updateTourStatus = async (status: TourStatus): Promise<void> => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No auth token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/tour-status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ tour_status: status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update tour status');
  }
};

/**
 * Mark tour as completed
 */
export const completeTour = async (): Promise<void> => {
  return updateTourStatus('completed');
};

/**
 * Mark tour as skipped
 */
export const skipTour = async (): Promise<void> => {
  return updateTourStatus('skipped');
};

/**
 * Start or resume tour
 */
export const startTour = async (): Promise<void> => {
  return updateTourStatus('in_progress');
};