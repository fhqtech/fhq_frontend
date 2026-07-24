/**
 * CandidateInterviewWorkSample — the candidate submits the work sample folded
 * into an interview they're already invited to. Unlike CandidatePracticalSubmit
 * there is no token / accept step: the invitation already links the candidate
 * to this interview, so we open a submission directly against the interview id
 * (passed to the practical submission routes in the {practical_id} slot).
 *
 * `ws` / `pr` arrive as query params from the dashboard card. Flow:
 *   startSubmission(ws, pr, interviewId) + getInterviewAssignment(interviewId)
 *     → SubmissionWorkspace (brief left, multi-file + notes + review right)
 *     → uploadArtifact per file → submitArtifact(...)
 *     → /candidate/practical-defense/:submissionId
 *
 * Per CR-04 nothing here shows a score — only the task and confirmations.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { practicalDefenseApi, uploadArtifact } from "@/services/practicalDefenseApi";
import { journeysApi, type InterviewAssignmentBrief } from "@/services/journeysApi";
import { SubmissionWorkspace } from "@/components/practicals/SubmissionWorkspace";
import { clearDraft } from "@/lib/submissionDraft";

export default function CandidateInterviewWorkSample() {
  const { interviewId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ws = searchParams.get("ws") || "";
  const pr = searchParams.get("pr") || "";
  const ready = Boolean(interviewId && ws && pr);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [brief, setBrief] = useState<InterviewAssignmentBrief | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open a submission directly against the interview — no token / accept step.
  useEffect(() => {
    if (!ready || submissionId || starting) return;
    let cancelled = false;
    setStarting(true);
    (async () => {
      try {
        const res = await practicalDefenseApi.startSubmission(ws, pr, interviewId);
        if (!cancelled) setSubmissionId(res.submission_id);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not start your submission.");
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, submissionId]);

  // Fetch the brief so the candidate can SEE the case while they work.
  // Best-effort — a missing brief just shows the answer side.
  useEffect(() => {
    if (!interviewId) return;
    let cancelled = false;
    journeysApi
      .getInterviewAssignment(interviewId)
      .then((b) => {
        if (!cancelled) setBrief(b);
      })
      .catch(() => {
        /* no brief for this interview — the answer side still renders */
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  async function handleSubmit({
    files,
    notes,
    aiDisclosed,
  }: {
    files: File[];
    notes: string;
    aiDisclosed: boolean;
  }) {
    if (!ready || !submissionId || submitting || files.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const refs: string[] = [];
      for (const f of files) refs.push(await uploadArtifact(f));
      await practicalDefenseApi.submitArtifact(ws, pr, interviewId, submissionId, {
        // Persist the own-work acknowledgement the candidate ticked at review.
        // Specific AI tool-name capture is a follow-up, so the list stays empty.
        artifact_refs: refs,
        provenance: {
          ai_tools_disclosed: [],
          approach_note: notes.trim(),
          own_work_attested: aiDisclosed,
        },
      });
      clearDraft(interviewId);
      navigate(`/candidate/practical-defense/${submissionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your work.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="flex flex-col items-center gap-2 py-12 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">This work sample link is missing some details.</p>
          <Button variant="outline" onClick={() => navigate("/candidate/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">Work sample</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Complete the case</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Work through the brief on the left and submit your deliverables on the right. After you
          submit, you'll defend your key choices in a short conversation.
        </p>
      </header>

      {starting && !submissionId ? (
        <p className="text-sm text-muted" aria-busy="true">
          Preparing your submission…
        </p>
      ) : (
        <SubmissionWorkspace
          brief={brief}
          draftKey={interviewId}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </div>
  );
}
