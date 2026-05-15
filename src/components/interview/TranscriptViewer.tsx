/**
 * TranscriptViewer — recruiter-facing view of the full interview conversation.
 *
 * Fetches /api/interview-sessions/{sessionId}/transcript and renders as
 * alternating chat bubbles: AI interviewer on the left, candidate on the
 * right. Plus a "Copy full transcript" button at the top.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

interface TranscriptMessage {
  role: string;
  text: string;
}

interface TranscriptPayload {
  session_id: string;
  interview_id?: string;
  candidate_id?: string;
  started_at?: string;
  completed_at?: string;
  message_count: number;
  messages: TranscriptMessage[];
}

const isAssistant = (role: string) =>
  /^(model|assistant|ai|interviewer|smriti|flowy)$/i.test(role.trim());

const minutesBetween = (start?: string, end?: string): string | null => {
  if (!start || !end) return null;
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
  const mins = Math.round((e - s) / 60000);
  return `${mins}m`;
};

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<TranscriptPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("auth_token");
        const resp = await fetch(
          `${API_BASE_URL}/api/interview-sessions/${sessionId}/transcript`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!resp.ok) {
          throw new Error(
            resp.status === 404
              ? "Transcript not available for this session"
              : `Failed to load transcript (${resp.status})`,
          );
        }
        const json = (await resp.json()) as TranscriptPayload;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const copyAll = async () => {
    if (!data) return;
    const text = data.messages
      .map((m) => `${isAssistant(m.role) ? "Interviewer" : "Candidate"}: ${m.text}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied", description: "Full transcript copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Unable to access clipboard.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card className="p-10 flex items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        {error || "Transcript not available."}
      </Card>
    );
  }

  if (data.messages.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No transcript yet — the candidate may not have started the interview.
      </Card>
    );
  }

  const duration = minutesBetween(data.started_at, data.completed_at);

  return (
    <Card className="overflow-hidden shadow-2">
      {/* Sticky header */}
      <div className="flex items-center justify-between border-b bg-paper-2/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold">Transcript</h3>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {data.message_count} message{data.message_count === 1 ? "" : "s"}
            {duration ? ` · ${duration}` : ""}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={copyAll} aria-label="Copy full transcript">
          {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
          {copied ? "Copied" : "Copy all"}
        </Button>
      </div>

      {/* Scrollable conversation */}
      <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-3 bg-paper-2/40">
        {data.messages.map((m, i) => {
          const ai = isAssistant(m.role);
          return (
            <div
              key={i}
              className={`flex ${ai ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-relaxed shadow-1 ${
                  ai
                    ? "bg-paper border border-rule text-ink"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <div
                  className={`text-[10px] uppercase tracking-wider mb-1 ${
                    ai ? "text-muted" : "text-primary-foreground/70"
                  }`}
                >
                  {ai ? "Interviewer" : "Candidate"}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default TranscriptViewer;
