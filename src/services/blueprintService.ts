/**
 * Blueprint Service - API functions for interview blueprints
 */

export interface BlueprintResponse {
  success: boolean;
  blueprint: any;
}

export const checkBlueprintExists = async (
  workspaceId: string,
  projectId: string,
  interviewId: string,
  retries: number = 3
): Promise<{ exists: boolean; blueprint?: any }> => {
  const token = localStorage.getItem('auth_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`Checking blueprint for interview: ${interviewId} (attempt ${attempt + 1}/${retries})`);
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/blueprint`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Blueprint API response status:', response.status);

      if (response.status === 404) {
        console.log('Blueprint not found (404)');
        return { exists: false };
      }

      if (!response.ok) {
        // Retry on 5xx errors or network issues
        if (response.status >= 500 && attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Blueprint API error (${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        console.error('Blueprint API error:', response.status, response.statusText);
        throw new Error('Failed to check blueprint');
      }

      const data = await response.json();
      console.log('Blueprint check response:', data);

      // Check if we have blueprint data
      if (data && data.blueprint) {
        return { exists: true, blueprint: data.blueprint };
      } else {
        console.log('No blueprint data in response');
        return { exists: false };
      }

    } catch (error) {
      // Retry on network errors
      if (attempt < retries - 1 && error instanceof TypeError) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error checking blueprint, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error('Error checking blueprint:', error);
      return { exists: false };
    }
  }

  return { exists: false };
};

export const fetchInterviewBlueprint = async (workspaceId: string, projectId: string, interviewId: string): Promise<any> => {
  const token = localStorage.getItem('auth_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

  const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/${interviewId}/blueprint`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Blueprint not found');
    }
    throw new Error('Failed to fetch blueprint');
  }

  const data: BlueprintResponse = await response.json();
  return data.blueprint;
};