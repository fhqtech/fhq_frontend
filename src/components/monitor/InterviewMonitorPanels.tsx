import type { MonitorSnapshot, MonitorStatus } from "@/hooks/useInterviewMonitor";

export interface InterviewMonitorPanelsProps {
  snapshot: MonitorSnapshot | null;
  status: MonitorStatus;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-ink">{children}</p>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-rule bg-paper p-3">
      <Kicker>{title}</Kicker>
      <div className="mt-2 text-sm text-ink">{children}</div>
    </section>
  );
}

/**
 * Recruiter-only live monitor panels (BS4). Renders whatever the current
 * monitor snapshot carries — the active probe, the source excerpt (with the
 * agent's rationale, which the candidate never sees), coverage, model answer,
 * expected-vs-submitted diff and advisory authenticity. Coverage/diff/model
 * fill in as BS5/BS6 land. Advisory only — no reject action here.
 */
export function InterviewMonitorPanels({ snapshot, status }: InterviewMonitorPanelsProps) {
  if (!snapshot) {
    return (
      <p className="text-sm text-muted" aria-busy={status !== "closed"}>
        {status === "waiting"
          ? "Connected — waiting for the first defense turn…"
          : status === "closed"
            ? "The monitor stream closed."
            : "Connecting to the live interview…"}
      </p>
    );
  }

  const s = snapshot;
  const cov = s.coverage;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <Kicker>now discussing</Kicker>
        <span className="text-sm font-semibold text-ink">{s.skill_label || "—"}</span>
        {typeof s.question_total === "number" && s.question_total > 0 && (
          <span className="font-mono text-xs tabular-nums text-muted">
            · question {s.question_index} of {s.question_total}
          </span>
        )}
        {s.depth && <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-soft">depth: {s.depth}</span>}
      </header>

      <Panel title="Active probe">
        <p>{s.probe_question || "—"}</p>
        {s.target_concept && <p className="mt-1 text-xs text-muted">Concept: {s.target_concept}</p>}
        {s.rationale && <p className="mt-1 text-xs text-ink-soft">Why: {s.rationale}</p>}
      </Panel>

      {s.submission_reference?.preview_text && (
        <Panel title="Source excerpt">
          <p className="whitespace-pre-wrap text-sm text-ink-soft">{s.submission_reference.preview_text}</p>
        </Panel>
      )}

      {s.model_answer && (
        <Panel title="Model answer">
          <p className="whitespace-pre-wrap text-ink-soft">{s.model_answer}</p>
        </Panel>
      )}

      {s.expected_vs_submitted_diff && (
        <Panel title="Expected vs submitted">
          <div className="flex flex-wrap items-center gap-2">
            {typeof s.expected_vs_submitted_diff.target_level === "number" && (
              <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-soft">
                target L{s.expected_vs_submitted_diff.target_level}
              </span>
            )}
            {typeof s.expected_vs_submitted_diff.grounding_ratio === "number" && (
              <span
                className={
                  "font-mono text-xs tabular-nums " +
                  (s.expected_vs_submitted_diff.flag ? "text-danger" : "text-success")
                }
              >
                grounding {(s.expected_vs_submitted_diff.grounding_ratio * 100).toFixed(0)}%
              </span>
            )}
            {s.expected_vs_submitted_diff.flag && (
              <span className="text-xs text-danger">sounds hollow vs the model answer</span>
            )}
          </div>
          {s.expected_vs_submitted_diff.model_answer && (
            <p className="mt-2 text-xs text-ink-soft">
              <span className="text-muted">Model:</span> {s.expected_vs_submitted_diff.model_answer}
            </p>
          )}
          {s.expected_vs_submitted_diff.submitted && (
            <p className="mt-1 text-xs text-ink-soft">
              <span className="text-muted">Said:</span> {s.expected_vs_submitted_diff.submitted}
            </p>
          )}
        </Panel>
      )}

      {cov && (cov.defended?.length || cov.hollow?.length || cov.unprobed?.length) ? (
        <Panel title="Coverage">
          <ul className="space-y-1 text-xs">
            <li><span className="text-success">Defended:</span> {(cov.defended || []).join(", ") || "—"}</li>
            <li><span className="text-danger">Hollow:</span> {(cov.hollow || []).join(", ") || "—"}</li>
            <li><span className="text-muted">Unprobed:</span> {(cov.unprobed || []).join(", ") || "—"}</li>
          </ul>
        </Panel>
      ) : null}

      <Panel title="Authenticity (advisory)">
        <p className="text-sm">
          {s.authenticity_verdict ? (
            <span className="text-ink">{s.authenticity_verdict.replace(/_/g, " ")}</span>
          ) : (
            <span className="text-muted">no verdict yet</span>
          )}
          {typeof s.cheat_score === "number" && (
            <span className="ml-2 font-mono text-xs tabular-nums text-muted">cheat score {s.cheat_score.toFixed(2)}</span>
          )}
        </p>
        {s.cheat_signals?.length ? (
          <ul className="mt-1 list-disc pl-4 text-xs text-ink-soft">
            {s.cheat_signals.map((sig, i) => (
              <li key={i}>{sig}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-1 text-[11px] text-muted">Advisory only — never an automatic decision.</p>
      </Panel>
    </div>
  );
}
