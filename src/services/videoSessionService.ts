/**
 * Video Session Service
 * Handles fetching session data from backend APIs
 */

import { VideoSessionData } from '@/data/mockVideoData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

export class VideoSessionService {
  /**
   * Fetch complete session data from backend
   */
  async fetchSessionData(sessionId: string): Promise<VideoSessionData> {
    try {
      console.log(`[VideoSessionService] Fetching session data for: ${sessionId}`);

      const response = await fetch(`${API_BASE_URL}/api/videos/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found');
        }
        throw new Error(`Failed to fetch session data: ${response.statusText}`);
      }

      const sessionData = await response.json();
      console.log(`[VideoSessionService] Received session data:`, sessionData);

      return sessionData;
    } catch (error) {
      console.error(`[VideoSessionService] Error fetching session data:`, error);
      throw error;
    }
  }

  /**
   * Check if video file exists for session
   */
  async checkVideoAvailability(interviewId: string, sessionId: string): Promise<{
    available: boolean;
    videoUrl?: string;
    error?: string;
  }> {
    try {
      console.log(`[VideoSessionService] Checking video availability for: ${sessionId}`);

      const response = await fetch(`${API_BASE_URL}/api/videos/${interviewId}/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { available: false, error: 'Video not found' };
        }
        throw new Error(`Failed to check video: ${response.statusText}`);
      }

      const videoInfo = await response.json();
      console.log(`[VideoSessionService] Video info:`, videoInfo);

      return {
        available: true,
        videoUrl: videoInfo.stream_url || videoInfo.gcs_path
      };
    } catch (error) {
      console.error(`[VideoSessionService] Error checking video:`, error);
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get video stream URL for player
   */
  getVideoStreamUrl(interviewId: string, sessionId: string): string {
    return `${API_BASE_URL}/api/videos/${interviewId}/${sessionId}?stream=true`;
  }

  /**
   * Validate session data format
   */
  private validateSessionData(data: any): VideoSessionData {
    const requiredFields = ['sessionId', 'interviewId', 'candidate', 'interview', 'video', 'conversation'];

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Ensure annotations array exists
    if (!data.annotations) {
      data.annotations = [];
    }

    return data as VideoSessionData;
  }
}

// Export singleton instance
export const videoSessionService = new VideoSessionService();