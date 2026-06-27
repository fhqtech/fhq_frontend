/**
 * WorkSampleSubmissions — recruiter-side submissions list + per-submission
 * probe / synthesize / report controls for a single practical.
 *
 * Shared between the standalone Practicals page and the "work sample folded
 * into an interview" panel on InterviewDetails. For the interview variant the
 * caller passes the interview's id as `practicalId` — the backend submission /
 * report routes accept an interview id in the {practical_id} path slot.
 *
 * Rendering + flow mirror Practicals.tsx (SubmissionRow + ReportView) so both
 * surfaces stay visually identical; this module is the single source of truth.
 */
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  practicalsApi,
  type Submission,
  type DefenseReport,
} from "@/services/practicalsApi";

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_hire: "Strong hire",
  advance_with_concerns: "Advance with concerns",
  borderline: "Borderline",
  reject: "Reject",
};

export function WorkSampleSubmissions({
  ws,
  pr,
  practicalId,
}: {
  ws: string;
  pr: string;
  practicalId: string;
}) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSubmissions() {
    setLoading(true);
    try {
      setSubmissions(await practicalsApi.listSubmissions(ws, pr, practicalId));
    } catch {
      // non-fatal; the list just stays empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, pr, practicalId]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Work-sample submissions</h3>
        <Button variant="ghost" size="sm" onClick={loadSubmissions} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {loading && submissions.length === 0 ? (
        <p className="text-xs text-muted" aria-busy="true">
          Loading submissions…
        </p>
      ) : submissions.length === 0 ? (
        <p className="text-xs text-muted">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <SubmissionRow
              key={s.submission_id}
              ws={ws}
              pr={pr}
              practicalId={practicalId}
              submission={s}
              onSubmissionChanged={loadSubmissions}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SubmissionRow({
  ws,
  pr,
  practicalId,
  submission,
  onSubmissionChanged,
}: {
  ws: string;
  pr: string;
  practicalId: string;
  submission: Submission;
  onSubmissionChanged: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "probe" | "synthesize" | "report">(null);
  const [report, setReport] = useState<DefenseReport | null>(null);

  async function fetchReport() {
    return practicalsApi.getReport(ws, pr, practicalId, submission.submission_id);
  }

  async function planProbes() {
    setBusy("probe");
    try {
      const res = await practicalsApi.planProbes(ws, pr, practicalId, submission.submission_id);
      toast({
        title: "Probes planned",
        description: `${res.probeCount} probes · grounding ${(res.groundingRate * 100).toFixed(0)}%`,
      });
    } catch (err) {
      toast({
        title: "Could not plan probes",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function synthesize() {
    setBusy("synthesize");
    try {
      const res = await practicalsApi.synthesize(ws, pr, practicalId, submission.submission_id);
      toast({
        title: "Report synthesized",
        description: `Score ${res.overallScore} · ${
          RECOMMENDATION_LABELS[res.recommendation] || res.recommendation
        }`,
      });
      // Refresh the row so its status reflects report_ready, then auto-open the report.
      onSubmissionChanged();
      try {
        setReport(await fetchReport());
      } catch {
        // non-fatal; the recruiter can still open it with "View report".
      }
    } catch (err) {
      toast({
        title: "Could not synthesize",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function viewReport() {
    setBusy("report");
    try {
      setReport(await fetchReport());
    } catch (err) {
      toast({
        title: "Could not load report",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded border border-rule p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-ink truncate">{submission.submission_id}</p>
          <p className="text-[11px] text-muted">
            candidate {submission.candidate_id} · {submission.status}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={planProbes} disabled={busy !== null}>
            {busy === "probe" ? "Planning…" : "Plan probes"}
          </Button>
          <Button variant="outline" size="sm" onClick={synthesize} disabled={busy !== null}>
            {busy === "synthesize" ? "Synthesizing…" : "Synthesize"}
          </Button>
          <Button variant="ghost" size="sm" onClick={viewReport} disabled={busy !== null}>
            {busy === "report" ? "Loading…" : "View report"}
          </Button>
        </div>
      </div>

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: DefenseReport }) {
  return (
    <div className="rounded bg-paper-2 border border-rule p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-mono tabular-nums text-lg font-semibold text-ink">
          {report.overall_score}
        </span>
        <Badge variant="outline" className="text-ink border-rule">
          {RECOMMENDATION_LABELS[report.recommendation] || report.recommendation}
        </Badge>
        <span className="text-[11px] text-muted ml-auto">
          grounding {(report.grounding_rate * 100).toFixed(0)}%
        </span>
      </div>

      <div className="space-y-2">
        {report.concept_verdicts.map((v) => (
          <div key={v.concept} className="border-t border-rule pt-2 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              {v.understood ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-danger shrink-0" />
              )}
              <span className="text-xs font-medium text-ink">{v.concept}</span>
              <span className="text-[11px] font-mono tabular-nums text-muted ml-auto">
                {v.score}
              </span>
            </div>
            {v.evidence_quote && (
              <p className="text-[11px] text-muted italic pl-5 mt-1">“{v.evidence_quote}”</p>
            )}
            {v.note && <p className="text-[11px] text-muted pl-5 mt-0.5">{v.note}</p>}
          </div>
        ))}
      </div>

      {report.integrity_flags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule pt-2">
          <AlertCircle className="h-3.5 w-3.5 text-warning" />
          {report.integrity_flags.map((f) => (
            <Badge key={f} variant="outline" className="text-warning border-warning/40 text-[11px]">
              {f}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
