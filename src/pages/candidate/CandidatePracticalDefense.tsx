/**
 * CandidatePracticalDefense — the live text defense. We start the defense for
 * a submission, show each AI probe, and loop the candidate's replies through
 * /message until the backend says done. Then a "submitted, under review"
 * screen.
 *
 * Per CR-04 the candidate NEVER sees a score or recommendation here — only the
 * probe questions and a human-in-the-loop confirmation.
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { practicalDefenseApi, DefenseNotReadyError } from "@/services/practicalDefenseApi";

interface Turn {
  role: "ai" | "candidate";
  text: string;
}

export default function CandidatePracticalDefense() {
  const { submissionId = "" } = useParams();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const startedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Start the defense once. The probe plan is built in the background right after
  // submit, so the first attempt(s) may return 425 ("preparing") — retry briefly.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // ~40s at 2s intervals

    const attempt = () => {
      practicalDefenseApi
        .startDefense(submissionId)
        .then((res) => {
          if (cancelled) return;
          setPreparing(false);
          setSessionId(res.session_id);
          if (res.message) setTurns([{ role: "ai", text: res.message }]);
          setDone(res.done);
          setLoading(false);
        })
        .catch((e) => {
          if (cancelled) return;
          if (e instanceof DefenseNotReadyError && attempts < MAX_ATTEMPTS) {
            attempts += 1;
            setPreparing(true);
            timer = setTimeout(attempt, 2000); // keep loading=true while preparing
            return;
          }
          setError(
            e instanceof DefenseNotReadyError
              ? "Your defense is taking longer than expected to prepare. Please refresh in a moment."
              : e?.message || "Could not start the defense.",
          );
          setLoading(false);
        });
    };
    attempt();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [submissionId]);

  // Keep the latest turn in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, done]);

  async function send() {
    const text = reply.trim();
    if (!text || !sessionId || sending || done) return;
    setSending(true);
    setError(null);
    setTurns((prev) => [...prev, { role: "candidate", text }]);
    setReply("");
    try {
      const res = await practicalDefenseApi.sendDefenseMessage(sessionId, text);
      if (res.message) setTurns((prev) => [...prev, { role: "ai", text: res.message }]);
      setDone(res.done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your reply.");
      // Roll the optimistic candidate turn back so they can retry.
      setTurns((prev) => prev.slice(0, -1));
      setReply(text);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {loading ? (
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">
          {preparing ? "Preparing your defense — this can take a few seconds…" : "Starting your defense…"}
        </p>
      ) : error && turns.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">{error}</p>
        </div>
      ) : done && turns.length > 0 ? (
        <Card className="p-0">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-base font-medium text-ink">
              Your submission and defense have been recorded.
            </p>
            <p className="text-xs text-muted max-w-sm">
              Your work is reviewed by the hiring team. A human makes the final decision — this is
              one input among several.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-base text-ink">Defend your submission</CardTitle>
            <CardDescription className="text-sm text-ink/80 pt-1">
              Answer each question in your own words. Explain the judgments behind your work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={t.role === "ai" ? "flex justify-start" : "flex justify-end"}
                >
                  <div
                    className={
                      t.role === "ai"
                        ? "max-w-[85%] rounded border border-rule bg-paper-2 px-3 py-2 text-sm text-ink whitespace-pre-line"
                        : "max-w-[85%] rounded bg-ink px-3 py-2 text-sm text-paper whitespace-pre-line"
                    }
                  >
                    {t.text}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type your answer…"
                rows={4}
                disabled={sending}
              />
              <div className="flex justify-end">
                <Button onClick={send} disabled={reply.trim().length === 0 || sending} className="rounded">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
