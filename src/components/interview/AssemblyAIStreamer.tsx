/**
 * AssemblyAI Real-time Streaming Speech-to-Text
 *
 * Key advantages over previous implementation:
 * - Immutable transcripts (no duplicate words!)
 * - Industry-leading accuracy (30% fewer errors)
 * - Real-time streaming with ~300ms latency
 * - Secure token-based authentication
 */

import { StreamingTranscriber } from 'assemblyai';

export interface StreamMetrics {
  noiseFloor: number;
  silenceThreshold: number;
  speechThreshold: number;
  isCalibrating: boolean;
  currentRms: number;
  silenceCountdown: number;
  lastCalibration: Date;
}

export default class AssemblyAIStreamer {
  private sessionId: string;
  private onTranscriptUpdate: (text: string, isFinal: boolean) => void;
  private onMetricsUpdate: (metrics: StreamMetrics) => void;
  private onConnectionOpen: () => void;
  private onConnectionError: (error: string) => void;
  private backendUrl: string;
  private audioDeviceId?: string;

  private isStreaming = false;
  private isMuted = false;
  private transcriber?: StreamingTranscriber;
  private audioContext?: AudioContext;
  private mediaStream?: MediaStream;
  private finalTranscriptTimer?: NodeJS.Timeout;
  private accumulatedTranscripts: string[] = [];

  constructor(
    sessionId: string,
    onTranscriptUpdate: (text: string, isFinal: boolean) => void,
    onMetricsUpdate: (metrics: StreamMetrics) => void,
    onConnectionOpen: () => void,
    onConnectionError: (error: string) => void,
    backendUrl: string,
    audioDeviceId?: string
  ) {
    this.sessionId = sessionId;
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onMetricsUpdate = onMetricsUpdate;
    this.onConnectionOpen = onConnectionOpen;
    this.onConnectionError = onConnectionError;
    this.backendUrl = backendUrl;
    this.audioDeviceId = audioDeviceId;
    console.log('[AssemblyAIStreamer] Initialized');
  }

  /**
   * Fetch temporary token from backend
   * Backend uses AssemblyAI SDK to generate a secure, expiring token
   */
  private async fetchTemporaryToken(): Promise<string> {
    try {
      console.log('[AssemblyAIStreamer] Requesting temporary token from backend...');

      const response = await fetch(`${this.backendUrl}/api/assemblyai-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token generation failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      console.log('[AssemblyAIStreamer] ✅ Received temporary token (expires in 8 minutes)');
      return data.token;
    } catch (error) {
      console.error('[AssemblyAIStreamer] ❌ Failed to fetch token:', error);
      throw new Error('Failed to authenticate with speech service');
    }
  }

  /**
   * Start streaming audio to AssemblyAI
   */
  public async startStreaming() {
    if (this.isStreaming) {
      console.warn('[AssemblyAIStreamer] Already streaming');
      return;
    }

    this.isStreaming = true;
    console.log('[AssemblyAIStreamer] Starting stream...');

    try {
      // 1. Get temporary token from backend
      const tempToken = await this.fetchTemporaryToken();

      // 2. Request microphone access
      console.log('[AssemblyAIStreamer] 🎤 Requesting microphone access...');
      const audioConstraint = this.audioDeviceId
        ? { deviceId: { exact: this.audioDeviceId } }
        : true;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint
      });

      // 3. Initialize AssemblyAI Streaming Transcriber
      console.log('[AssemblyAIStreamer] 🔌 Connecting to AssemblyAI...');

      this.transcriber = new StreamingTranscriber({
        token: tempToken, // Use temporary token (browser-safe)
        sampleRate: 16_000, // Required sample rate
        encoding: 'pcm_s16le',
        formatTurns: false,
        endOfTurnConfidenceThreshold: 0.9,
        minEndOfTurnSilenceWhenConfident: 1500,
        maxTurnSilence: 1500,
      });

      // 4. Set up event handlers BEFORE connecting

      // Handle transcript turns (incremental and final)
      // With formatTurns: false, we need to accumulate end_of_turn transcripts
      const FINALIZE_DELAY_MS = 2000;
      let timerStartTime: number | null = null;

      this.transcriber.on('turn', ({ transcript, end_of_turn }) => {
        const text = transcript.trim();
        if (!text) return;

        const now = Date.now();
        const timerAge = timerStartTime ? now - timerStartTime : null;
        console.log(`[AssemblyAIStreamer] [${now}] Turn received:`, {
          text,
          end_of_turn,
          timerActive: !!this.finalTranscriptTimer,
          timerAgeMs: timerAge,
          accumulated: this.accumulatedTranscripts.length
        });

        // Show partial transcripts as user speaks (for UI feedback)
        if (!end_of_turn) {
          // User is still speaking - reset timer if one exists
          if (this.finalTranscriptTimer) {
            console.log(`[AssemblyAIStreamer] [${now}] 🔄 Partial received after ${timerAge}ms - CANCELLING timer (user still speaking)`);
            clearTimeout(this.finalTranscriptTimer);
            this.finalTranscriptTimer = undefined;
            timerStartTime = null;
          }

          // Show current partials + accumulated text for context
          const displayText = this.accumulatedTranscripts.length > 0
            ? [...this.accumulatedTranscripts, text].join(' ')
            : text;
          this.onTranscriptUpdate(displayText, false);
          return;
        }

        // end_of_turn is true - accumulate this transcript
        this.accumulatedTranscripts.push(text);
        const accumulatedText = this.accumulatedTranscripts.join(' ');

        console.log(`[AssemblyAIStreamer] [${now}] Accumulated:`, this.accumulatedTranscripts);

        // Show accumulated text immediately
        this.onTranscriptUpdate(accumulatedText, false);

        // Clear any existing finalization timer (user still speaking)
        if (this.finalTranscriptTimer) {
          console.log(`[AssemblyAIStreamer] [${now}] Clearing existing timer (new end_of_turn received)`);
          clearTimeout(this.finalTranscriptTimer);
          this.finalTranscriptTimer = undefined;
        }

        // Start timer before sending to backend (allows for multi-sentence utterances)
        timerStartTime = now;
        console.log(`[AssemblyAIStreamer] [${now}] ⏱️  Starting ${FINALIZE_DELAY_MS}ms timer...`);

        this.finalTranscriptTimer = setTimeout(() => {
          const fireTime = Date.now();
          const finalText = this.accumulatedTranscripts.join(' ');
          console.log(`[AssemblyAIStreamer] [${fireTime}] ⏰ Timer fired after ${fireTime - timerStartTime!}ms`);
          console.log(`[AssemblyAIStreamer] [${fireTime}] ✅ Finalized:`, finalText);
          console.log(`[🎤 SENDING TO BACKEND] [${fireTime}] Full text:`, JSON.stringify(finalText));
          console.log(`[🎤 SENDING TO BACKEND] Text length: ${finalText.length} chars, Word count: ${finalText.split(' ').length} words`);
          // Send complete accumulated transcript to backend
          this.onTranscriptUpdate(finalText, true);
          // Clear accumulator for next utterance
          this.accumulatedTranscripts = [];
          this.finalTranscriptTimer = undefined;
          timerStartTime = null;
        }, FINALIZE_DELAY_MS);
      });

      // Handle connection open
      this.transcriber.on('open', ({ id, expires_at }) => {
        console.log('[AssemblyAIStreamer] ✅ Connected. Session ID:', id, 'Expires:', expires_at);
        this.onConnectionOpen();
      });

      // Handle errors
      this.transcriber.on('error', (error) => {
        console.error('[AssemblyAIStreamer] ❌ Error:', error);
        this.onConnectionError(error.message || 'Speech recognition error');
      });

      // Handle connection close
      this.transcriber.on('close', (code, reason) => {
        console.log(`[AssemblyAIStreamer] Connection closed. Code: ${code}, Reason: ${reason}`);
        if (code !== 1000) {
          this.onConnectionError(`Connection lost: ${reason || 'Unknown error'}`);
        }
      });

      // 5. Connect to AssemblyAI
      await this.transcriber.connect();
      console.log('[AssemblyAIStreamer] ✅ Connection established');

      // 6. Create AudioContext and start streaming audio
      console.log('[AssemblyAIStreamer] 🎵 Setting up audio processing...');
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      if (this.audioContext.state === 'suspended') {
        console.warn('[AssemblyAIStreamer] AudioContext suspended. Resuming...');
        await this.audioContext.resume();
      }

      // Create audio source from microphone stream
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create ScriptProcessorNode to capture audio data
      // Note: ScriptProcessorNode is deprecated but still widely used for real-time audio
      // AssemblyAI SDK may handle this internally in future versions
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate RMS (root mean square) for audio level monitoring
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Send metrics update with current audio level
        this.onMetricsUpdate({
          noiseFloor: 0.01,
          silenceThreshold: 0.02,
          speechThreshold: 0.05,
          isCalibrating: false,
          currentRms: rms,
          silenceCountdown: 0,
          lastCalibration: new Date()
        });

        if (!this.isMuted && this.transcriber) {
          // Convert Float32Array to Int16Array (PCM16)
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }

          // Stream audio to AssemblyAI
          this.transcriber.sendAudio(int16Data.buffer);
        }
      };

      // Connect audio pipeline
      source.connect(processor);
      processor.connect(this.audioContext.destination);

      console.log('[AssemblyAIStreamer] 🎙️ Audio streaming started');

    } catch (error) {
      console.error('[AssemblyAIStreamer] ❌ FATAL: Setup failed:', error);
      this.onConnectionError(
        error instanceof Error
          ? error.message
          : 'Failed to start speech recognition'
      );
      this.cleanup();
    }
  }

  /**
   * Mute/unmute audio streaming
   */
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    console.log(`[AssemblyAIStreamer] ${muted ? '🔇 Muted' : '🔊 Unmuted'}`);
  }

  /**
   * Stop streaming and cleanup resources
   */
  public async stopStreaming() {
    console.log('[AssemblyAIStreamer] Stopping stream...');
    await this.cleanup();
  }

  /**
   * Recalibrate audio (no-op for AssemblyAI - kept for interface compatibility)
   */
  public recalibrate() {
    console.log('[AssemblyAIStreamer] Recalibrate called (no-op for AssemblyAI)');
  }

  /**
   * Cleanup all resources
   */
  private async cleanup() {
    console.log('[AssemblyAIStreamer] Cleaning up resources...');
    this.isStreaming = false;

    // Clear any pending finalization timer
    if (this.finalTranscriptTimer) {
      clearTimeout(this.finalTranscriptTimer);
      this.finalTranscriptTimer = undefined;
    }

    // Close AssemblyAI connection
    if (this.transcriber) {
      try {
        await this.transcriber.close();
        console.log('[AssemblyAIStreamer] ✅ Transcriber closed');
      } catch (error) {
        console.error('[AssemblyAIStreamer] Error closing transcriber:', error);
      }
      this.transcriber = undefined;
    }

    // Stop microphone tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log('[AssemblyAIStreamer] 🎤 Microphone track stopped');
      });
      this.mediaStream = undefined;
    }

    // Close audio context
    if (this.audioContext) {
      try {
        await this.audioContext.close();
        console.log('[AssemblyAIStreamer] 🎵 AudioContext closed');
      } catch (error) {
        console.error('[AssemblyAIStreamer] Error closing AudioContext:', error);
      }
      this.audioContext = undefined;
    }

    console.log('[AssemblyAIStreamer] ✅ Cleanup complete');
  }
}
