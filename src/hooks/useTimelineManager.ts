/**
 * React Hook for Timeline Management
 * Provides timeline functionality with React state integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimelineManager } from '@/utils/timelineManager';
import {
  TimelineState,
  TimelineEvent,
  STTSynchronization,
  TimelineEventType,
  TimelineConfig
} from '@/types/timeline';

interface UseTimelineManagerProps {
  sessionId: string;
  config?: Partial<TimelineConfig>;
  onTimelineUpdate?: (timeline: TimelineState) => void;
}

export const useTimelineManager = ({
  sessionId,
  config,
  onTimelineUpdate
}: UseTimelineManagerProps) => {
  const timelineManagerRef = useRef<TimelineManager | null>(null);
  const [timelineState, setTimelineState] = useState<TimelineState>(() => ({
    timeline: {
      sessionId,
      interviewStartTime: Date.now(),
      events: [],
      sttSynchronizations: [],
      currentSpeaker: null,
      lastEventId: null,
      statistics: {
        userSpeakingTime: 0,
        aiSpeakingTime: 0,
        interruptionsCount: 0,
        totalSilenceTime: 0,
        averageResponseTime: 0,
        longestUserSpeech: 0,
        longestAISpeech: 0
      }
    },
    config: {
      maxEvents: 1000,
      confidenceThreshold: 0.5,
      silenceTimeoutMs: 2000,
      compressionAgeMs: 300000,
      performanceMode: 'balanced',
      ...config
    },
    isActive: false,
    lastUpdate: Date.now(),
    memoryUsage: 0,
    processingLoad: 0
  }));

  // Initialize timeline manager
  useEffect(() => {
    timelineManagerRef.current = new TimelineManager(sessionId, config);

    setTimelineState(prev => ({
      ...prev,
      isActive: true,
      timeline: timelineManagerRef.current!.getTimeline()
    }));

    console.log(`[useTimelineManager] Initialized for session: ${sessionId}`);

    return () => {
      timelineManagerRef.current = null;
    };
  }, [sessionId]);

  // Update timeline state and notify listeners
  const updateTimelineState = useCallback(() => {
    if (!timelineManagerRef.current) return;

    const newState: TimelineState = {
      timeline: timelineManagerRef.current.getTimeline(),
      config: timelineState.config,
      isActive: timelineManagerRef.current.isActive(),
      lastUpdate: Date.now(),
      memoryUsage: timelineManagerRef.current.getMemoryUsage(),
      processingLoad: 0 // Could be calculated based on recent activity
    };

    setTimelineState(newState);
    onTimelineUpdate?.(newState);
  }, [timelineState.config, onTimelineUpdate]);

  /**
   * Add timeline event
   */
  const addEvent = useCallback((
    eventType: TimelineEventType,
    confidence: number = 1.0,
    metadata?: TimelineEvent['metadata']
  ): TimelineEvent | null => {
    if (!timelineManagerRef.current) {
      console.warn('[useTimelineManager] Timeline manager not initialized');
      return null;
    }

    try {
      const event = timelineManagerRef.current.addEvent(eventType, confidence, metadata);
      updateTimelineState();
      return event;
    } catch (error) {
      console.error('[useTimelineManager] Error adding event:', error);
      return null;
    }
  }, [updateTimelineState]);

  /**
   * Add STT synchronization
   */
  const addSTTSynchronization = useCallback((
    sttText: string,
    sttReceivedAt: number,
    confidence: number
  ): STTSynchronization | null => {
    if (!timelineManagerRef.current) {
      console.warn('[useTimelineManager] Timeline manager not initialized');
      return null;
    }

    try {
      const sync = timelineManagerRef.current.addSTTSynchronization(sttText, sttReceivedAt, confidence);
      updateTimelineState();
      return sync;
    } catch (error) {
      console.error('[useTimelineManager] Error adding STT sync:', error);
      return null;
    }
  }, [updateTimelineState]);

  /**
   * Track user speech start
   */
  const trackUserSpeechStart = useCallback((confidence: number = 1.0) => {
    return addEvent('USER_SPEECH_START', confidence, {
      audioLevel: confidence,
      duration: undefined
    });
  }, [addEvent]);

  /**
   * Track user speech end
   */
  const trackUserSpeechEnd = useCallback((confidence: number = 1.0, duration?: number) => {
    return addEvent('USER_SPEECH_END', confidence, {
      audioLevel: confidence,
      duration
    });
  }, [addEvent]);

  /**
   * Track AI speech start
   */
  const trackAISpeechStart = useCallback((aiMessage: string) => {
    return addEvent('AI_SPEECH_START', 1.0, {
      aiMessage,
      duration: undefined
    });
  }, [addEvent]);

  /**
   * Track AI speech end
   */
  const trackAISpeechEnd = useCallback((duration?: number) => {
    return addEvent('AI_SPEECH_END', 1.0, {
      duration
    });
  }, [addEvent]);

  /**
   * Track AI interruption
   */
  const trackAIInterruption = useCallback(() => {
    return addEvent('AI_INTERRUPTED', 1.0, {
      interruptedBy: 'USER_SPEECH_START'
    });
  }, [addEvent]);

  /**
   * Get timeline data for storage
   */
  const getTimelineForStorage = useCallback(() => {
    if (!timelineManagerRef.current) {
      console.warn('[useTimelineManager] Timeline manager not initialized');
      return null;
    }

    return timelineManagerRef.current.getTimelineForStorage();
  }, []);

  /**
   * Reset timeline
   */
  const resetTimeline = useCallback(() => {
    if (!timelineManagerRef.current) {
      console.warn('[useTimelineManager] Timeline manager not initialized');
      return;
    }

    timelineManagerRef.current.reset();
    updateTimelineState();
    console.log('[useTimelineManager] Timeline reset');
  }, [updateTimelineState]);

  /**
   * Get current speaker
   */
  const getCurrentSpeaker = useCallback(() => {
    return timelineManagerRef.current?.getCurrentSpeaker() || null;
  }, []);

  /**
   * Check if timeline is tracking
   */
  const isTracking = useCallback(() => {
    return timelineManagerRef.current?.isActive() || false;
  }, []);

  /**
   * Get memory usage
   */
  const getMemoryUsage = useCallback(() => {
    return timelineManagerRef.current?.getMemoryUsage() || 0;
  }, []);

  return {
    // State
    timelineState,

    // Event tracking functions
    addEvent,
    addSTTSynchronization,

    // Convenient tracking functions
    trackUserSpeechStart,
    trackUserSpeechEnd,
    trackAISpeechStart,
    trackAISpeechEnd,
    trackAIInterruption,

    // Utility functions
    getTimelineForStorage,
    resetTimeline,
    getCurrentSpeaker,
    isTracking,
    getMemoryUsage,

    // Direct access to timeline data
    events: timelineState.timeline.events,
    sttSynchronizations: timelineState.timeline.sttSynchronizations,
    statistics: timelineState.timeline.statistics,
    currentSpeaker: timelineState.timeline.currentSpeaker
  };
};