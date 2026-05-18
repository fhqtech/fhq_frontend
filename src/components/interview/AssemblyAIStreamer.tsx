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

// Reconnect schedule: 1s, 2s, 5s. Three attempts is plenty for a transient
// network blip — beyond that the candidate's connection is likely truly
// broken and we should surface a real error rather than retry forever.
const RECONNECT_DELAYS_MS = [1000, 2000, 5000];

export default class AssemblyAIStreamer {
  private sessionId: string;
  private onTranscriptUpdate: (text: string, isFinal: boolean) => void;
  private onMetricsUpdate: (metrics: StreamMetrics) => void;
  private onConnectionOpen: () => void;
  private onConnectionError: (error: string) => void;
  private onReconnecting?: (attempt: number, max: number) => void;
  private onReconnected?: () => void;
  private backendUrl: string;
  private audioDeviceId?: string;
  // C1: invitation token is now required by /api/assemblyai-token.
  private candidateToken?: string;

  private isStreaming = false;
  private isMuted = false;
  private transcriber?: StreamingTranscriber;
  private audioContext?: AudioContext;
  private mediaStream?: MediaStream;
  private finalTranscriptTimer?: NodeJS.Timeout;
  private accumulatedTranscripts: string[] = [];
  // Reconnect state: incremented each attempt, reset on successful open.
  // We retain `accumulatedTranscripts` across reconnects so a mid-turn
  // utterance isn't lost when the WebSocket flaps.
  private reconnectAttempt = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private isReconnecting = false;

  constructor(
    sessionId: string,
    onTranscriptUpdate: (text: string, isFinal: boolean) => void,
    onMetricsUpdate: (metrics: StreamMetrics) => void,
    onConnectionOpen: () => void,
    onConnectionError: (error: string) => void,
    backendUrl: string,
    audioDeviceId?: string,
    candidateToken?: string,
    onReconnecting?: (attempt: number, max: number) => void,
    onReconnected?: () => void,
  ) {
    this.sessionId = sessionId;
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onMetricsUpdate = onMetricsUpdate;
    this.onConnectionOpen = onConnectionOpen;
    this.onConnectionError = onConnectionError;
    this.backendUrl = backendUrl;
    this.audioDeviceId = audioDeviceId;
    this.candidateToken = candidateToken;
    this.onReconnecting = onReconnecting;
    this.onReconnected = onReconnected;
  }

  /**
   * Fetch temporary token from backend
   * Backend uses AssemblyAI SDK to generate a secure, expiring token
   */
  private async fetchTemporaryToken(): Promise<string> {
    try {
      // Demo mode: marketing demos pass candidateToken='demo' to hit the
      // public rate-limited /api/demo-tokens endpoint instead of the
      // gated /api/assemblyai-token. Keeps the landing-page preview alive
      // without leaking the perm key in the bundle.
      if (this.candidateToken === 'demo') {
        const demoResp = await fetch(`${this.backendUrl}/api/demo-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!demoResp.ok) {
          throw new Error(`Demo token fetch failed: ${demoResp.status}`);
        }
        const demoData = await demoResp.json();
        return demoData.assemblyai_token;
      }

      if (!this.candidateToken) {
        throw new Error('Missing candidate token');
      }

      const response = await fetch(`${this.backendUrl}/api/assemblyai-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidate_token: this.candidateToken }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token generation failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      if (import.meta.env.DEV) console.error('[AssemblyAIStreamer] ❌ Failed to fetch token:', error);
      throw new Error('Failed to authenticate with speech service');
    }
  }

  /**
   * Start streaming audio to AssemblyAI
   */
  public async startStreaming() {
    if (this.isStreaming) {
      return;
    }

    this.isStreaming = true;

    try {
      // 1. Get temporary token from backend
      const tempToken = await this.fetchTemporaryToken();

      // 2. Request microphone access
      const audioConstraint = this.audioDeviceId
        ? { deviceId: { exact: this.audioDeviceId } }
        : true;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint
      });

      // 3. Initialize AssemblyAI Streaming Transcriber

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
      // F2: dropped from 2000ms → 800ms. AssemblyAI v3 streaming end_of_turn
      // events are reliable enough that 800ms still tolerates a deliberate
      // mid-thought pause without cutting slow speakers off, and saves
      // ~1.2s on every turn round-trip. Major UX upgrade for interviews.
      const FINALIZE_DELAY_MS = 800;
      let timerStartTime: number | null = null;

      this.transcriber.on('turn', ({ transcript, end_of_turn }) => {
        const text = transcript.trim();
        if (!text) return;

        const now = Date.now();
        const timerAge = timerStartTime ? now - timerStartTime : null;

        // Show partial transcripts as user speaks (for UI feedback)
        if (!end_of_turn) {
          // User is still speaking - reset timer if one exists
          if (this.finalTranscriptTimer) {
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


        // Show accumulated text immediately
        this.onTranscriptUpdate(accumulatedText, false);

        // Clear any existing finalization timer (user still speaking)
        if (this.finalTranscriptTimer) {
          clearTimeout(this.finalTranscriptTimer);
          this.finalTranscriptTimer = undefined;
        }

        // Start timer before sending to backend (allows for multi-sentence utterances)
        timerStartTime = now;

        this.finalTranscriptTimer = setTimeout(() => {
          const fireTime = Date.now();
          const finalText = this.accumulatedTranscripts.join(' ');
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
        if (this.isReconnecting) {
          this.isReconnecting = false;
          this.reconnectAttempt = 0;
          if (import.meta.env.DEV) console.log('[AssemblyAIStreamer] ✅ Reconnected');
          this.onReconnected?.();
        } else {
          this.onConnectionOpen();
        }
      });

      // Handle errors — don't tear down here; let `close` decide whether to
      // reconnect. AssemblyAI emits both error + close on most failures.
      this.transcriber.on('error', (error) => {
        if (import.meta.env.DEV) console.error('[AssemblyAIStreamer] ❌ Error:', error);
      });

      // Handle connection close. Code 1000 = clean close (we asked).
      // Anything else is unexpected — attempt up to 3 reconnects before
      // surfacing a hard error to the candidate.
      this.transcriber.on('close', (code, reason) => {
        if (code === 1000 || !this.isStreaming) {
          // Clean close, or we already stopped — don't reconnect.
          return;
        }
        if (this.reconnectAttempt >= RECONNECT_DELAYS_MS.length) {
          this.onConnectionError(
            `Speech recognition lost after ${RECONNECT_DELAYS_MS.length} retries: ${reason || 'connection closed'}`
          );
          return;
        }
        this._scheduleReconnect(reason || `code=${code}`);
      });

      // 5. Connect to AssemblyAI
      await this.transcriber.connect();

      // 6. Create AudioContext and start streaming audio
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      if (this.audioContext.state === 'suspended') {
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


    } catch (error) {
      if (import.meta.env.DEV) console.error('[AssemblyAIStreamer] ❌ FATAL: Setup failed:', error);
      this.onConnectionError(
        error instanceof Error
          ? error.message
          : 'Failed to start speech recognition'
      );
      this.cleanup();
    }
  }

  /**
   * Schedule a reconnect attempt with exponential backoff. Keeps the
   * mediaStream + audioContext alive so audio capture continues; only
   * the transcriber WebSocket is rebuilt. accumulatedTranscripts are
   * intentionally NOT cleared — a mid-turn utterance survives the flap.
   */
  private _scheduleReconnect(reason: string) {
    const delay = RECONNECT_DELAYS_MS[this.reconnectAttempt];
    this.reconnectAttempt += 1;
    this.isReconnecting = true;
    if (import.meta.env.DEV) {
      console.warn(
        `[AssemblyAIStreamer] 🔄 Reconnect ${this.reconnectAttempt}/${RECONNECT_DELAYS_MS.length} ` +
          `in ${delay}ms (reason: ${reason})`
      );
    }
    this.onReconnecting?.(this.reconnectAttempt, RECONNECT_DELAYS_MS.length);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this._reconnectTranscriber();
    }, delay);
  }

  /**
   * Rebuild the transcriber + reconnect WebSocket. Audio capture (mic +
   * AudioContext) keeps running; the onaudioprocess handler reads
   * `this.transcriber` lazily so it picks up the new socket the moment
   * `open` fires.
   */
  private async _reconnectTranscriber() {
    if (!this.isStreaming) return;
    try {
      // Tear down only the old transcriber.
      if (this.transcriber) {
        try { await this.transcriber.close(); } catch { /* ignore */ }
        this.transcriber = undefined;
      }

      const tempToken = await this.fetchTemporaryToken();
      this.transcriber = new StreamingTranscriber({
        token: tempToken,
        sampleRate: 16_000,
        encoding: 'pcm_s16le',
        formatTurns: false,
        endOfTurnConfidenceThreshold: 0.9,
        minEndOfTurnSilenceWhenConfident: 1500,
        maxTurnSilence: 1500,
      });

      // Reattach handlers — closures here capture `this`, so transcript
      // updates / errors / close events route through the same callbacks.
      this.transcriber.on('turn', ({ transcript, end_of_turn }) => {
        const text = transcript.trim();
        if (!text) return;
        if (!end_of_turn) {
          const displayText = this.accumulatedTranscripts.length > 0
            ? [...this.accumulatedTranscripts, text].join(' ')
            : text;
          this.onTranscriptUpdate(displayText, false);
          return;
        }
        this.accumulatedTranscripts.push(text);
        this.onTranscriptUpdate(this.accumulatedTranscripts.join(' '), false);
        if (this.finalTranscriptTimer) clearTimeout(this.finalTranscriptTimer);
        this.finalTranscriptTimer = setTimeout(() => {
          this.onTranscriptUpdate(this.accumulatedTranscripts.join(' '), true);
          this.accumulatedTranscripts = [];
          this.finalTranscriptTimer = undefined;
        }, 800);
      });
      this.transcriber.on('open', () => {
        if (this.isReconnecting) {
          this.isReconnecting = false;
          this.reconnectAttempt = 0;
          if (import.meta.env.DEV) console.log('[AssemblyAIStreamer] ✅ Reconnected');
          this.onReconnected?.();
        }
      });
      this.transcriber.on('error', (error) => {
        if (import.meta.env.DEV) console.error('[AssemblyAIStreamer] ❌ Reconnect error:', error);
      });
      this.transcriber.on('close', (code, reason) => {
        if (code === 1000 || !this.isStreaming) return;
        if (this.reconnectAttempt >= RECONNECT_DELAYS_MS.length) {
          this.onConnectionError(
            `Speech recognition lost after ${RECONNECT_DELAYS_MS.length} retries: ${reason || 'connection closed'}`
          );
          return;
        }
        this._scheduleReconnect(reason || `code=${code}`);
      });

      await this.transcriber.connect();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AssemblyAIStreamer] Reconnect attempt failed:', error);
      }
      if (this.reconnectAttempt >= RECONNECT_DELAYS_MS.length) {
        this.onConnectionError(
          error instanceof Error ? error.message : 'Failed to reconnect speech recognition'
        );
      } else {
        this._scheduleReconnect('reconnect-exception');
      }
    }
  }

  /**
   * Mute/unmute audio streaming
   */
  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  /**
   * Stop streaming and cleanup resources
   */
  public async stopStreaming() {
    await this.cleanup();
  }

  /**
   * Recalibrate audio (no-op for AssemblyAI - kept for interface compatibility)
   */
  public recalibrate() {
  }

  /**
   * Cleanup all resources
   */
  private async cleanup() {
    this.isStreaming = false;
    this.isReconnecting = false;

    // Clear any pending finalization timer
    if (this.finalTranscriptTimer) {
      clearTimeout(this.finalTranscriptTimer);
      this.finalTranscriptTimer = undefined;
    }
    // Cancel any scheduled reconnect so we don't reopen a socket we just
    // explicitly stopped.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    // Close AssemblyAI connection
    if (this.transcriber) {
      try {
        await this.transcriber.close();
      } catch (error) {
        if (import.meta.env.DEV) console.error('[AssemblyAIStreamer] Error closing transcriber:', error);
      }
      this.transcriber = undefined;
    }

    // Stop microphone tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = undefined;
    }

    // Close audio context
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (error) {
        if (import.meta.env.DEV) console.error('[AssemblyAIStreamer] Error closing AudioContext:', error);
      }
      this.audioContext = undefined;
    }

  }
}
