import { useEffect, useState } from "react";

/** The recruiter monitor snapshot streamed per defense turn (see backend
 * monitor_snapshot.build_active_probe recruiter variant). Fields fill in as the
 * later slices land (coverage/diff/rubric); BS4 renders whatever is present. */
export interface MonitorSnapshot {
  interview_id?: string;
  ts?: string;
  skill_label?: string;
  question_index?: number;
  question_total?: number;
  submission_reference?: {
    section_id?: string;
    preview_text?: string;
    reason?: string;
  };
  probe_question?: string;
  target_concept?: string;
  rationale?: string;
  depth?: string;
  cheat_score?: number;
  cheat_signals?: string[];
  coverage?: { defended?: string[]; hollow?: string[]; unprobed?: string[] };
  model_answer?: string;
  expected_vs_submitted_diff?: unknown;
  authenticity_verdict?: string;
}

export type MonitorStatus = "connecting" | "waiting" | "live" | "closed";

export interface MonitorState {
  snapshot: MonitorSnapshot | null;
  status: MonitorStatus;
}

/**
 * Subscribe a recruiter to a defense interview's live monitor SSE. Read-only,
 * workspace-ownership gated on the server. Uses the recruiter JWT (`auth_token`)
 * — never a candidate token.
 */
export function useInterviewMonitor(interviewId: string | null | undefined): MonitorState {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [status, setStatus] = useState<MonitorStatus>("connecting");

  useEffect(() => {
    if (!interviewId) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
    const url =
      `${apiBase}/api/interviews/${encodeURIComponent(interviewId)}/monitor/events` +
      `?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    const onData = (e: MessageEvent) => {
      try {
        setSnapshot(JSON.parse(e.data));
        setStatus("live");
      } catch {
        /* ignore malformed frame */
      }
    };
    es.addEventListener("snapshot", onData as EventListener);
    es.addEventListener("update", onData as EventListener);
    es.addEventListener("waiting", () => setStatus((s) => (s === "live" ? s : "waiting")));
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) setStatus("closed");
    };

    return () => es.close();
  }, [interviewId]);

  return { snapshot, status };
}
