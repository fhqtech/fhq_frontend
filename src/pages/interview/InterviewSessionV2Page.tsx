/**
 * v2 interview page — backend-authoritative voice pipeline.
 *
 * No AssemblyAIStreamer, no CartesiaSpeaker, no SSE orchestrator. Just the
 * WebSocket client, mic capture, and PCM playback. The backend FSM drives
 * everything.
 *
 * Enable via /interview/:interviewId/session?engine=v2 (or set
 * VITE_INTERVIEW_ENGINE=v2 to make v2 the default).
 *
 * UI commits C-G (2026-05-24): restored v1's richer candidate-facing UX
 * by reusing the v1 components (ParticleSphere, AiInterviewer,
 * TranscriptBox) over the v2 voice pipeline. v1's orchestrator is NOT
 * ported — backend FSM still authoritative. Just visuals + controls.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  VoiceState,
  VoiceWebSocketClient,
} from "@/services/voiceWebSocketClient";
import { PcmPlayer, startMicCapture, classifyMicError, type CaptureHandle, type MicError } from "@/services/voiceAudio";
import { ParticleSphere } from "@/components/interview/ParticleSphere";
import { AiInterviewer } from "@/components/interview/AiInterviewer";
import { TranscriptBox, type TranscriptMessage } from "@/components/interview/TranscriptBox";
import { ConversationState } from "@/types/interview";

// sessionStorage keys for resume-after-refresh.
const SS_KEY_SESSION = "flowdot.v2.sessionId";
const SS_KEY_TOKEN = "flowdot.v2.candidateToken";
const SS_KEY_INTERVIEW = "flowdot.v2.interviewId";
// F-2c: stamped when the 3 session keys are first written; checked on mount
// to drop stale resume state (backend restart, 30+ min pause between
// pre-check and start, etc.) instead of attempting a doomed WS reconnect.
const SS_KEY_STARTED_AT = "flowdot.v2.sessionStartedAt";
// 30 min — matches max interview budget per Sprint 0 blueprint schema.
const STALE_SESSION_TTL_MS = 30 * 60 * 1000;

// WS reconnect policy.
const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1000; // 1s, 2s, 4s, 8s, 16s

// G — Inactivity warning thresholds. Locally warn before the server
// nudges so the candidate has visual feedback. Server's first nudge is
// at 20s; ours fires at 30s and counts down 30s before showing the
// "I'm here" button. Server still authoritative for the actual force-wrap.
const INACTIVITY_WARN_MS = 30_000;
const INACTIVITY_COUNTDOWN_MS = 30_000;

type TranscriptLine = { role: "agent" | "candidate"; text: string };

// C — adapter from v2's TranscriptLine to v1 TranscriptBox's
// TranscriptMessage. TranscriptBox uses 'ai' / 'user' roles.
const toTranscriptMessages = (lines: TranscriptLine[]): TranscriptMessage[] =>
  lines.map((line) => ({
    role: line.role === "agent" ? "ai" : "user",
    content: line.text,
  }));

// C — map v2 VoiceState → v1 ConversationState for ParticleSphere.
// SPEAKING is a derived state (agent_speaking flag, not in voiceState).
const mapVoiceStateToConversation = (
  voiceState: VoiceState,
  agentSpeaking: boolean,
  agentThinking: boolean,
): ConversationState => {
  if (voiceState === "IDLE") return ConversationState.IDLE;
  if (voiceState === "ENDED") return ConversationState.IDLE;
  if (agentSpeaking) return ConversationState.SPEAKING;
  if (agentThinking) return ConversationState.THINKING;
  return ConversationState.LISTENING;
};

export default function InterviewSessionV2Page() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const stateData = location.state as {
    sessionId?: string;
    candidateToken?: string;
  } | null;

  // F-2c: stale-session TTL guard. See header comment for invariants.
  const [staleSessionDetected] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const storedStartedAt = sessionStorage.getItem(SS_KEY_STARTED_AT);
    if (!storedStartedAt) return false;
    const startedAt = Number(storedStartedAt);
    if (Number.isNaN(startedAt)) return false;
    if (Date.now() - startedAt <= STALE_SESSION_TTL_MS) return false;
    try {
      sessionStorage.removeItem(SS_KEY_SESSION);
      sessionStorage.removeItem(SS_KEY_TOKEN);
      sessionStorage.removeItem(SS_KEY_INTERVIEW);
      sessionStorage.removeItem(SS_KEY_STARTED_AT);
    } catch { /* noop — private mode etc. */ }
    return true;
  });

  // C3: resume after refresh. location.state is lost on hard refresh; fall
  // back to sessionStorage.
  const [sessionId, candidateToken] = useMemo<[string | undefined, string | undefined]>(() => {
    const fromState: [string | undefined, string | undefined] = [
      stateData?.sessionId,
      stateData?.candidateToken,
    ];
    if (fromState[0] && fromState[1]) return fromState;
    if (typeof window === "undefined") return [undefined, undefined];
    return [
      sessionStorage.getItem(SS_KEY_SESSION) ?? undefined,
      sessionStorage.getItem(SS_KEY_TOKEN) ?? undefined,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateData?.sessionId, stateData?.candidateToken]);

  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [agentPartial, setAgentPartial] = useState("");
  const [candidatePartial, setCandidatePartial] = useState("");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [agentThinking, setAgentThinking] = useState(false);
  const [listeningMs, setListeningMs] = useState(0);
  const [holdActive, setHoldActive] = useState(false);
  const [ended, setEnded] = useState(false);
  // C2: reconnect status, surfaced as an overlay banner.
  const [reconnecting, setReconnecting] = useState<{ attempt: number; nextMs: number } | null>(null);
  // D — elapsed time (started at first agent_turn_start).
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedStartRef = useRef<number | null>(null);
  // D — WS connection status, decoupled from voiceState.
  // 'idle' before first connect, 'connecting' during handshake, 'connected'
  // after onOpen, 'error' on close/error.
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  // E — text-input fallback textarea.
  const [typedInput, setTypedInput] = useState("");
  // F — typing indicator label rotation.
  const [thinkingLabel, setThinkingLabel] = useState("Thinking");
  // G — inactivity warning state.
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(
    Math.round(INACTIVITY_COUNTDOWN_MS / 1000),
  );
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clientRef = useRef<VoiceWebSocketClient | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const captureRef = useRef<CaptureHandle | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  // --- guard: missing context ---
  const missingContext = !sessionId || !candidateToken;

  // --- lifecycle ---
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (inactivityCountdownRef.current) {
        clearInterval(inactivityCountdownRef.current);
        inactivityCountdownRef.current = null;
      }
      captureRef.current?.stop();
      captureRef.current = null;
      clientRef.current?.close();
      clientRef.current = null;
      void playerRef.current?.close();
      playerRef.current = null;
    };
  }, []);

  // F-2c: stale-session navigation.
  useEffect(() => {
    if (!staleSessionDetected) return;
    toast({
      title: "Session expired",
      description: "Your previous session expired. Please start a new interview.",
    });
    if (interviewId) {
      navigate(`/interview/${interviewId}/pre-check`);
    } else {
      navigate("/candidate");
    }
  }, [staleSessionDetected, interviewId, navigate, toast]);

  // D — elapsed-time tick (1Hz) once the timer has started.
  useEffect(() => {
    if (elapsedStartRef.current === null) return;
    const id = setInterval(() => {
      if (elapsedStartRef.current !== null) {
        setElapsedSeconds(Math.floor((Date.now() - elapsedStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [elapsedStartRef.current === null]);

  // F — rotating typing-indicator label while agent is thinking.
  useEffect(() => {
    if (!agentThinking) {
      setThinkingLabel("Thinking");
      return;
    }
    const labels = ["Thinking", "Processing", "Analyzing", "Drafting"];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % labels.length;
      setThinkingLabel(labels[i]);
    }, 900);
    return () => clearInterval(id);
  }, [agentThinking]);

  // G — inactivity warning timer. Resets whenever the candidate produces
  // STT activity (partial text update), the agent speaks, or hold engages.
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (inactivityCountdownRef.current) clearInterval(inactivityCountdownRef.current);
    setShowInactivityWarning(false);
    setInactivitySecondsLeft(Math.round(INACTIVITY_COUNTDOWN_MS / 1000));
    if (ended || holdActive || agentSpeaking || agentThinking || voiceState !== "PROBING") {
      return;
    }
    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityWarning(true);
      let remaining = Math.round(INACTIVITY_COUNTDOWN_MS / 1000);
      setInactivitySecondsLeft(remaining);
      inactivityCountdownRef.current = setInterval(() => {
        remaining -= 1;
        setInactivitySecondsLeft(remaining);
        if (remaining <= 0 && inactivityCountdownRef.current) {
          clearInterval(inactivityCountdownRef.current);
          inactivityCountdownRef.current = null;
        }
      }, 1000);
    }, INACTIVITY_WARN_MS);
  }, [ended, holdActive, agentSpeaking, agentThinking, voiceState]);

  useEffect(() => {
    resetInactivityTimer();
  }, [
    resetInactivityTimer,
    candidatePartial,
    transcript.length,
    agentSpeaking,
    agentThinking,
    holdActive,
    voiceState,
  ]);

  // --- WebSocket client ---
  const openWs = useCallback(() => {
    if (!sessionId || !candidateToken) return;
    setWsStatus("connecting");
    const client = new VoiceWebSocketClient({
      sessionId,
      candidateToken,
      events: {
        onOpen: () => {
          setConnectionError(null);
          setReconnecting(null);
          reconnectAttemptsRef.current = 0;
          setWsStatus("connected");
        },
        onClose: (reason) => {
          setWsStatus(intentionalCloseRef.current || ended ? "idle" : "error");
          if (intentionalCloseRef.current || ended) {
            return;
          }
          const attempt = reconnectAttemptsRef.current + 1;
          if (attempt > RECONNECT_MAX_ATTEMPTS) {
            setReconnecting(null);
            setConnectionError(
              `Connection lost (${reason}). Reload the page to try again — the backend still has your session for a few minutes.`,
            );
            return;
          }
          reconnectAttemptsRef.current = attempt;
          const delayMs = RECONNECT_BASE_MS * Math.pow(2, attempt - 1);
          setReconnecting({ attempt, nextMs: delayMs });
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            try {
              clientRef.current?.close();
            } catch { /* noop */ }
            const next = openWs();
            if (next) {
              clientRef.current = next;
              next.connect();
            }
          }, delayMs);
        },
        onError: (err) => {
          setConnectionError(`Error: ${err}`);
          setWsStatus("error");
        },
        onStateChange: (s) => setVoiceState(s),
        onAgentTurnStart: () => {
          setAgentSpeaking(true);
          setAgentPartial("");
          setAgentThinking(false);
          // D — start the elapsed-time clock at first agent turn.
          if (elapsedStartRef.current === null) {
            elapsedStartRef.current = Date.now();
            setElapsedSeconds(0);
          }
        },
        onAgentTurnEnd: () => {
          setAgentSpeaking(false);
          setAgentPartial((current) => {
            if (current) {
              setTranscript((prev) => [...prev, { role: "agent", text: current }]);
            }
            return "";
          });
        },
        onAgentTextPartial: (text) => setAgentPartial(text),
        onAgentAudioChunk: (pcm) => playerRef.current?.enqueue(pcm),
        onCandidateTurnPartial: (text) => setCandidatePartial(text),
        onCandidateTurnFinal: (text) => {
          setCandidatePartial("");
          setTranscript((prev) => [...prev, { role: "candidate", text }]);
        },
        onListening: (graceRemainingMs) => {
          setListeningMs(graceRemainingMs);
        },
        onHold: (active) => {
          setHoldActive(active);
        },
        onAgentThinking: (thinking) => {
          setAgentThinking(thinking);
        },
        onBargeIn: () => {
          playerRef.current?.flush();
          setAgentSpeaking(false);
          setAgentPartial("");
        },
        onInterviewEnded: (reason) => {
          intentionalCloseRef.current = true;
          setEnded(true);
          setVoiceState("ENDED");
          captureRef.current?.stop();
          captureRef.current = null;
          setMicActive(false);
          try {
            sessionStorage.removeItem(SS_KEY_SESSION);
            sessionStorage.removeItem(SS_KEY_TOKEN);
            sessionStorage.removeItem(SS_KEY_INTERVIEW);
            sessionStorage.removeItem(SS_KEY_STARTED_AT);
          } catch { /* noop */ }
          if (reason) console.info("[v2] interview ended:", reason);
        },
      },
    });
    return client;
  }, [sessionId, candidateToken, ended]);

  // --- Start interview on user gesture ---
  const startInterview = useCallback(async () => {
    if (missingContext) return;
    if (clientRef.current) return; // idempotent
    setMicError(null);
    setConnectionError(null);

    try {
      const handle = await startMicCapture({
        onFrame: (pcm) => clientRef.current?.sendAudio(pcm),
        onError: (err) => {
          const classified = classifyMicError(err);
          setMicError(classified);
        },
      });
      captureRef.current = handle;
      setMicActive(true);

      const player = new PcmPlayer();
      playerRef.current = player;

      try {
        sessionStorage.setItem(SS_KEY_SESSION, sessionId!);
        sessionStorage.setItem(SS_KEY_TOKEN, candidateToken!);
        if (interviewId) sessionStorage.setItem(SS_KEY_INTERVIEW, interviewId);
        sessionStorage.setItem(SS_KEY_STARTED_AT, String(Date.now()));
      } catch { /* noop */ }

      intentionalCloseRef.current = false;
      reconnectAttemptsRef.current = 0;
      const client = openWs();
      if (client) {
        clientRef.current = client;
        client.connect();
      }
    } catch (err) {
      const classified = classifyMicError(err);
      setMicError(classified);
      setMicActive(false);
    }
  }, [missingContext, sessionId, candidateToken, interviewId, openWs]);

  const handleEndEarly = useCallback(() => {
    if (!window.confirm("End the interview now?")) return;
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    captureRef.current?.stop();
    captureRef.current = null;
    clientRef.current?.close();
    try {
      sessionStorage.removeItem(SS_KEY_SESSION);
      sessionStorage.removeItem(SS_KEY_TOKEN);
      sessionStorage.removeItem(SS_KEY_INTERVIEW);
      sessionStorage.removeItem(SS_KEY_STARTED_AT);
    } catch { /* noop */ }
    navigate(`/interview/${interviewId}/complete`);
  }, [interviewId, navigate]);

  const handleReconnect = useCallback(() => {
    if (intentionalCloseRef.current || ended) return;
    setConnectionError(null);
    try { clientRef.current?.close(); } catch { /* noop */ }
    const next = openWs();
    if (next) {
      clientRef.current = next;
      next.connect();
    }
  }, [ended, openWs]);

  // E — submit typed text via the WS text_input channel. Backend treats
  // this like a finalised audio turn (gateway.py text_input handler).
  const submitTypedInput = useCallback(() => {
    const text = typedInput.trim();
    if (!text) return;
    if (!clientRef.current) return;
    if (voiceState !== "PROBING") return;
    if (agentSpeaking || agentThinking) return;
    clientRef.current.sendText(text);
    // Optimistically render in transcript — backend will not echo this
    // back as a candidate_turn_final because text_input bypasses STT.
    setTranscript((prev) => [...prev, { role: "candidate", text }]);
    setTypedInput("");
  }, [typedInput, voiceState, agentSpeaking, agentThinking]);

  // G — user clicked "I'm here" on the inactivity warning. Just resets
  // the local warning; server's idle nudge is unaffected.
  const handleStillHere = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const conversationStateForSphere = useMemo(
    () => mapVoiceStateToConversation(voiceState, agentSpeaking, agentThinking),
    [voiceState, agentSpeaking, agentThinking],
  );

  if (missingContext) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-8 bg-ink">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold text-paper">We couldn't pick up your interview session</h1>
          <p className="text-sm text-muted-2">
            This usually means the page was opened without going through the
            invitation flow. Please return to the invite email and click the
            interview link again. If you were mid-interview and refreshed the
            page, you can also try clicking the back button.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline">Go back</Button>
            <Button onClick={() => navigate("/candidate")}>Open candidate portal</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-dvh bg-ink overflow-hidden">
      {/* C — 3D ParticleSphere background, state-aware */}
      <ParticleSphere
        conversationState={conversationStateForSphere}
        audioLevel={agentSpeaking ? 0.5 : 0}
        className="absolute inset-0"
      />

      {/* D — Logo top-left */}
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-xl font-bold text-paper whitespace-nowrap">FlowDot AI</h1>
        <p className="text-xs text-muted-2 whitespace-nowrap">Applicant Portal</p>
      </div>

      {/* D — Timer + connection status top-center */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
        <h2 className="text-muted-2 text-sm font-normal mb-2">Interview</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-paper/80">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium font-mono tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 ${
              wsStatus === "connected"
                ? "text-green-400"
                : wsStatus === "error"
                  ? "text-red-400"
                  : "text-amber-400"
            }`}
          >
            {wsStatus === "connected" ? (
              <Wifi className="w-4 h-4" />
            ) : wsStatus === "error" ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4 animate-pulse" />
            )}
            <span className="text-sm font-medium">
              {wsStatus === "connected"
                ? "Connected"
                : wsStatus === "error"
                  ? "Disconnected"
                  : wsStatus === "connecting"
                    ? "Connecting…"
                    : "Idle"}
            </span>
          </div>
          {wsStatus === "error" && !ended && (
            <button
              onClick={handleReconnect}
              aria-label="Reconnect"
              title="Reconnect"
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* F — Reconnect overlay banner (styled badge with spinner) */}
      {reconnecting && !ended && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-amber-500/20 border border-amber-500/50 text-amber-200 px-4 py-2 rounded text-xs flex items-center gap-2 shadow-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>
              Connection dropped. Reconnecting (attempt {reconnecting.attempt} of {RECONNECT_MAX_ATTEMPTS})…
            </span>
          </div>
        </div>
      )}

      {/* C — AiInterviewer avatar centred. Pulses for listening/speaking. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-4">
        <AiInterviewer
          isListening={voiceState === "PROBING" && !agentSpeaking && !agentThinking}
          isSpeaking={agentSpeaking}
        />
        {/* F — Typing indicator */}
        {agentThinking && !agentSpeaking && (
          <div className="flex items-center gap-2 text-muted-2 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span>{thinkingLabel}…</span>
          </div>
        )}
      </div>

      {/* C — Transcript right side, chat bubbles */}
      <div className="absolute top-32 right-6 w-80 max-w-[calc(100vw-3rem)] h-[calc(100dvh-220px)] z-10">
        <TranscriptBox
          messages={toTranscriptMessages(transcript)}
          currentUtterance={candidatePartial}
          isUserSpeaking={!!candidatePartial}
          className="w-full h-full"
        />
      </div>

      {/* Listening/hold grace banner — kept from v2; valuable UX */}
      {(listeningMs > 0 || holdActive) && !agentSpeaking && (() => {
        const secs = Math.ceil(listeningMs / 1000);
        const isUrgent = !holdActive && listeningMs > 0 && listeningMs < 2000;
        const isWarn = !holdActive && listeningMs >= 2000 && listeningMs < 4000;
        const dotClass = holdActive
          ? "bg-blue-400"
          : isUrgent
            ? "bg-red-400"
            : isWarn
              ? "bg-amber-400"
              : "bg-green-400";
        return (
          <div className="absolute top-20 left-6 z-10 max-w-xs">
            <div className="rounded border border-paper/20 bg-ink/80 backdrop-blur px-3 py-2 text-xs flex items-center gap-2 text-muted-2">
              <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${dotClass}`} />
              <span>
                {holdActive ? (
                  <>Holding — click <strong>I'm done</strong> when ready.</>
                ) : (
                  <>Listening — agent responds in <strong>{secs}s</strong></>
                )}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Mic error — overlay, blocks interaction */}
      {micError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-ink/80 backdrop-blur-sm">
          <div className="max-w-md rounded border border-red-500/50 bg-red-950/40 p-5 text-sm text-red-200 space-y-3">
            <div className="font-medium flex items-center gap-2 text-red-100">
              <MicOff className="w-4 h-4" />
              {micError.kind === "denied" && "Microphone access blocked"}
              {micError.kind === "no_device" && "No microphone found"}
              {micError.kind === "in_use" && "Microphone is in use by another app"}
              {micError.kind === "insecure" && "Microphone requires a secure connection"}
              {micError.kind === "unknown" && "Microphone unavailable"}
            </div>
            <div>
              {micError.kind === "denied" && (
                <>Your browser is blocking microphone access. Click the lock icon in the address bar, allow microphone, then click "Retry".</>
              )}
              {micError.kind === "no_device" && (
                <>Connect a microphone and click "Retry".</>
              )}
              {micError.kind === "in_use" && (
                <>Another tab or app (Zoom, Meet, Teams) is holding the mic. Close it and click "Retry".</>
              )}
              {micError.kind === "insecure" && (
                <>The browser only allows mic access on secure (https) origins. Reach out to the recruiter for a fresh link.</>
              )}
              {micError.kind === "unknown" && (
                <>Something went wrong: {micError.message}. Try reloading.</>
              )}
            </div>
            <Button size="sm" onClick={() => { setMicError(null); void startInterview(); }}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {connectionError && !reconnecting && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-md">
          <div className="rounded border border-red-500/50 bg-red-950/40 p-3 text-sm text-red-200">
            {connectionError}
          </div>
        </div>
      )}

      {/* G — Inactivity warning ring + "I'm here" button */}
      {showInactivityWarning && !ended && !agentSpeaking && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20">
          <div className="flex flex-col items-center gap-3 bg-ink/90 border border-amber-500/40 rounded-lg px-6 py-4 shadow-2">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={inactivitySecondsLeft <= 10 ? "rgb(248 113 113)" : inactivitySecondsLeft <= 20 ? "rgb(251 191 36)" : "rgb(74 222 128)"}
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={
                    2 * Math.PI * 28 * (1 - inactivitySecondsLeft / Math.round(INACTIVITY_COUNTDOWN_MS / 1000))
                  }
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-paper font-mono tabular-nums">
                {Math.max(0, inactivitySecondsLeft)}
              </span>
            </div>
            <p className="text-xs text-muted-2 text-center max-w-[160px]">
              Still there? The interview will continue when you respond.
            </p>
            <Button size="sm" onClick={handleStillHere}>I'm here</Button>
          </div>
        </div>
      )}

      {/* E — Text input fallback, bottom-center above the controls bar */}
      {micActive && !ended && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitTypedInput();
            }}
            className="flex gap-2 items-end"
          >
            <textarea
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitTypedInput();
                }
              }}
              placeholder={
                voiceState === "PROBING" && !agentSpeaking && !agentThinking
                  ? "Type your answer (or just speak) — Enter to send, Shift+Enter for newline"
                  : agentSpeaking
                    ? "Interviewer is speaking…"
                    : agentThinking
                      ? "Interviewer is thinking…"
                      : "Waiting for interview to start…"
              }
              disabled={voiceState !== "PROBING" || agentSpeaking || agentThinking}
              rows={1}
              className="flex-1 resize-none bg-ink/80 border border-paper/20 rounded-lg px-3 py-2 text-sm text-paper placeholder-muted-2 disabled:opacity-50 focus:outline-hidden focus:border-accent"
            />
            <button
              type="submit"
              disabled={!typedInput.trim() || voiceState !== "PROBING" || agentSpeaking || agentThinking}
              className="h-10 px-4 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-paper text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      )}

      {/* Audio controls bar — bottom centre. Start/Hold/End */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        {!micActive ? (
          <Button onClick={startInterview} className="gap-2" size="lg">
            <Mic className="w-4 h-4" /> Start interview
          </Button>
        ) : (
          <>
            <button
              className={`relative flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all ${
                micActive ? "border-accent bg-accent/10" : "border-paper/30 bg-paper/5"
              }`}
              title={micActive ? "Microphone live" : "Microphone off"}
              aria-label="Microphone status"
              type="button"
            >
              {micActive ? (
                <Mic size={20} className="text-accent" />
              ) : (
                <MicOff size={20} className="text-muted-2" />
              )}
            </button>
            <Button
              variant={holdActive ? "default" : "outline"}
              onClick={() => {
                const next = !holdActive;
                setHoldActive(next);
                clientRef.current?.sendHold(next);
              }}
              disabled={ended}
            >
              {holdActive ? "I'm done — send" : "Take your time"}
            </Button>
            <Button variant="ghost" onClick={handleEndEarly} className="text-muted-2 hover:text-paper">
              End early
            </Button>
          </>
        )}
      </div>

      {/* Ended state — full overlay */}
      {ended && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-ink/95 backdrop-blur-sm">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-2xl font-bold text-paper">Thanks for taking the time</h2>
            <p className="text-sm text-muted-2">
              Interview ended. Your recruiter will be in touch about specific opportunities.
            </p>
            <Button onClick={() => navigate(`/interview/${interviewId}/complete`)}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
