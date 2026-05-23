/**
 * v2 voice gateway client.
 *
 * One WebSocket per interview session. The backend is the single source
 * of truth for turn-taking: this client just streams mic PCM up, plays
 * audio chunks down, and renders state events.
 *
 * No AssemblyAI direct connect, no Cartesia direct connect, no SSE.
 * Everything goes through `/api/voice/ws/{sessionId}?token=...`.
 */

export type VoiceState =
  | "IDLE"
  | "GREETING"
  | "PROBING"
  | "WRAPPING"
  | "ENDED";

export type ClientStatus =
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export interface ServerMessage {
  type: string;
  state?: VoiceState;
  text?: string;
  data?: string;
  reason?: string;
  error?: string;
  is_final?: boolean;
  // S1.4: payload of the agent_thinking event (true = LLM dispatch in
  // flight, false = LLM dispatch completed).
  value?: boolean;
}

export interface VoiceClientEvents {
  /** Called once the WS handshake completes. */
  onOpen?: () => void;
  /** Called when the connection closes for any reason. */
  onClose?: (reason: string) => void;
  /** Called on hard errors that should surface to the user. */
  onError?: (error: string) => void;
  /** Lifecycle state transitions from the server FSM. */
  onStateChange?: (state: VoiceState) => void;
  /** Live captions of what the agent is currently speaking. */
  onAgentTextPartial?: (text: string) => void;
  /** Server is about to send audio chunks for the next agent turn. */
  onAgentTurnStart?: () => void;
  /** Server finished an agent turn; mic capture should resume. */
  onAgentTurnEnd?: () => void;
  /** Raw PCM s16le 16kHz mono audio bytes from Cartesia. */
  onAgentAudioChunk?: (pcm: ArrayBuffer) => void;
  /** Echo of candidate STT for UI feedback. */
  onCandidateTurnPartial?: (text: string, isFinal: boolean) => void;
  /** Finalised candidate turn (after grace + cheat check). */
  onCandidateTurnFinal?: (text: string) => void;
  /** Server cancelled TTS because it detected the user speaking. */
  onBargeIn?: () => void;
  /** Terminal event — interview is over. */
  onInterviewEnded?: (reason?: string) => void;
  /** Heartbeat: the server is still listening to the candidate; grace
   * timer has `grace_remaining_ms` left. 0 means no buffer pending. */
  onListening?: (graceRemainingMs: number) => void;
  /** Server acknowledged a hold (Take your time / I'm done) toggle. */
  onHold?: (active: boolean) => void;
  /** S1.4: backend is invoking the probing LLM (true) or has finished
   * (false). Used to render a subtle "Interviewer is thinking…" line. */
  onAgentThinking?: (thinking: boolean) => void;
}

export interface VoiceClientConfig {
  /** Absolute or relative URL of the v2 voice endpoint base.
   * Default uses VITE_API_URL + "/api/voice/ws". */
  apiBase?: string;
  sessionId: string;
  /** Candidate invitation token (same one used in v1 token-auth flow). */
  candidateToken: string;
  events: VoiceClientEvents;
}

/**
 * Inferred WS URL from a base URL.
 * - http://host:port/api/voice/ws  -> ws://host:port/api/voice/ws
 * - https://host/api/voice/ws      -> wss://host/api/voice/ws
 * - /api/voice/ws (relative)       -> ws[s]://window.location.host/api/voice/ws
 */
function buildWebSocketUrl(base: string, sessionId: string, token: string): string {
  let absolute = base;
  if (base.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    absolute = `${proto}//${window.location.host}${base}`;
  } else {
    absolute = base
      .replace(/^http:\/\//, "ws://")
      .replace(/^https:\/\//, "wss://");
  }
  const sep = absolute.endsWith("/") ? "" : "/";
  return `${absolute}${sep}${encodeURIComponent(sessionId)}?token=${encodeURIComponent(
    token,
  )}`;
}

export class VoiceWebSocketClient {
  private ws: WebSocket | null = null;
  private status: ClientStatus = "closed";
  private closeRequested = false;
  private readonly url: string;
  private readonly events: VoiceClientEvents;
  private outgoingBufferedBytes = 0;

  constructor(config: VoiceClientConfig) {
    const env = (import.meta as any).env ?? {};
    const apiBase = env.VITE_VOICE_WS_BASE ?? env.VITE_API_BASE_URL ?? env.VITE_API_URL ?? "";
    const base = config.apiBase ?? `${apiBase}/api/voice/ws`;
    this.url = buildWebSocketUrl(base, config.sessionId, config.candidateToken);
    this.events = config.events;
  }

  connect(): void {
    if (this.ws) return;
    this.status = "connecting";
    this.closeRequested = false;
    this.ws = new WebSocket(this.url);
    // Server sends raw PCM as binary frames and JSON as text frames.
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.status = "connected";
      this.send({ type: "client_ready" });
      this.events.onOpen?.();
    };

    this.ws.onclose = (event) => {
      this.status = "closed";
      this.ws = null;
      const reason = event.reason || `code=${event.code}`;
      this.events.onClose?.(reason);
    };

    this.ws.onerror = () => {
      this.status = "error";
      this.events.onError?.("websocket_error");
    };

    this.ws.onmessage = (event) => this.handleMessage(event);
  }

  close(): void {
    this.closeRequested = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close();
      } catch {
        /* noop */
      }
    }
    this.ws = null;
    this.status = "closed";
  }

  sendAudio(pcm: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // Base64-encode and send as JSON for parity with the server's typed
    // message contract. Binary frames are reserved for incoming agent audio.
    const data = arrayBufferToBase64(pcm);
    this.send({ type: "audio_chunk", data });
    this.outgoingBufferedBytes += pcm.byteLength;
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.send({ type: "text_input", text });
  }

  ping(): void {
    this.send({ type: "ping" });
  }

  sendHold(active: boolean): void {
    this.send({ type: "hold", on: active });
  }

  getStatus(): ClientStatus {
    return this.status;
  }

  /* ----- internals ----- */

  private send(payload: Record<string, unknown>): void {
    try {
      this.ws?.send(JSON.stringify(payload));
    } catch (err) {
      this.events.onError?.(`send_failed: ${(err as Error).message}`);
    }
  }

  private handleMessage(event: MessageEvent): void {
    // Binary frames: raw agent audio chunks (PCM s16le 16kHz).
    if (event.data instanceof ArrayBuffer) {
      this.events.onAgentAudioChunk?.(event.data);
      return;
    }

    // Text frames: JSON control messages.
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data as string) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "state_change":
        if (msg.state) this.events.onStateChange?.(msg.state);
        break;
      case "agent_turn_start":
        this.events.onAgentTurnStart?.();
        break;
      case "agent_turn_end":
        this.events.onAgentTurnEnd?.();
        break;
      case "agent_text_partial":
        if (msg.text) this.events.onAgentTextPartial?.(msg.text);
        break;
      case "agent_audio_chunk":
        // Some browsers / proxies may rewrite binary to base64; honour both.
        if (msg.data) {
          const buf = base64ToArrayBuffer(msg.data);
          this.events.onAgentAudioChunk?.(buf);
        }
        break;
      case "candidate_turn_partial":
        if (msg.text !== undefined)
          this.events.onCandidateTurnPartial?.(msg.text, !!msg.is_final);
        break;
      case "candidate_turn_final":
        if (msg.text) this.events.onCandidateTurnFinal?.(msg.text);
        break;
      case "barge_in_acknowledged":
        this.events.onBargeIn?.();
        break;
      case "listening":
        this.events.onListening?.(
          typeof (msg as any).grace_remaining_ms === "number"
            ? (msg as any).grace_remaining_ms
            : 0,
        );
        break;
      case "hold_state":
        this.events.onHold?.(!!(msg as any).active);
        break;
      case "agent_thinking":
        // S1.4: backend brackets each probing LLM dispatch with
        // {value:true} and {value:false}. The frontend uses this to
        // render a muted "Interviewer is thinking…" line so the
        // candidate gets visible feedback during the up-to-16s
        // worst-case silence.
        this.events.onAgentThinking?.(!!msg.value);
        break;
      case "interview_ended":
        this.events.onInterviewEnded?.(msg.reason);
        break;
      case "pong":
        break;
      case "error":
        this.events.onError?.(msg.error ?? "unknown_error");
        break;
      default:
        // Unknown — ignore (server may add events; client need not handle all).
        break;
    }
  }
}

/* ----- small helpers ----- */

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[],
    );
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
