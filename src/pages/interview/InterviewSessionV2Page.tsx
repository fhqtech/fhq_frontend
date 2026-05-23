/**
 * v2 interview page — backend-authoritative voice pipeline.
 *
 * No AssemblyAIStreamer, no CartesiaSpeaker, no SSE orchestrator. Just the
 * WebSocket client, mic capture, and PCM playback. The backend FSM drives
 * everything.
 *
 * Enable via /interview/:interviewId/session?engine=v2 (or set
 * VITE_INTERVIEW_ENGINE=v2 to make v2 the default).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Loader2, Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  VoiceState,
  VoiceWebSocketClient,
} from "@/services/voiceWebSocketClient";
import { PcmPlayer, startMicCapture, classifyMicError, type CaptureHandle, type MicError } from "@/services/voiceAudio";

// sessionStorage keys for resume-after-refresh.
const SS_KEY_SESSION = "flowdot.v2.sessionId";
const SS_KEY_TOKEN = "flowdot.v2.candidateToken";
const SS_KEY_INTERVIEW = "flowdot.v2.interviewId";

// WS reconnect policy.
const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1000; // 1s, 2s, 4s, 8s, 16s

type TranscriptLine = { role: "agent" | "candidate"; text: string };

export default function InterviewSessionV2Page() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state as {
    sessionId?: string;
    candidateToken?: string;
  } | null;

  // C3: resume after refresh. location.state is lost on hard refresh; fall
  // back to sessionStorage. When startInterview runs we write to
  // sessionStorage so a refresh recovers the same session.
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

  const clientRef = useRef<VoiceWebSocketClient | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const captureRef = useRef<CaptureHandle | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  // Track whether the user intentionally ended (no auto-reconnect on
  // ENDED, force-wrap, or explicit close).
  const intentionalCloseRef = useRef(false);

  // --- guard: missing context ---
  const missingContext = !sessionId || !candidateToken;

  // --- lifecycle ---
  // Cleanup on unmount only — WS + audio init happens in startInterview()
  // when the user clicks. Doing it here would create a suspended
  // AudioContext (browsers require a user gesture to unlock audio).
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      captureRef.current?.stop();
      captureRef.current = null;
      clientRef.current?.close();
      clientRef.current = null;
      void playerRef.current?.close();
      playerRef.current = null;
    };
  }, []);

  // --- Open a WebSocket client wired with all event handlers ---
  // Extracted so reconnect can reuse it without re-running mic capture.
  const openWs = useCallback(() => {
    if (!sessionId || !candidateToken) return;
    const client = new VoiceWebSocketClient({
      sessionId,
      candidateToken,
      events: {
        onOpen: () => {
          setConnectionError(null);
          setReconnecting(null);
          reconnectAttemptsRef.current = 0;
        },
        onClose: (reason) => {
          // Intentional close (ENDED, end-early, unmount) → no reconnect.
          if (intentionalCloseRef.current || ended) {
            return;
          }
          // C2: auto-reconnect with exponential backoff.
          const attempt = reconnectAttemptsRef.current + 1;
          if (attempt > RECONNECT_MAX_ATTEMPTS) {
            setReconnecting(null);
            setConnectionError(
              `Connection lost (${reason}). Reload the page to try again — the backend still has your session for a few minutes.`
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
        onError: (err) => setConnectionError(`Error: ${err}`),
        onStateChange: (s) => setVoiceState(s),
        onAgentTurnStart: () => {
          setAgentSpeaking(true);
          setAgentPartial("");
          // S1.4 safety net: if the backend's agent_thinking=false event
          // was lost (WS hiccup), the agent_turn_start arrival is proof
          // the LLM finished. Clear the indicator unconditionally.
          setAgentThinking(false);
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
          // Clear resume-state — interview is over.
          try {
            sessionStorage.removeItem(SS_KEY_SESSION);
            sessionStorage.removeItem(SS_KEY_TOKEN);
            sessionStorage.removeItem(SS_KEY_INTERVIEW);
          } catch { /* noop */ }
          if (reason) console.info("[v2] interview ended:", reason);
        },
      },
    });
    return client;
  }, [sessionId, candidateToken, ended]);

  // --- Start interview on user gesture ---
  // This single click satisfies three requirements at once:
  //   1. Mic permission (Web Audio API needs a user gesture to record).
  //   2. AudioContext unlock (Chrome/Safari suspend until first gesture).
  //   3. Backend session start (we open the WS only now, so the greeting
  //      arrives at a context that's already in 'running' state).
  const startInterview = useCallback(async () => {
    if (missingContext) return;
    if (clientRef.current) return; // already started — idempotent
    setMicError(null);
    setConnectionError(null);

    try {
      // 1. Mic capture FIRST — the getUserMedia prompt acts as the user
      //    gesture that unlocks AudioContext for the upcoming PcmPlayer.
      const handle = await startMicCapture({
        onFrame: (pcm) => clientRef.current?.sendAudio(pcm),
        onError: (err) => {
          const classified = classifyMicError(err);
          setMicError(classified);
        },
      });
      captureRef.current = handle;
      setMicActive(true);

      // 2. Construct the audio player. AudioContext is in 'running' state
      //    now because the mic-permission flow was a user gesture.
      const player = new PcmPlayer();
      playerRef.current = player;

      // 3. Persist resume state BEFORE opening WS, so a refresh-during-
      //    connect still recovers cleanly.
      try {
        sessionStorage.setItem(SS_KEY_SESSION, sessionId!);
        sessionStorage.setItem(SS_KEY_TOKEN, candidateToken!);
        if (interviewId) sessionStorage.setItem(SS_KEY_INTERVIEW, interviewId);
      } catch { /* noop — private mode etc. */ }

      // 4. Open the WebSocket. The backend will send the greeting; the
      //    candidate can actually hear it.
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
    } catch { /* noop */ }
    navigate(`/interview/${interviewId}/complete`);
  }, [interviewId, navigate]);

  const stateBadge = useMemo(() => {
    const palette: Record<VoiceState, string> = {
      IDLE: "bg-muted/20 text-muted",
      GREETING: "bg-gold-soft text-gold-ink",
      PROBING: "bg-green-100 text-green-800",
      WRAPPING: "bg-blue-100 text-blue-800",
      ENDED: "bg-zinc-200 text-zinc-700",
    };
    return palette[voiceState];
  }, [voiceState]);

  if (missingContext) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold">We couldn't pick up your interview session</h1>
          <p className="text-sm text-muted">
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
    <div className="min-h-dvh bg-paper p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Interview (v2)</h1>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${stateBadge}`}
          >
            {voiceState}
          </span>
          {agentSpeaking && (
            <span className="text-xs text-muted">Interviewer speaking…</span>
          )}
          {agentThinking && !agentSpeaking && (
            <span className="text-xs text-muted">Interviewer is thinking…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!micActive ? (
            <Button onClick={startInterview} className="gap-2">
              <Mic className="w-4 h-4" /> Start interview
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-700">
              <Mic className="w-4 h-4" /> Mic live
            </span>
          )}
          <Button
            variant={holdActive ? "default" : "outline"}
            onClick={() => {
              const next = !holdActive;
              setHoldActive(next);
              clientRef.current?.sendHold(next);
            }}
            disabled={ended || !micActive}
          >
            {holdActive ? "I'm done — send" : "Take your time"}
          </Button>
          <Button variant="ghost" onClick={handleEndEarly}>
            End early
          </Button>
        </div>
      </header>

      {(listeningMs > 0 || holdActive) && !agentSpeaking && (() => {
        // Urgency tier based on remaining grace ms.
        // green > 4s, amber 2–4s, red < 2s
        const secs = Math.ceil(listeningMs / 1000);
        const isUrgent = !holdActive && listeningMs > 0 && listeningMs < 2000;
        const isWarn = !holdActive && listeningMs >= 2000 && listeningMs < 4000;
        const dotClass = holdActive
          ? "bg-blue-500"
          : isUrgent
          ? "bg-red-500"
          : isWarn
          ? "bg-amber-500"
          : "bg-green-500";
        const bgClass = holdActive
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : isUrgent
          ? "border-red-200 bg-red-50 text-red-900"
          : isWarn
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-800";
        return (
          <div className={`rounded border px-4 py-3 text-base flex items-center gap-3 ${bgClass}`}>
            <span className={`inline-block w-3 h-3 rounded-full animate-pulse ${dotClass}`} />
            <span className="flex-1">
              {holdActive ? (
                <>Holding — take your time. Click <strong>I'm done — send</strong> when ready.</>
              ) : (
                <>
                  I'm listening — keep speaking if you're not done. Agent will respond in{" "}
                  <strong>{secs}s</strong>.
                </>
              )}
            </span>
          </div>
        );
      })()}

      {micError && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900 space-y-2">
          <div className="font-medium flex items-center gap-2">
            <MicOff className="w-4 h-4" />
            {micError.kind === "denied" && "Microphone access blocked"}
            {micError.kind === "no_device" && "No microphone found"}
            {micError.kind === "in_use" && "Microphone is in use by another app"}
            {micError.kind === "insecure" && "Microphone requires a secure connection"}
            {micError.kind === "unknown" && "Microphone unavailable"}
          </div>
          <div className="text-red-800">
            {micError.kind === "denied" && (
              <>
                Your browser is blocking microphone access for this site. Click the
                lock icon in the address bar, allow microphone, then click "Retry".
                On Chrome you can also visit <code>chrome://settings/content/microphone</code>.
              </>
            )}
            {micError.kind === "no_device" && (
              <>Connect a microphone and click "Retry". If you're on a laptop, check that the built-in mic isn't disabled in system settings.</>
            )}
            {micError.kind === "in_use" && (
              <>Another tab or app (Zoom, Meet, Teams) is holding the mic. Close it and click "Retry".</>
            )}
            {micError.kind === "insecure" && (
              <>The browser only allows mic access on secure (https) origins. Reach out to the recruiter for a fresh link.</>
            )}
            {micError.kind === "unknown" && (
              <>Something went wrong starting the mic: {micError.message}. Try reloading the page.</>
            )}
          </div>
          <Button size="sm" onClick={() => { setMicError(null); void startInterview(); }}>
            Retry
          </Button>
        </div>
      )}

      {reconnecting && !ended && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Connection dropped. Reconnecting (attempt {reconnecting.attempt} of {RECONNECT_MAX_ATTEMPTS})…
          </span>
        </div>
      )}

      {connectionError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {connectionError}
        </div>
      )}

      <section className="flex-1 overflow-auto border rounded p-4 space-y-3 bg-white">
        {transcript.map((line, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-medium mr-2">
              {line.role === "agent" ? "Interviewer:" : "You:"}
            </span>
            <span>{line.text}</span>
          </div>
        ))}
        {agentPartial && (
          <div className="text-sm italic text-zinc-500">
            <span className="font-medium mr-2">Interviewer:</span>
            <span>{agentPartial}</span>
          </div>
        )}
        {candidatePartial && (
          <div className="text-sm italic text-zinc-400">
            <span className="font-medium mr-2">You:</span>
            <span>{candidatePartial}</span>
          </div>
        )}
        {ended && (
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            Interview ended. Your recruiter will be in touch.
          </div>
        )}
        {transcript.length === 0 && !agentPartial && !ended && !micActive && (
          <div className="text-sm text-muted flex flex-col gap-1">
            <span>Click "Start interview" when you're ready.</span>
            <span className="text-xs">The interviewer will speak as soon as you begin.</span>
          </div>
        )}
        {transcript.length === 0 && !agentPartial && !ended && micActive && (
          <div className="text-sm text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting…
          </div>
        )}
      </section>

      <footer className="text-xs text-muted">
        Session: {sessionId} · Backend FSM owns turn-taking. If the agent
        interrupts you, that's a bug — report the transcript.
      </footer>
    </div>
  );
}
