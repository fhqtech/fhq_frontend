/**
 * Optimized Timeline Types - Separate Collection Architecture
 * Designed for high-volume timeline events (30+ minute interviews)
 */

export type TimelineEventType =
  | 'USER_SPEECH_START'
  | 'USER_SPEECH_END'
  | 'AI_SPEECH_START'
  | 'AI_SPEECH_END'
  | 'AI_INTERRUPTED'
  | 'SPEECH_SEGMENT'; // New: Combined start/end for efficiency

export type SpeakerType = 'USER' | 'AI';

/**
 * Optimized timeline event - smaller, more efficient
 */
export interface TimelineEvent {
  id: string;
  t: number;                    // Timestamp (milliseconds since interview start)
  e: TimelineEventType;         // Event type (shortened)
  s?: SpeakerType;             // Speaker (optional, can be inferred)
  c?: number;                  // Confidence (optional, default 1.0)
  d?: number;                  // Duration for segments (optional)
  txt?: string;                // Text for AI speech or STT results (optional)
}

/**
 * Speech segment - combines start/end into single efficient record
 */
export interface SpeechSegment {
  id: string;
  session_id: string;
  speaker: SpeakerType;
  start_time: number;          // Start timestamp
  end_time: number;            // End timestamp
  duration: number;            // Duration in seconds
  text?: string;               // STT text for user, AI message for AI
  confidence?: number;         // STT confidence or 1.0 for AI
  was_interruption?: boolean;  // True if this was an interruption
  created_at: string;          // ISO timestamp
}

/**
 * Timeline chunk - batch of events stored together
 */
export interface TimelineChunk {
  id: string;                  // chunk_sessionId_startTime
  session_id: string;
  chunk_start_time: number;    // When this chunk starts
  chunk_end_time: number;      // When this chunk ends
  events: TimelineEvent[];     // Batch of events
  event_count: number;         // Number of events in chunk
  created_at: string;          // ISO timestamp
}

/**
 * Interview timeline metadata (stored in main session)
 */
export interface TimelineMetadata {
  session_id: string;
  total_events: number;
  total_chunks: number;
  total_segments: number;
  recording_duration: number;   // Total interview duration
  statistics: {
    user_speaking_time: number;
    ai_speaking_time: number;
    interruptions_count: number;
    silence_time: number;
    avg_response_time: number;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Optimized storage collections
 */
export interface TimelineCollections {
  // Small metadata in main interview_sessions document
  metadata: TimelineMetadata;

  // Separate collections for high-volume data
  chunks: TimelineChunk[];      // Raw events in batches
  segments: SpeechSegment[];    // Processed speech segments
}

/**
 * Batching configuration
 */
export interface TimelineBatchConfig {
  chunk_size: number;           // Events per chunk (default: 50)
  chunk_time_window: number;    // Time window per chunk in ms (default: 30000 = 30 seconds)
  auto_upload_interval: number; // Upload chunks every N seconds (default: 60)
  max_memory_chunks: number;    // Max chunks to keep in memory (default: 10)
}