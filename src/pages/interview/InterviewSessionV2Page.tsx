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
  ChevronLeft,
  ChevronRight,
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
  // F1 (2026-05-25): client-side mic mute. Distinct from hold (server-side
  // pause). When muted, the capture pipeline keeps running but no PCM is
  // sent — the gateway sees silence and the idle watchdog applies normally.
  const [micMuted, setMicMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  // R11.1f: capture the end reason so the overlay can explain *why* the
  // interview ended. Backend sends e.g. "recruiter_stop", "force_wrap",
  // "idle_120s", "stt_dead: ...". UI maps the common ones to candidate-
  // friendly copy.
  const [endReason, setEndReason] = useState<string | null>(null);
  // C2: reconnect status, surfaced as an overlay banner.
  const [reconnecting, setReconnecting] = useState<{ attempt: number; nextMs: number } | null>(null);
  // D — elapsed time (started at first agent_turn_start).
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedStartRef = useRef<number | null>(null);
  // R11.1e: 25-minute stale-session pre-warning. The session is hard-cleared
  // after STALE_SESSION_TTL_MS (30 min) on refresh; warn the candidate at
  // 25 min so they have a 5-minute window to wrap up or actively interact.
  const [showStaleWarning, setShowStaleWarning] = useState(false);
  // D — WS connection status, decoupled from voiceState.
  // 'idle' before first connect, 'connecting' during handshake, 'connected'
  // after onOpen, 'error' on close/error.
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  // E — text-input fallback textarea.
  const [typedInput, setTypedInput] = useState("");
  // F — typing indicator label rotation.
  const [thinkingLabel, setThinkingLabel] = useState("Thinking");
  // U1/L1 — transcript on the right side per user explicit ask. Visible
  // by default (so the candidate can read along) with a chevron to hide
  // it down to a header-only strip if they want a cleaner view.
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  // T1b — mic level (0-1) and "mic silent" warning (true when mic has
  // been active for 5s+ with peak amplitude staying near 0).
  const [micLevel, setMicLevel] = useState(0);
  const [micSilent, setMicSilent] = useState(false);
  const micLowSinceRef = useRef<number | null>(null);
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

  // R11.1e: 25-minute stale-session pre-warning. STALE_SESSION_TTL_MS=30min
  // hard-clears the session on refresh; warn at 25min so the candidate has
  // a 5-minute window to wrap up before a refresh would lose state. Reads
  // SS_KEY_STARTED_AT (set in startInterview at line 461) and polls every
  // 30s to flip the warning state. No-op once warned or ended.
  useEffect(() => {
    if (ended || showStaleWarning) return;
    if (typeof window === "undefined") return;
    const tick = () => {
      const startedAtStr = sessionStorage.getItem(SS_KEY_STARTED_AT);
      if (!startedAtStr) return;
      const startedAt = Number(startedAtStr);
      if (Number.isNaN(startedAt)) return;
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= STALE_SESSION_TTL_MS - 5 * 60 * 1000) {
        setShowStaleWarning(true);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [ended, showStaleWarning]);

  // T1b — poll the captured mic level every 100ms while mic is active.
  // When peak amplitude stays below 0.02 for 5+ continuous seconds AND
  // the mic should be live (agent isn't speaking), flip the silent
  // warning. Resets when amplitude crosses the threshold OR mic stops.
  useEffect(() => {
    if (!micActive) {
      setMicLevel(0);
      setMicSilent(false);
      micLowSinceRef.current = null;
      return;
    }
    const id = setInterval(() => {
      const level = captureRef.current?.getLevel() ?? 0;
      setMicLevel(level);
      // Only consider it "silent" when the candidate is the one expected
      // to be talking. Agent speech is local — we don't see it on the mic.
      const candidateExpected = voiceState === "PROBING" && !agentSpeaking && !agentThinking && !holdActive;
      if (!candidateExpected) {
        micLowSinceRef.current = null;
        if (micSilent) setMicSilent(false);
        return;
      }
      if (level >= 0.02) {
        // Audio detected; clear any silent state.
        micLowSinceRef.current = null;
        if (micSilent) setMicSilent(false);
        return;
      }
      // Sub-threshold; start or continue the silent timer.
      if (micLowSinceRef.current === null) {
        micLowSinceRef.current = Date.now();
      } else if (Date.now() - micLowSinceRef.current >= 5_000 && !micSilent) {
        setMicSilent(true);
      }
    }, 100);
    return () => clearInterval(id);
  }, [micActive, voiceState, agentSpeaking, agentThinking, holdActive, micSilent]);

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
          setEndReason(reason ?? null);
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
  // this like a finalised audio turn (gateway.py text_input handler at
  // L961-967 calls _on_finalised which echoes candidate_turn_final back
  // over the WS at L257-260). We rely on that echo to render — DO NOT
  // optimistically append here, or we get duplicates (T2 bug: every
  // typed message rendered twice).
  const submitTypedInput = useCallback(() => {
    const text = typedInput.trim();
    if (!text) return;
    if (!clientRef.current) return;
    if (voiceState !== "PROBING") return;
    if (agentSpeaking || agentThinking) return;
    clientRef.current.sendText(text);
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

  // U1 — derive the single state caption shown directly below the avatar.
  // One source of truth for "what's the agent doing right now".
  const stateCaption: { text: string; dotClass: string } = useMemo(() => {
    if (ended) return { text: "Interview ended", dotClass: "bg-zinc-500" };
    if (agentSpeaking) return { text: "Speaking", dotClass: "bg-gold-ink" };
    if (agentThinking) return { text: `${thinkingLabel}…`, dotClass: "bg-amber-400" };
    if (holdActive) return { text: "Holding — click 'I'm done' when ready", dotClass: "bg-blue-400" };
    if (voiceState === "PROBING" && listeningMs > 0) {
      const secs = Math.ceil(listeningMs / 1000);
      const isUrgent = listeningMs < 2000;
      const isWarn = listeningMs >= 2000 && listeningMs < 4000;
      return {
        text: `Listening — agent responds in ${secs}s`,
        dotClass: isUrgent ? "bg-red-400" : isWarn ? "bg-amber-400" : "bg-green-400",
      };
    }
    if (voiceState === "PROBING") return { text: "Listening", dotClass: "bg-green-400" };
    if (voiceState === "GREETING") return { text: "Speaking", dotClass: "bg-gold-ink" };
    if (voiceState === "WRAPPING") return { text: "Wrapping up", dotClass: "bg-blue-400" };
    if (!micActive) return { text: "Click Start to begin", dotClass: "bg-muted/40" };
    return { text: "Connecting…", dotClass: "bg-amber-400" };
  }, [ended, agentSpeaking, agentThinking, thinkingLabel, holdActive, voiceState, listeningMs, micActive]);

  return (
    <div className="relative w-screen h-dvh bg-ink overflow-hidden">
      {/* U1 — ParticleSphere dimmed to background. State-aware but not dominant. */}
      <ParticleSphere
        conversationState={conversationStateForSphere}
        audioLevel={agentSpeaking ? 0.5 : 0}
        className="absolute inset-0 opacity-40"
      />

      {/* U1 — Top bar: logo left, single compact title+timer+status right */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-6 pt-6 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-lg font-bold text-paper whitespace-nowrap leading-tight">FlowDot AI</h1>
          <p className="text-xs text-muted-2 whitespace-nowrap leading-tight">Applicant Portal</p>
        </div>
        <div className="flex items-center gap-3 text-sm pointer-events-auto">
          <span className="text-muted-2 text-xs uppercase tracking-[0.18em] font-mono">Interview</span>
          <span className="text-paper/30">·</span>
          <div className="flex items-center gap-1.5 text-paper/80">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium font-mono tabular-nums">{formatTime(elapsedSeconds)}</span>
          </div>
          <span className="text-paper/30">·</span>
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
              <Wifi className="w-3.5 h-3.5" />
            ) : wsStatus === "error" ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
            )}
            <span className="font-medium text-xs">
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
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* F — Reconnect overlay banner */}
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

      {/* U1 — Avatar in upper-third (not dead-centre). State caption directly below.
          R11.1b: tighter top offset on phones so the avatar + caption +
          inactivity ring stack don't consume >60% of the small viewport,
          leaving room for the mic + text input controls. */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-5 top-[12%] md:top-[26%]">
        <div className="scale-[0.66]">
          {/* AiInterviewer is 144px; scale to ~96px without re-engineering the component */}
          <AiInterviewer
            isListening={voiceState === "PROBING" && !agentSpeaking && !agentThinking && !holdActive}
            isSpeaking={agentSpeaking}
          />
        </div>
        {/* Single state caption — replaces the scattered hold banner + grace banner */}
        <div className="flex items-center gap-2 text-paper/80 text-sm">
          <span className={`inline-block w-2 h-2 rounded-full ${agentSpeaking || (voiceState === "PROBING" && listeningMs > 0 && !holdActive) ? "animate-pulse" : ""} ${stateCaption.dotClass}`} />
          <span>{stateCaption.text}</span>
        </div>
        {/* T1b — mic silent warning. Fires after 5s of sub-threshold
            mic level while the candidate is expected to be speaking. */}
        {micSilent && (
          <div className="max-w-sm rounded border border-red-500/50 bg-red-950/40 backdrop-blur px-4 py-3 text-xs text-red-200 flex items-start gap-2">
            <MicOff className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-100 mb-1">We're not hearing you</p>
              <p>
                Your microphone isn't picking up sound. Check the lock icon in
                the address bar (allow microphone), unmute your system mic, or
                try a different input. You can also type your answer below
                while you sort it out.
              </p>
            </div>
          </div>
        )}
      </div>

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

      {/* R11.1e: stale-session pre-warning at 25 min. Sits below the top bar,
          unobtrusive amber strip. The session itself keeps running — this is
          just a heads-up that refreshing would lose state past 30 min. */}
      {showStaleWarning && !ended && !connectionError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-md w-[92%]">
          <div className="rounded border border-amber-500/40 bg-amber-950/40 backdrop-blur px-3 py-2 text-xs text-amber-100 flex items-start gap-2">
            <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
            <span>
              Your interview is approaching the 30-minute mark. Keep talking
              to stay active — refreshing now could end the session.
            </span>
          </div>
        </div>
      )}

      {/* R11.1d: lost-connection recovery panel. Replaces the prior thin
          red banner ("Reload the page to try again — backend still has
          your session for a few minutes") which left candidates without
          clear actions. Now: explicit Try-again + End-interview buttons,
          plus reassurance that progress is saved. */}
      {connectionError && !reconnecting && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-md w-[92%]">
          <div className="rounded-md border border-paper/15 bg-ink/90 backdrop-blur p-5 text-sm text-paper shadow-2xl">
            <h3 className="text-base font-semibold mb-2">
              We couldn't reconnect
            </h3>
            <p className="text-paper/80 mb-1">
              Your progress so far is saved.
            </p>
            <p className="text-paper/60 text-xs mb-4">
              You can resume this interview within the next 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="gold"
                className="flex-1"
                onClick={() => {
                  setConnectionError(null);
                  reconnectAttemptsRef.current = 0;
                  const next = openWs();
                  if (next) {
                    clientRef.current = next;
                    next.connect();
                  }
                }}
              >
                Try again
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-muted-2 hover:text-paper"
                onClick={() => {
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
                }}
              >
                End interview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* G — Inactivity ring positioned beneath the avatar/state caption */}
      {showInactivityWarning && !ended && !agentSpeaking && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 top-[50%]">
          <div className="flex flex-col items-center gap-3 bg-ink/90 border border-amber-500/40 rounded-lg px-5 py-3 shadow-2 backdrop-blur">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={inactivitySecondsLeft <= 10 ? "rgb(248 113 113)" : inactivitySecondsLeft <= 20 ? "rgb(251 191 36)" : "rgb(74 222 128)"}
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={
                    2 * Math.PI * 24 * (1 - inactivitySecondsLeft / Math.round(INACTIVITY_COUNTDOWN_MS / 1000))
                  }
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-paper font-mono tabular-nums">
                {Math.max(0, inactivitySecondsLeft)}
              </span>
            </div>
            <Button size="sm" onClick={handleStillHere}>I'm here</Button>
          </div>
        </div>
      )}

      {/* L1 — Transcript fixed on the right side (per user ask).
          Hidden below the lg breakpoint to keep mobile clean.
          Header has a chevron to collapse down to just the header strip. */}
      {micActive && !ended && (
        <div className="hidden lg:block absolute top-20 right-6 w-80 z-10">
          {transcriptVisible ? (
            <div className="bg-ink/95 backdrop-blur border border-paper/10 rounded-lg overflow-hidden shadow-2 flex flex-col" style={{ height: "calc(100dvh - 220px)" }}>
              <button
                type="button"
                onClick={() => setTranscriptVisible(false)}
                className="w-full flex items-center justify-between px-4 py-2 border-b border-paper/10 text-xs text-muted-2 hover:bg-paper/5 transition-colors shrink-0"
                title="Hide transcript"
              >
                <span className="font-mono uppercase tracking-[0.18em]">
                  Transcript ({transcript.length})
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="flex-1 overflow-hidden">
                <TranscriptBox
                  messages={toTranscriptMessages(transcript)}
                  currentUtterance={candidatePartial}
                  isUserSpeaking={!!candidatePartial}
                  className="w-full h-full border-0 rounded-none"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTranscriptVisible(true)}
              className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-ink/80 backdrop-blur border border-paper/10 text-xs text-muted-2 hover:bg-paper/5 hover:border-paper/20 transition-colors"
              title="Show transcript"
            >
              <span className="font-mono uppercase tracking-[0.18em]">
                Transcript ({transcript.length})
              </span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* E — Text input fallback, sits just above the controls bar.
          R11.1b: extra clearance on small viewports so when the on-screen
          keyboard pops on mobile, the input doesn't collide with the mic
          button at bottom-6. */}
      {micActive && !ended && (
        <div className="absolute bottom-32 md:bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-10">
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
                  ? "Type if you prefer — or just speak. Enter to send."
                  : agentSpeaking
                    ? "Interviewer is speaking…"
                    : agentThinking
                      ? "Interviewer is thinking…"
                      : "Waiting for interview to start…"
              }
              disabled={voiceState !== "PROBING" || agentSpeaking || agentThinking}
              rows={1}
              className="flex-1 resize-none bg-ink/80 backdrop-blur border border-paper/15 rounded-lg px-3 py-2 text-sm text-paper placeholder-muted-2 disabled:opacity-40 focus:outline-hidden focus:border-accent"
            />
            <button
              type="submit"
              disabled={!typedInput.trim() || voiceState !== "PROBING" || agentSpeaking || agentThinking}
              className="h-10 px-4 bg-accent hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-paper text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
        </div>
      )}

      {/* U1 — Bottom controls: mic stays primary (gold), hold/end ghost flanking.
          R11.1b: pb-[env(safe-area-inset-bottom)] keeps the controls clear of
          the iOS home indicator. */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10 pb-[env(safe-area-inset-bottom)]">
        {!micActive ? (
          <Button onClick={startInterview} className="gap-2" size="lg" variant="gold">
            <Mic className="w-4 h-4" /> Start interview
          </Button>
        ) : (
          <>
            <div className="relative flex items-center justify-center h-14 w-14">
              {/* T1b — mic-level ring around the mic button. Outer ring
                  scales with peak amplitude so the candidate can SEE
                  their voice being picked up. Static fallback ring
                  when level is zero. */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-accent/60 transition-transform duration-100"
                style={{
                  transform: `scale(${1 + Math.min(0.4, micLevel * 0.6)})`,
                  opacity: 0.3 + Math.min(0.7, micLevel * 2),
                }}
              />
              <button
                onClick={() => {
                  if (!micActive || ended) return;
                  const next = !micMuted;
                  setMicMuted(next);
                  captureRef.current?.setMuted(next);
                }}
                disabled={!micActive || ended}
                className={`relative flex items-center justify-center h-14 w-14 rounded-full border-2 transition-all ${
                  !micActive
                    ? "border-paper/30 bg-paper/5 cursor-not-allowed"
                    : micMuted
                      ? "border-danger/60 bg-danger/10"
                      : "border-accent bg-accent/15 shadow-[0_0_24px_rgba(255,180,0,0.25)]"
                }`}
                title={
                  !micActive
                    ? "Microphone off"
                    : micMuted
                      ? "Microphone muted — click to unmute"
                      : "Microphone live — click to mute"
                }
                aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
                type="button"
              >
                {!micActive || micMuted ? (
                  <MicOff size={20} className="text-muted-2" />
                ) : (
                  <Mic size={22} className="text-accent" />
                )}
              </button>
            </div>
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

      {/* Ended state — full overlay.
          R11.1f: reason-aware copy. If the recruiter stopped the interview
          remotely (reason starts with "recruiter_") or the system force-wrapped
          due to idle/silence, the candidate sees a context-appropriate message
          instead of the generic "thanks for taking the time" copy. */}
      {ended && (() => {
        const reason = (endReason || "").toLowerCase();
        const stoppedByRecruiter =
          reason.startsWith("recruiter_") || reason.includes("recruiter_stop");
        const timedOut =
          reason.includes("idle_") ||
          reason.includes("silent_") ||
          reason.includes("hold_timeout") ||
          reason === "force_wrap";

        const heading = stoppedByRecruiter
          ? "Interview ended by the hiring team"
          : timedOut
          ? "Interview timed out"
          : "Thanks for taking the time";

        const description = stoppedByRecruiter
          ? "Your responses up to this point have been saved. The hiring team will reach out with next steps."
          : timedOut
          ? "We ended the session due to inactivity. Your responses so far are saved — the hiring team will be in touch."
          : "Interview ended. Your recruiter will be in touch about specific opportunities.";

        return (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-ink/95 backdrop-blur-sm">
            <div className="max-w-md text-center space-y-4">
              <h2 className="text-2xl font-bold text-paper">{heading}</h2>
              <p className="text-sm text-muted-2">{description}</p>
              <Button onClick={() => navigate(`/interview/${interviewId}/complete`)}>
                Continue
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
