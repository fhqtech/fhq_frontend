/**
 * Timeline Event Types for Audio Detection System
 * Used to track speaker activity during interviews for video synchronization
 */

export type TimelineEventType =
  | 'USER_SPEECH_START'
  | 'USER_SPEECH_END'
  | 'AI_SPEECH_START'
  | 'AI_SPEECH_END'
  | 'AI_INTERRUPTED'
  | 'SILENCE_DETECTED';

export type SpeakerType = 'USER' | 'AI';

/**
 * Individual timeline event - represents a single moment in the interview
 */
export interface TimelineEvent {
  id: string;                           // Unique event identifier
  timestamp: number;                    // Milliseconds since interview start
  eventType: TimelineEventType;         // What type of event occurred
  confidence: number;                   // Confidence level (0-1)
  metadata?: {
    aiMessage?: string;                 // AI message text (for AI speech events)
    interruptedBy?: TimelineEventType;  // What caused an interruption
    audioLevel?: number;                // Audio amplitude level
    duration?: number;                  // Event duration in milliseconds
  };
}

/**
 * STT synchronization mapping - connects delayed STT results to actual speech timing
 */
export interface STTSynchronization {
  id: string;                          // Unique sync entry identifier
  sttText: string;                     // Text returned by STT
  sttReceivedAt: number;               // When STT returned this text (timestamp)
  actualSpeaker: SpeakerType;          // Who actually spoke (USER or AI)
  actualStartTime: number;             // When speaker actually started (timestamp)
  actualEndTime: number;               // When speaker actually ended (timestamp)
  confidence: number;                  // STT confidence score
  wasInterruption: boolean;            // Was this an interruption scenario
  relatedEvents: string[];             // IDs of timeline events related to this STT
}

/**
 * Speaker statistics calculated from timeline
 */
export interface SpeakerStatistics {
  userSpeakingTime: number;            // Total user speaking time in seconds
  aiSpeakingTime: number;              // Total AI speaking time in seconds
  interruptionsCount: number;          // Number of times user interrupted AI
  totalSilenceTime: number;            // Total silence periods in seconds
  averageResponseTime: number;         // Average time between AI finishing and user starting
  longestUserSpeech: number;           // Longest continuous user speech in seconds
  longestAISpeech: number;             // Longest continuous AI speech in seconds
}

/**
 * Complete timeline data structure stored in memory during interview
 */
export interface InterviewTimeline {
  sessionId: string;                   // Interview session identifier
  interviewStartTime: number;          // Interview start timestamp (Date.now())
  events: TimelineEvent[];             // All timeline events
  sttSynchronizations: STTSynchronization[]; // STT to timeline mappings
  currentSpeaker: SpeakerType | null;  // Current active speaker
  lastEventId: string | null;          // ID of most recent event
  statistics: SpeakerStatistics;       // Real-time calculated statistics
}

/**
 * Timeline data format for database storage (post-interview)
 */
export interface TimelineStorageData {
  audio_timeline: {
    events: TimelineEvent[];
    total_events: number;
    recording_duration: number;         // Total interview duration in seconds
    created_at: string;                 // ISO timestamp when timeline was created
  };
  transcript_synchronization: STTSynchronization[];
  speaker_statistics: SpeakerStatistics;
}

/**
 * Configuration options for timeline system
 */
export interface TimelineConfig {
  maxEvents: number;                   // Maximum events to store in memory (rolling buffer)
  confidenceThreshold: number;         // Minimum confidence for events (0-1)
  silenceTimeoutMs: number;            // Silence detection timeout in milliseconds
  compressionAgeMs: number;            // Age after which events get compressed
  performanceMode: 'high' | 'balanced' | 'memory_saver'; // Performance vs memory trade-off
}

/**
 * Timeline system state for React component
 */
export interface TimelineState {
  timeline: InterviewTimeline;
  config: TimelineConfig;
  isActive: boolean;                   // Whether timeline tracking is active
  lastUpdate: number;                  // Last update timestamp
  memoryUsage: number;                 // Estimated memory usage in bytes
  processingLoad: number;              // Current processing load (0-1)
}

/**
 * Event for timeline updates (for React state management)
 */
export interface TimelineUpdateEvent {
  type: 'EVENT_ADDED' | 'STT_MAPPED' | 'STATISTICS_UPDATED' | 'TIMELINE_RESET';
  payload: {
    event?: TimelineEvent;
    sttSync?: STTSynchronization;
    statistics?: SpeakerStatistics;
    timestamp: number;
  };
}