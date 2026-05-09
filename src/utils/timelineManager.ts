/**
 * Timeline Manager - Core logic for managing interview timeline events
 * Handles event creation, STT synchronization, and statistics calculation
 */

import {
  TimelineEvent,
  STTSynchronization,
  InterviewTimeline,
  SpeakerStatistics,
  TimelineEventType,
  SpeakerType,
  TimelineConfig
} from '@/types/timeline';

export class TimelineManager {
  private timeline: InterviewTimeline;
  private config: TimelineConfig;

  constructor(sessionId: string, config?: Partial<TimelineConfig>) {
    this.config = {
      maxEvents: 1000,
      confidenceThreshold: 0.5,
      silenceTimeoutMs: 2000,
      compressionAgeMs: 300000, // 5 minutes
      performanceMode: 'balanced',
      ...config
    };

    this.timeline = {
      sessionId,
      interviewStartTime: Date.now(),
      events: [],
      sttSynchronizations: [],
      currentSpeaker: null,
      lastEventId: null,
      statistics: this.initializeStatistics()
    };
  }

  /**
   * Create and add a new timeline event
   */
  addEvent(
    eventType: TimelineEventType,
    confidence: number = 1.0,
    metadata?: TimelineEvent['metadata']
  ): TimelineEvent {
    const now = Date.now();
    const timestamp = now - this.timeline.interviewStartTime;

    const event: TimelineEvent = {
      id: `evt_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      eventType,
      confidence,
      metadata
    };

    // Add to timeline
    this.timeline.events.push(event);
    this.timeline.lastEventId = event.id;

    // Update current speaker
    this.updateCurrentSpeaker(eventType);

    // Manage memory usage
    this.manageMemory();

    // Update statistics
    this.updateStatistics(event);

    console.log(`[Timeline] Added event: ${eventType} at ${timestamp}ms`, event);

    return event;
  }

  /**
   * Create STT synchronization mapping
   */
  addSTTSynchronization(
    sttText: string,
    sttReceivedAt: number,
    confidence: number
  ): STTSynchronization | null {
    const sttTimestamp = sttReceivedAt - this.timeline.interviewStartTime;

    // Find recent speech activity around the STT timestamp
    const matchingEvents = this.findMatchingEvents(sttTimestamp);

    if (matchingEvents.length === 0) {
      console.warn(`[Timeline] No matching events found for STT: "${sttText}"`);
      return null;
    }

    // Determine actual speaker and timing
    const { speaker, startTime, endTime, wasInterruption } = this.analyzeEvents(matchingEvents, sttTimestamp);

    const sync: STTSynchronization = {
      id: `stt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sttText,
      sttReceivedAt,
      actualSpeaker: speaker,
      actualStartTime: startTime,
      actualEndTime: endTime,
      confidence,
      wasInterruption,
      relatedEvents: matchingEvents.map(e => e.id)
    };

    this.timeline.sttSynchronizations.push(sync);

    console.log(`[Timeline] STT synchronized: "${sttText}" -> ${speaker} at ${startTime}-${endTime}ms`, sync);

    return sync;
  }

  /**
   * Find timeline events that match STT timestamp
   */
  private findMatchingEvents(sttTimestamp: number): TimelineEvent[] {
    const searchWindow = 5000; // 5 second search window
    const startTime = sttTimestamp - searchWindow;
    const endTime = sttTimestamp + 1000; // Allow 1 second forward for processing delay

    return this.timeline.events.filter(event =>
      event.timestamp >= startTime &&
      event.timestamp <= endTime &&
      (event.eventType === 'USER_SPEECH_START' ||
       event.eventType === 'USER_SPEECH_END' ||
       event.eventType === 'AI_INTERRUPTED')
    );
  }

  /**
   * Analyze events to determine actual speaker and timing
   */
  private analyzeEvents(events: TimelineEvent[], sttTimestamp: number) {
    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

    // Look for user speech patterns
    let actualSpeaker: SpeakerType = 'USER';
    let startTime = sttTimestamp;
    let endTime = sttTimestamp;
    let wasInterruption = false;

    // Find user speech start/end pair closest to STT timestamp
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];

      if (current.eventType === 'USER_SPEECH_START' &&
          (next.eventType === 'USER_SPEECH_END' || next.eventType === 'AI_SPEECH_START')) {

        // Check if this speech period is close to STT timestamp
        if (current.timestamp <= sttTimestamp &&
            (next.timestamp >= sttTimestamp || Math.abs(next.timestamp - sttTimestamp) < 2000)) {

          startTime = current.timestamp;
          endTime = next.eventType === 'USER_SPEECH_END' ? next.timestamp : sttTimestamp;

          // Check for interruption (AI was interrupted)
          const interruptEvent = sortedEvents.find(e =>
            e.eventType === 'AI_INTERRUPTED' &&
            Math.abs(e.timestamp - current.timestamp) < 500
          );
          wasInterruption = !!interruptEvent;

          break;
        }
      }
    }

    return { speaker: actualSpeaker, startTime, endTime, wasInterruption };
  }

  /**
   * Update current speaker based on event
   */
  private updateCurrentSpeaker(eventType: TimelineEventType): void {
    switch (eventType) {
      case 'USER_SPEECH_START':
        this.timeline.currentSpeaker = 'USER';
        break;
      case 'AI_SPEECH_START':
        this.timeline.currentSpeaker = 'AI';
        break;
      case 'USER_SPEECH_END':
      case 'AI_SPEECH_END':
      case 'AI_INTERRUPTED':
        this.timeline.currentSpeaker = null;
        break;
    }
  }

  /**
   * Manage memory usage with rolling buffer
   */
  private manageMemory(): void {
    if (this.timeline.events.length > this.config.maxEvents) {
      // Remove oldest events
      const eventsToRemove = this.timeline.events.length - this.config.maxEvents;
      this.timeline.events = this.timeline.events.slice(eventsToRemove);

      console.log(`[Timeline] Removed ${eventsToRemove} old events for memory management`);
    }
  }

  /**
   * Update statistics based on new event
   */
  private updateStatistics(event: TimelineEvent): void {
    const stats = this.timeline.statistics;

    // Calculate speaking durations from event pairs
    if (event.eventType === 'USER_SPEECH_END' || event.eventType === 'AI_SPEECH_END') {
      const speaker = event.eventType.startsWith('USER') ? 'USER' : 'AI';
      const startEventType = speaker === 'USER' ? 'USER_SPEECH_START' : 'AI_SPEECH_START';

      // Find corresponding start event
      const startEvent = [...this.timeline.events].reverse().find(e =>
        e.eventType === startEventType && e.timestamp < event.timestamp
      );

      if (startEvent) {
        const duration = (event.timestamp - startEvent.timestamp) / 1000; // Convert to seconds

        if (speaker === 'USER') {
          stats.userSpeakingTime += duration;
          stats.longestUserSpeech = Math.max(stats.longestUserSpeech, duration);
        } else {
          stats.aiSpeakingTime += duration;
          stats.longestAISpeech = Math.max(stats.longestAISpeech, duration);
        }
      }
    }

    // Count interruptions
    if (event.eventType === 'AI_INTERRUPTED') {
      stats.interruptionsCount++;
    }

    // Calculate total interview time and silence
    const totalTime = (Date.now() - this.timeline.interviewStartTime) / 1000;
    stats.totalSilenceTime = totalTime - stats.userSpeakingTime - stats.aiSpeakingTime;

    // Calculate average response time (simplified)
    if (event.eventType === 'USER_SPEECH_START') {
      const lastAIEnd = [...this.timeline.events].reverse().find(e => e.eventType === 'AI_SPEECH_END');
      if (lastAIEnd) {
        const responseTime = (event.timestamp - lastAIEnd.timestamp) / 1000;
        // Simple moving average
        stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
      }
    }
  }

  /**
   * Initialize empty statistics
   */
  private initializeStatistics(): SpeakerStatistics {
    return {
      userSpeakingTime: 0,
      aiSpeakingTime: 0,
      interruptionsCount: 0,
      totalSilenceTime: 0,
      averageResponseTime: 0,
      longestUserSpeech: 0,
      longestAISpeech: 0
    };
  }

  /**
   * Get current timeline data
   */
  getTimeline(): InterviewTimeline {
    return { ...this.timeline };
  }

  /**
   * Get timeline events for storage
   */
  getTimelineForStorage() {
    const duration = (Date.now() - this.timeline.interviewStartTime) / 1000;

    return {
      audio_timeline: {
        events: this.timeline.events,
        total_events: this.timeline.events.length,
        recording_duration: duration,
        created_at: new Date().toISOString()
      },
      transcript_synchronization: this.timeline.sttSynchronizations,
      speaker_statistics: this.timeline.statistics
    };
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    const eventSize = 200; // Estimated bytes per event
    const sttSize = 300; // Estimated bytes per STT sync

    return (this.timeline.events.length * eventSize) +
           (this.timeline.sttSynchronizations.length * sttSize);
  }

  /**
   * Reset timeline (for testing or restart)
   */
  reset(): void {
    this.timeline.events = [];
    this.timeline.sttSynchronizations = [];
    this.timeline.currentSpeaker = null;
    this.timeline.lastEventId = null;
    this.timeline.statistics = this.initializeStatistics();
    this.timeline.interviewStartTime = Date.now();
  }

  /**
   * Get current speaker
   */
  getCurrentSpeaker(): SpeakerType | null {
    return this.timeline.currentSpeaker;
  }

  /**
   * Check if timeline is active
   */
  isActive(): boolean {
    return this.timeline.events.length > 0;
  }
}