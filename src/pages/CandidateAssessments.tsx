/**
 * CandidateAssessments (recruiter) — review a candidate's assessment submissions:
 * the raw answer / uploaded artifact / defense transcript, per-skill scores, and
 * integrity flags (artifact strong + defense weak → possible AI-produced). This
 * is the "why", not just the fused TAG.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, AlertTriangle, FileText, Paperclip } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  recruiterAssessmentsApi as api,
  type AssessmentSubmission,
} from "@/services/recruiterAssessmentsApi";

const MODE_LABEL: Record<string, string> = {
  scenario: "Scenario", case: "Case study", work_sample: "Work sample", defense: "Defense round", interview: "Interview",
};

function SubmissionCard({ s }: { s: AssessmentSubmission }) {
  return (
    <div className="bg-paper rounded-xl border border-border shadow-1 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">{MODE_LABEL[s.mode] || s.mode}</span>
        {s.final && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success-soft text-success">final</span>}
        {s.provisional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-paper-3 text-muted">provisional</span>}
      </div>

      {/* integrity flags */}
      {s.integrity_flags?.length > 0 && (
        <div className="rounded border border-warning/40 bg-warning/5 p-3 space-y-1">
          {s.integrity_flags.map((f: any, i: number) => (
            <p key={i} className="text-xs text-warning flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span><strong>{f.skill_name || f.canonical_id}</strong>: {f.note || "integrity flag"} (artifact {f.artifact_value} vs defense {f.defense_value})</span>
            </p>
          ))}
        </div>
      )}

      {/* per-skill scores */}
      {s.claims?.length > 0 && (
        <div className="divide-y divide-rule">
          {s.claims.map((c, i) => (
            <div key={i} className="py-1.5 flex items-center justify-between gap-3">
              <span className="text-sm text-ink">{c.skill_name}</span>
              <span className="font-mono tabular-nums text-xs text-muted">
                {c.value}{typeof c.confidence === "number" ? ` · conf ${c.confidence.toFixed(2)}` : ""}
                {typeof c.extension === "number" ? ` · ext ${c.extension}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* raw response / artifact */}
      {s.raw_response && (
        <div className="border-t border-rule pt-3">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Candidate response</p>
          <p className="text-sm text-ink whitespace-pre-line">{s.raw_response}</p>
        </div>
      )}
      {s.artifact_ref && (
        <p className="text-xs text-muted flex items-center gap-1.5 border-t border-rule pt-3">
          <Paperclip className="h-3.5 w-3.5" /> Artifact: <span className="font-mono break-all">{s.artifact_ref}</span>
        </p>
      )}
    </div>
  );
}

export default function CandidateAssessments() {
  const { candidateId = "" } = useParams();
  const [subs, setSubs] = useState<AssessmentSubmission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getSubmissions(candidateId)
      .then((r) => !cancelled && setSubs(r.submissions || []))
      .catch((e) => !cancelled && setError(e?.message || "Could not load submissions."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [candidateId]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Assessment submissions</span>
        <h1 className="text-2xl font-semibold text-ink mt-1">What the candidate submitted</h1>
        <p className="text-sm text-muted mt-1">Per-mode responses, scores, and integrity flags behind the fused skill graph.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">Loading submissions…</p>
      ) : error ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">{error}</p>
        </div>
      ) : !subs || subs.length === 0 ? (
        <EmptyState title="No assessment submissions yet" description="This candidate hasn't submitted any scenario, case, work-sample, or defense yet." />
      ) : (
        <div className="space-y-4">
          {subs.map((s) => <SubmissionCard key={s.evidence_id} s={s} />)}
        </div>
      )}
    </div>
  );
}
