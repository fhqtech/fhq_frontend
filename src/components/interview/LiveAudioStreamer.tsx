// Define StreamMetrics interface directly since useAudioMetrics doesn't exist
export interface StreamMetrics {
  noiseFloor: number;
  silenceThreshold: number;
  speechThreshold: number;
  isCalibrating: boolean;
  currentRms: number;
  silenceCountdown: number;
  lastCalibration: Date;
}

export default class LiveAudioStreamer {
  private sessionId: string;
  private config: any;
  private onTranscriptUpdate: (txt: string, ready: boolean) => void;
  private onMetricsUpdate: (m: StreamMetrics) => void;
  private onConnectionOpen: () => void;
  private onConnectionError: (error: string) => void;
  private wsUrl: string;
  private audioDeviceId?: string;

  private isStreaming = false;
  private isMuted = false;
  private audioContext?: AudioContext;
  private mediaStream?: MediaStream;
  private workletNode?: AudioWorkletNode;
  private ws?: WebSocket;
  private silenceTimer: number | null = null;
  private lastTranscript = "";
  private readonly SILENCE_IDLE_MS = 2000;

  constructor(
    sessionId: string,
    config: any,
    onTranscriptUpdate: (txt: string, ready: boolean) => void,
    onMetricsUpdate: (m: StreamMetrics) => void,
    onConnectionOpen: () => void,
    onConnectionError: (error: string) => void,
    wsUrl: string,
    audioDeviceId?: string
  ) {
    this.sessionId = sessionId;
    this.config = config;
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onMetricsUpdate = onMetricsUpdate;
    this.onConnectionOpen = onConnectionOpen;
    this.onConnectionError = onConnectionError;
    this.wsUrl = wsUrl;
    this.audioDeviceId = audioDeviceId;
    console.log('[LiveAudioStreamer] Initialized with config:', this.config);
  }

  private cleanTranscription(text: string): string {
    return text.replace(/[^a-zA-Z0-9\s.,'-?]/g, '').trim();
  }

  private startSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = window.setTimeout(() => {
      this.silenceTimer = null;
      this.finishUtterance();
    }, this.SILENCE_IDLE_MS);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private finishUtterance() {
    const cleanedTxt = this.cleanTranscription(this.lastTranscript);
    if (cleanedTxt) {
      this.onTranscriptUpdate(cleanedTxt, true);
    }
    this.lastTranscript = "";
  }

  public async startStreaming() {
    if (this.isStreaming) {
      console.warn("[LiveAudioStreamer] startStreaming called while already streaming.");
      return;
    }
    this.isStreaming = true;
    console.log("[LiveAudioStreamer] Starting stream...");

    // --- DEFINITIVE STARTUP SEQUENCE ---
    // 1. Prepare the entire audio pipeline BEFORE connecting. This prevents race conditions.
    try {
      console.log("[LiveAudioStreamer] 🎤 Requesting microphone access...");
      const audioConstraint = this.audioDeviceId ? { deviceId: { exact: this.audioDeviceId } } : true;
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });

      console.log(`[LiveAudioStreamer] 🎵 Creating AudioContext with sample rate: ${this.config.sample_rate}`);
      this.audioContext = new AudioContext({ sampleRate: this.config.sample_rate });

      if (this.audioContext.state === 'suspended') {
        console.warn('[LiveAudioStreamer] AudioContext is suspended. Resuming...');
        await this.audioContext.resume();
        console.log('[LiveAudioStreamer] AudioContext resumed.');
      }

      console.log("[LiveAudioStreamer] 🔧 Loading audio worklet...");
      await this.audioContext.audioWorklet.addModule("/recorder-worklet.js");
      console.log("[LiveAudioStreamer] ✅ Audio worklet loaded.");

      this.workletNode = new AudioWorkletNode(this.audioContext, "recorder-processor");
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.workletNode).connect(this.audioContext.destination);
    } catch (err) {
      console.error("[LiveAudioStreamer] ❌ FATAL: Audio setup failed:", err);
      this.onConnectionError("Failed to set up microphone or audio processor.");
      this.cleanup();
      return;
    }

    // 2. Now that audio is ready, connect to the WebSocket.
    try {
      const url = new URL(this.wsUrl);
      // Use path parameter for session ID (matching aestim implementation)
      const fullWsUrl = url + '/' + this.sessionId.toString();
      console.log(`[LiveAudioStreamer] 🔌 Connecting to WebSocket: ${fullWsUrl}`);
      this.ws = new WebSocket(fullWsUrl);
    } catch (error) {
      console.error("[LiveAudioStreamer] ❌ FATAL: Failed to create WebSocket.", error);
      this.onConnectionError("Failed to initialize connection.");
      this.cleanup();
      return;
    }

    this.ws.binaryType = "arraybuffer";

    // 3. Define WebSocket event handlers.
    this.ws.onopen = () => {
      console.log("[LiveAudioStreamer] ✅ WebSocket connection opened.");
      this.onConnectionOpen();

      if (this.ws?.readyState === WebSocket.OPEN) {
        const configMessage = { type: "config", payload: this.config };
        const messageString = JSON.stringify(configMessage);
        console.log(`[LiveAudioStreamer] ✉️ Sending configuration message: ${messageString}`);
        this.ws.send(messageString);
      } else {
        console.error("[LiveAudioStreamer] ❌ FATAL: WebSocket is not open after onopen event.");
      }
    };

    this.workletNode.port.onmessage = (ev: MessageEvent) => {
      if (ev.data.type === "metrics") {
        this.onMetricsUpdate(ev.data);
      } else if (ev.data instanceof Float32Array && this.ws?.readyState === WebSocket.OPEN && !this.isMuted) {
        const pcm = ev.data;
        const int16 = Int16Array.from(pcm, v => Math.max(-1, Math.min(1, v)) * 32767);
        this.ws.send(int16.buffer);
      }
    };

    this.ws.onmessage = (ev) => {
      try {
        // Handle both JSON and plain text responses
        let transcript: string;
        if (typeof ev.data === 'string') {
          try {
            const parsed = JSON.parse(ev.data);
            transcript = parsed.transcript || ev.data;
          } catch {
            transcript = ev.data;
          }
        } else {
          transcript = String(ev.data);
        }
        
        this.lastTranscript = transcript.trim();
        if (this.lastTranscript) {
          this.onTranscriptUpdate(this.lastTranscript, false);
          this.startSilenceTimer();
        }
      } catch (error) {
        console.error('[LiveAudioStreamer] Error processing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[LiveAudioStreamer] WebSocket closed. Code: ${event.code}, Reason: "${event.reason}"`);
      if (!event.wasClean && event.code !== 1000) {
        this.onConnectionError(`Connection lost: ${event.reason || 'Unknown error'}`);
      }
      this.cleanup();
    };

    this.ws.onerror = (err) => {
      console.error("[LiveAudioStreamer] WebSocket error:", err);
      this.onConnectionError("WebSocket connection failed.");
      this.cleanup();
    };
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public async stopStreaming() {
    this.cleanup();
  }

  public recalibrate() {
    this.workletNode?.port.postMessage({ command: 'recalibrate' });
  }

  private cleanup() {
    console.log("[LiveAudioStreamer] Cleaning up resources...");
    this.isStreaming = false;
    this.clearSilenceTimer();
    this.ws?.close();
    this.workletNode?.port.postMessage({ command: 'stop' });
    this.workletNode?.disconnect();
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
  }
}