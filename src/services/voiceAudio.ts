/**
 * Audio capture + playback helpers for the v2 voice client.
 *
 * Capture:
 *   - Mic via getUserMedia
 *   - Web Audio ScriptProcessor (or AudioWorklet where supported) down-samples
 *     to 16kHz mono and emits Int16Array PCM frames every ~100ms.
 *
 * Playback:
 *   - PCM s16le 16kHz mono chunks come in from the backend; we wrap each one
 *     in an AudioBuffer scheduled back-to-back so playback is gapless.
 */

const TARGET_SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 1600; // 100ms of 16kHz mono

export interface CaptureHandle {
  stop: () => Promise<void>;
  /** Returns true while frames are being emitted. */
  isActive: () => boolean;
  /**
   * T1b: returns a 0-1 normalised peak amplitude from the most recent
   * analyser frame. Lets the UI render a "we hear you" indicator and
   * warn the candidate within seconds if their mic is muted/broken
   * (instead of suffering 2 minutes of agent nudges + force-wrap).
   */
  getLevel: () => number;
}

export interface CaptureOptions {
  onFrame: (pcm: ArrayBuffer) => void;
  onError?: (err: Error) => void;
}

/** Classified mic-permission failure. */
export type MicErrorKind = "denied" | "no_device" | "in_use" | "insecure" | "unknown";

export interface MicError {
  kind: MicErrorKind;
  message: string;
}

/** Translate a getUserMedia rejection into something the UI can act on. */
export function classifyMicError(err: unknown): MicError {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? "";
  const message = e?.message ?? String(err);
  if (name === "NotAllowedError" || name === "SecurityError" || /permission/i.test(message)) {
    return { kind: "denied", message };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { kind: "no_device", message };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return { kind: "in_use", message };
  }
  if (name === "TypeError" && /secure context/i.test(message)) {
    return { kind: "insecure", message };
  }
  return { kind: "unknown", message };
}

/**
 * Start capturing mic audio. Returns a handle whose stop() releases the
 * mic. The browser will prompt for permission on first call.
 */
export async function startMicCapture(opts: CaptureOptions): Promise<CaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  // T1b: AnalyserNode in parallel with the processor so we can sample
  // peak amplitude without interfering with the PCM frame pipeline.
  // fftSize=256 → 128 frequency bins → cheap. Time-domain data lets us
  // compute peak amplitude per call.
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.4;
  source.connect(analyser);
  const analyserBuffer = new Uint8Array(analyser.fftSize);

  // We use ScriptProcessorNode (deprecated but universally available). For
  // production hardening, swap to AudioWorklet — same shape, more code.
  const bufferSize = 4096; // ~93ms at native rate; emit on every callback
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  const sourceRate = audioContext.sampleRate;
  const downsampleRatio = sourceRate / TARGET_SAMPLE_RATE;

  let isActive = true;
  let pending: Float32Array = new Float32Array(0);

  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    if (!isActive) return;
    const input = ev.inputBuffer.getChannelData(0);
    const combined = new Float32Array(pending.length + input.length);
    combined.set(pending);
    combined.set(input, pending.length);

    const downsampledLen = Math.floor(combined.length / downsampleRatio);
    if (downsampledLen <= 0) {
      pending = combined;
      return;
    }
    const downsampled = new Int16Array(downsampledLen);
    for (let i = 0; i < downsampledLen; i++) {
      const idx = Math.floor(i * downsampleRatio);
      const sample = Math.max(-1, Math.min(1, combined[idx] ?? 0));
      downsampled[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // Save the unconsumed tail for the next callback so we don't drop samples
    // at the boundary.
    const consumed = Math.floor(downsampledLen * downsampleRatio);
    pending = combined.slice(consumed);

    // Slice into FRAME_SAMPLES chunks. Smaller frames help AssemblyAI lock
    // partials faster; larger frames waste fewer WS messages.
    let offset = 0;
    while (downsampled.length - offset >= FRAME_SAMPLES) {
      const frame = downsampled.slice(offset, offset + FRAME_SAMPLES);
      opts.onFrame(frame.buffer);
      offset += FRAME_SAMPLES;
    }
    if (offset < downsampled.length) {
      // Send the partial tail too — keeps latency low.
      const tail = downsampled.slice(offset);
      opts.onFrame(tail.buffer);
    }
  };

  source.connect(processor);
  // Connecting to destination is required to keep the graph alive on some
  // browsers, but we gain it to zero so nothing actually plays.
  const muted = audioContext.createGain();
  muted.gain.value = 0;
  processor.connect(muted);
  muted.connect(audioContext.destination);

  return {
    isActive: () => isActive,
    /**
     * T1b: returns peak amplitude in [0, 1] from the most recent
     * analyser snapshot. Reads the time-domain buffer (Uint8, centred
     * at 128) and returns the max deviation normalised to 0-1.
     */
    getLevel: () => {
      if (!isActive) return 0;
      try {
        analyser.getByteTimeDomainData(analyserBuffer);
      } catch {
        return 0;
      }
      let peak = 0;
      for (let i = 0; i < analyserBuffer.length; i++) {
        const deviation = Math.abs(analyserBuffer[i] - 128);
        if (deviation > peak) peak = deviation;
      }
      return Math.min(1, peak / 128);
    },
    stop: async () => {
      isActive = false;
      try {
        processor.disconnect();
        source.disconnect();
        analyser.disconnect();
        muted.disconnect();
      } catch {
        /* noop */
      }
      stream.getTracks().forEach((t) => t.stop());
      try {
        await audioContext.close();
      } catch {
        /* noop */
      }
    },
  };
}

/**
 * Gapless playback queue for PCM s16le 16kHz audio chunks streamed from the
 * server. Maintains a single scheduling timeline so consecutive chunks play
 * without gaps.
 */
export class PcmPlayer {
  private audioContext: AudioContext;
  private nextStartTime = 0;
  private active = true;

  constructor(sampleRate = TARGET_SAMPLE_RATE) {
    this.audioContext = new AudioContext({ sampleRate });
  }

  /** Append a PCM s16le mono chunk to the playback queue. */
  enqueue(pcm: ArrayBuffer): void {
    if (!this.active || pcm.byteLength === 0) return;

    // Belt-and-braces: if the context got suspended (e.g. tab backgrounded
    // or browser policy reset), resume it. The page-level gate ensures the
    // initial state is 'running', but this handles edge cases.
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }

    const int16 = new Int16Array(pcm);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000;
    }
    const buffer = this.audioContext.createBuffer(1, float32.length, TARGET_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startAt = Math.max(now, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;
  }

  /** Drop everything in the queue (barge-in or interrupt). */
  flush(): void {
    // We can't cancel already-scheduled BufferSource nodes individually, so
    // we reset the schedule time. New chunks will queue from "now" again.
    this.nextStartTime = this.audioContext.currentTime;
  }

  async close(): Promise<void> {
    this.active = false;
    try {
      await this.audioContext.close();
    } catch {
      /* noop */
    }
  }
}
