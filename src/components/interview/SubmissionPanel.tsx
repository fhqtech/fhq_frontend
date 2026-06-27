/**
 * SubmissionPanel — the candidate's submitted work shown alongside the grounded
 * interview. When the AI references a span (submission_reference WS event), that
 * span scrolls into view and highlights. Rendered as pre-wrapped text so char
 * offsets are exact (no markdown reflow); a preview_text substring is the
 * fallback locator when offsets don't resolve.
 */
import { useEffect, useMemo, useRef } from "react";
import type { SubmissionReference } from "@/services/voiceWebSocketClient";

interface Props {
  submissionText: string;
  highlight: SubmissionReference | null;
}

export default function SubmissionPanel({ submissionText, highlight }: Props) {
  const markRef = useRef<HTMLElement | null>(null);
  const text = submissionText || "";

  // Resolve the span: prefer the char range; fall back to a preview_text search.
  const span = useMemo(() => {
    if (!highlight) return null;
    let start = highlight.char_start;
    let end = highlight.char_end;
    const valid = (s?: number, e?: number) =>
      s != null && e != null && s >= 0 && e <= text.length && s < e;
    if (!valid(start, end) && highlight.preview_text) {
      const idx = text.indexOf(highlight.preview_text);
      if (idx >= 0) {
        start = idx;
        end = idx + highlight.preview_text.length;
      }
    }
    return valid(start, end) ? { start: start as number, end: end as number } : null;
  }, [highlight, text]);

  useEffect(() => {
    if (span && markRef.current) {
      markRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [span]);

  const parts = useMemo(() => {
    if (!span) return [{ text, mark: false }];
    return [
      { text: text.slice(0, span.start), mark: false },
      { text: text.slice(span.start, span.end), mark: true },
      { text: text.slice(span.end), mark: false },
    ];
  }, [span, text]);

  return (
    <div className="h-full overflow-y-auto rounded border border-rule bg-paper-2 p-4">
      <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
        Your submission
      </p>
      {text ? (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-ink leading-relaxed">
          {parts.map((p, i) =>
            p.mark ? (
              <mark
                key={i}
                ref={(el) => {
                  markRef.current = el;
                }}
                className="rounded bg-gold/30 px-0.5 transition-colors duration-500"
              >
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </pre>
      ) : (
        <p className="text-sm text-muted">Your submitted work will appear here.</p>
      )}
    </div>
  );
}
