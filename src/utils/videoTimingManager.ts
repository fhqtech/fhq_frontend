/**
 * Simple Video Timing Manager
 * Tracks video timing for conversation history without complex timeline system
 */

import { SpeakerState, InterruptionEvent, VideoTiming } from '@/types/videoTiming';

export class VideoTimingManager {
  private speakerState: SpeakerState;
  private interruptions: InterruptionEvent[] = [];

  constructor() {
    this.speakerState = {
      current_speaker: null,
      video_start_time: Date.now()
    };

    console.log('[VideoTiming] Initialized for interview');
  }

  /**
   * Get current video offset in seconds
   */
  private getVideoOffset(): number {
    return Math.floor((Date.now() - this.speakerState.video_start_time) / 1000);
  }

  /**
   * AI starts speaking - called when TTS begins
   */
  aiSpeakingStarted(message: string): void {
    const videoOffset = this.getVideoOffset();

    this.speakerState.current_speaker = 'AI';
    this.speakerState.ai_speaking_since = videoOffset;

    console.log(`[VideoTiming] AI started speaking at ${videoOffset}s: "${message.substring(0, 50)}..."`);
  }

  /**
   * AI stops speaking - called when TTS completes
   */
  aiSpeakingEnded(): VideoTiming | null {
    if (this.speakerState.current_speaker !== 'AI' || !this.speakerState.ai_speaking_since) {
      return null;
    }

    const videoOffset = this.getVideoOffset();
    const timing: VideoTiming = {
      video_start: this.speakerState.ai_speaking_since,
      video_end: videoOffset,
      was_interrupted: false
    };

    this.speakerState.current_speaker = null;
    this.speakerState.ai_speaking_since = undefined;

    console.log(`[VideoTiming] AI finished speaking: ${timing.video_start}s - ${timing.video_end}s`);
    return timing;
  }

  /**
   * User starts speaking - called when audio detection triggers
   */
  userSpeakingStarted(): boolean {
    const videoOffset = this.getVideoOffset();
    const wasInterruption = this.speakerState.current_speaker === 'AI';

    // Handle interruption
    if (wasInterruption && this.speakerState.ai_speaking_since) {
      console.log(`[VideoTiming] User interrupted AI at ${videoOffset}s`);

      // Record interruption but don't end AI timing yet (will be handled when AI actually stops)
      this.interruptions.push({
        interrupted_at: videoOffset,
        ai_message: 'AI was speaking' // Could be enhanced to include actual message
      });
    }

    this.speakerState.current_speaker = 'USER';
    this.speakerState.user_speaking_since = videoOffset;

    console.log(`[VideoTiming] User started speaking at ${videoOffset}s ${wasInterruption ? '(interruption)' : ''}`);
    return wasInterruption;
  }

  /**
   * User stops speaking - called when STT completes processing
   */
  userSpeakingEnded(): VideoTiming | null {
    if (this.speakerState.current_speaker !== 'USER' || !this.speakerState.user_speaking_since) {
      return null;
    }

    const videoOffset = this.getVideoOffset();

    // Check if this was from an interruption
    const wasInterruption = this.interruptions.some(int =>
      Math.abs(int.interrupted_at - this.speakerState.user_speaking_since!) <= 2 // Within 2 seconds
    );

    const timing: VideoTiming = {
      video_start: this.speakerState.user_speaking_since,
      video_end: videoOffset,
      was_interrupted: wasInterruption
    };

    this.speakerState.current_speaker = null;
    this.speakerState.user_speaking_since = undefined;

    console.log(`[VideoTiming] User finished speaking: ${timing.video_start}s - ${timing.video_end}s ${wasInterruption ? '(was interruption)' : ''}`);
    return timing;
  }

  /**
   * Handle AI being interrupted (called when user starts speaking while AI is talking)
   */
  aiWasInterrupted(): VideoTiming | null {
    if (this.speakerState.current_speaker !== 'AI' || !this.speakerState.ai_speaking_since) {
      return null;
    }

    const videoOffset = this.getVideoOffset();
    const timing: VideoTiming = {
      video_start: this.speakerState.ai_speaking_since,
      video_end: videoOffset,
      was_interrupted: true
    };

    // AI is no longer speaking due to interruption
    this.speakerState.ai_speaking_since = undefined;

    console.log(`[VideoTiming] AI was interrupted: ${timing.video_start}s - ${timing.video_end}s`);
    return timing;
  }

  /**
   * Get current speaker
   */
  getCurrentSpeaker(): 'AI' | 'USER' | null {
    return this.speakerState.current_speaker;
  }

  /**
   * Get interruption count for statistics
   */
  getInterruptionCount(): number {
    return this.interruptions.length;
  }

  /**
   * Reset for new interview
   */
  reset(): void {
    this.speakerState = {
      current_speaker: null,
      video_start_time: Date.now()
    };
    this.interruptions = [];
    console.log('[VideoTiming] Reset for new interview');
  }

  /**
   * Get simple statistics
   */
  getStatistics() {
    return {
      interruptions: this.interruptions.length,
      interview_duration: this.getVideoOffset()
    };
  }
}