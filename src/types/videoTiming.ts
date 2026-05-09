/**
 * Simple Video Timing Types - Enhanced Conversation History
 * Adds video synchronization to existing conversation flow
 */

/**
 * Video timing data added to conversation history entries
 */
export interface VideoTiming {
  video_start: number;        // Second into video when speaking started
  video_end: number;          // Second into video when speaking ended
  was_interrupted?: boolean;  // True if user interrupted AI (optional)
}

/**
 * Enhanced conversation history entry with video timing
 */
export interface ConversationEntryWithTiming {
  type: 'question' | 'answer';
  text: string;
  timestamp: string;
  video_start?: number;       // Video timing (optional for backward compatibility)
  video_end?: number;
  was_interrupted?: boolean;
}

/**
 * Simple speaker state for tracking who's currently talking
 */
export interface SpeakerState {
  current_speaker: 'AI' | 'USER' | null;
  ai_speaking_since?: number;    // Video offset when AI started speaking
  user_speaking_since?: number;  // Video offset when user started speaking
  video_start_time: number;      // Interview start timestamp for offset calculation
}

/**
 * Interruption event - when user interrupts AI
 */
export interface InterruptionEvent {
  interrupted_at: number;        // Video offset when interruption happened
  ai_message: string;           // What AI was saying when interrupted
  user_message?: string;        // What user said (when STT completes)
}