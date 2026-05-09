/**
 * Optimized Timeline Manager - Batch Processing for Scale
 * Handles high-volume timeline events efficiently with separate collection storage
 */

import {
  TimelineEvent,
  SpeechSegment,
  TimelineChunk,
  TimelineMetadata,
  TimelineEventType,
  SpeakerType,
  TimelineBatchConfig
} from '@/types/timelineOptimized';

export class OptimizedTimelineManager {
  private sessionId: string;
  private config: TimelineBatchConfig;
  private interviewStartTime: number;

  // In-memory buffers
  private eventBuffer: TimelineEvent[] = [];
  private currentChunk: TimelineChunk | null = null;
  private pendingSegments: SpeechSegment[] = [];

  // Statistics
  private statistics = {
    user_speaking_time: 0,
    ai_speaking_time: 0,
    interruptions_count: 0,
    silence_time: 0,
    avg_response_time: 0
  };

  // Upload tracking
  private lastUploadTime: number = 0;
  private uploadTimer: NodeJS.Timeout | null = null;

  constructor(sessionId: string, config?: Partial<TimelineBatchConfig>) {
    this.sessionId = sessionId;
    this.interviewStartTime = Date.now();

    this.config = {
      chunk_size: 50,
      chunk_time_window: 30000, // 30 seconds
      auto_upload_interval: 60000, // 1 minute
      max_memory_chunks: 10,
      ...config
    };

    this.initializeAutoUpload();
    console.log(`[OptimizedTimeline] Initialized for session: ${sessionId}`);
  }

  /**
   * Add timeline event - optimized for high frequency
   */
  addEvent(
    eventType: TimelineEventType,
    speaker?: SpeakerType,
    confidence: number = 1.0,
    text?: string
  ): TimelineEvent {
    const now = Date.now();
    const timestamp = now - this.interviewStartTime;

    const event: TimelineEvent = {
      id: `evt_${timestamp}_${Math.random().toString(36).substr(2, 4)}`,
      t: timestamp,
      e: eventType,
      s: speaker,
      c: confidence !== 1.0 ? confidence : undefined,
      txt: text
    };

    // Add to buffer
    this.eventBuffer.push(event);

    // Update statistics immediately
    this.updateStatistics(event);

    // Check if we need to create new chunk
    if (this.shouldCreateNewChunk()) {
      this.finalizeCurrentChunk();
      this.createNewChunk();
    }

    // Add to current chunk
    if (this.currentChunk) {
      this.currentChunk.events.push(event);
      this.currentChunk.event_count++;
      this.currentChunk.chunk_end_time = timestamp;
    }

    // Check for auto-upload
    if (this.shouldAutoUpload()) {
      this.scheduleUpload();
    }

    return event;
  }

  /**
   * Create speech segment (more efficient than separate start/end events)
   */
  addSpeechSegment(
    speaker: SpeakerType,
    startTime: number,
    endTime: number,
    text?: string,
    confidence?: number,
    wasInterruption?: boolean
  ): SpeechSegment {
    const segment: SpeechSegment = {
      id: `seg_${startTime}_${speaker.toLowerCase()}`,
      session_id: this.sessionId,
      speaker,
      start_time: startTime,
      end_time: endTime,
      duration: (endTime - startTime) / 1000, // Convert to seconds
      text,
      confidence,
      was_interruption: wasInterruption,
      created_at: new Date().toISOString()
    };

    this.pendingSegments.push(segment);

    // Update statistics
    const duration = segment.duration;
    if (speaker === 'USER') {
      this.statistics.user_speaking_time += duration;
    } else {
      this.statistics.ai_speaking_time += duration;
    }

    if (wasInterruption) {
      this.statistics.interruptions_count++;
    }

    console.log(`[OptimizedTimeline] Added ${speaker} segment: ${duration.toFixed(1)}s`);
    return segment;
  }

  /**
   * Process STT result and create segment
   */
  processSSTResult(sttText: string, sttReceivedAt: number, confidence: number): SpeechSegment | null {
    const sttTimestamp = sttReceivedAt - this.interviewStartTime;

    // Find recent user speech events
    const recentUserEvents = this.eventBuffer
      .filter(e =>
        e.e === 'USER_SPEECH_START' || e.e === 'USER_SPEECH_END' &&
        Math.abs(e.t - sttTimestamp) < 5000 // 5 second window
      )
      .sort((a, b) => a.t - b.t);

    if (recentUserEvents.length >= 2) {
      const startEvent = recentUserEvents.find(e => e.e === 'USER_SPEECH_START');
      const endEvent = recentUserEvents.find(e => e.e === 'USER_SPEECH_END');

      if (startEvent && endEvent) {
        // Check if this was an interruption
        const wasInterruption = this.eventBuffer.some(e =>
          e.e === 'AI_INTERRUPTED' &&
          Math.abs(e.t - startEvent.t) < 1000
        );

        return this.addSpeechSegment(
          'USER',
          startEvent.t,
          endEvent.t,
          sttText,
          confidence,
          wasInterruption
        );
      }
    }

    console.warn(`[OptimizedTimeline] Could not match STT result: "${sttText}"`);
    return null;
  }

  /**
   * Check if we should create a new chunk
   */
  private shouldCreateNewChunk(): boolean {
    if (!this.currentChunk) return true;

    const now = Date.now() - this.interviewStartTime;
    const chunkDuration = now - this.currentChunk.chunk_start_time;

    return (
      this.currentChunk.events.length >= this.config.chunk_size ||
      chunkDuration >= this.config.chunk_time_window
    );
  }

  /**
   * Create new chunk
   */
  private createNewChunk(): void {
    const now = Date.now() - this.interviewStartTime;

    this.currentChunk = {
      id: `chunk_${this.sessionId}_${now}`,
      session_id: this.sessionId,
      chunk_start_time: now,
      chunk_end_time: now,
      events: [],
      event_count: 0,
      created_at: new Date().toISOString()
    };

    console.log(`[OptimizedTimeline] Created new chunk: ${this.currentChunk.id}`);
  }

  /**
   * Finalize current chunk (prepare for storage)
   */
  private finalizeCurrentChunk(): void {
    if (this.currentChunk && this.currentChunk.events.length > 0) {
      console.log(`[OptimizedTimeline] Finalized chunk with ${this.currentChunk.events.length} events`);
    }
  }

  /**
   * Check if we should auto-upload
   */
  private shouldAutoUpload(): boolean {
    const now = Date.now();
    return (now - this.lastUploadTime) >= this.config.auto_upload_interval;
  }

  /**
   * Schedule upload of pending data
   */
  private scheduleUpload(): void {
    if (this.uploadTimer) {
      clearTimeout(this.uploadTimer);
    }

    this.uploadTimer = setTimeout(() => {
      this.uploadPendingData();
    }, 1000); // Upload after 1 second delay
  }

  /**
   * Upload pending chunks and segments to backend
   */
  private async uploadPendingData(): Promise<void> {
    try {
      if (this.pendingSegments.length === 0 && !this.currentChunk) {
        return;
      }

      const uploadData = {
        session_id: this.sessionId,
        chunks: this.currentChunk ? [this.currentChunk] : [],
        segments: [...this.pendingSegments],
        statistics: this.statistics,
        upload_timestamp: new Date().toISOString()
      };

      console.log(`[OptimizedTimeline] Uploading: ${uploadData.chunks.length} chunks, ${uploadData.segments.length} segments`);

      // Upload to backend (API call)
      await this.sendToBackend(uploadData);

      // Clear uploaded data
      this.pendingSegments = [];
      this.lastUploadTime = Date.now();

    } catch (error) {
      console.error('[OptimizedTimeline] Upload failed:', error);
      // Keep data in memory for retry
    }
  }

  /**
   * Send data to backend
   */
  private async sendToBackend(data: any): Promise<void> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/timeline/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Backend upload failed: ${response.statusText}`);
    }
  }

  /**
   * Initialize auto-upload timer
   */
  private initializeAutoUpload(): void {
    setInterval(() => {
      if (this.shouldAutoUpload()) {
        this.scheduleUpload();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Update statistics
   */
  private updateStatistics(event: TimelineEvent): void {
    // Statistics updated in addSpeechSegment for accuracy
  }

  /**
   * Get final timeline metadata for interview completion
   */
  getTimelineMetadata(): TimelineMetadata {
    // Upload any remaining data
    this.scheduleUpload();

    const totalDuration = (Date.now() - this.interviewStartTime) / 1000;

    return {
      session_id: this.sessionId,
      total_events: this.eventBuffer.length,
      total_chunks: this.currentChunk ? 1 : 0, // Simplified for now
      total_segments: this.pendingSegments.length,
      recording_duration: totalDuration,
      statistics: {
        ...this.statistics,
        silence_time: totalDuration - this.statistics.user_speaking_time - this.statistics.ai_speaking_time
      },
      created_at: new Date(this.interviewStartTime).toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.uploadTimer) {
      clearTimeout(this.uploadTimer);
    }

    // Final upload
    this.uploadPendingData();
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    return (this.eventBuffer.length * 150) + (this.pendingSegments.length * 200); // Rough estimate
  }
}