import { useParams } from "react-router-dom";
import { useInterviewMonitor } from "@/hooks/useInterviewMonitor";
import { InterviewMonitorPanels } from "@/components/monitor/InterviewMonitorPanels";

/**
 * Recruiter-only live monitor for a defense interview (BS4). Read-only over the
 * SSE stream; workspace-ownership gated on the server. Everything here — rubric,
 * model answer, rationale, coverage, authenticity — is candidate-forbidden and
 * only reaches this recruiter surface, never the candidate's WS.
 */
export default function InterviewMonitor() {
  const { interviewId = "" } = useParams();
  const { snapshot, status } = useInterviewMonitor(interviewId);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">Live monitor</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Defense interview</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Read-only. The candidate never sees the rubric, model answer, or rationale shown here.
        </p>
      </header>
      <InterviewMonitorPanels snapshot={snapshot} status={status} />
    </div>
  );
}
