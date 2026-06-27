/**
 * CandidateInterviewWorkSample — the candidate submits the work sample folded
 * into an interview they're already invited to. Unlike CandidatePracticalSubmit
 * there is no token / accept step: the invitation already links the candidate
 * to this interview, so we open a submission directly against the interview id
 * (passed to the practical submission routes in the {practical_id} slot).
 *
 * `ws` / `pr` arrive as query params from the dashboard card. Flow:
 *   startSubmission(ws, pr, interviewId)
 *     → uploadArtifact(file)
 *     → submitArtifact(ws, pr, interviewId, submissionId, {...})
 *     → /candidate/practical-defense/:submissionId
 *
 * Per CR-04 nothing here shows a score — only the task and confirmations.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Upload, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { practicalDefenseApi, uploadArtifact } from "@/services/practicalDefenseApi";

export default function CandidateInterviewWorkSample() {
  const { interviewId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ws = searchParams.get("ws") || "";
  const pr = searchParams.get("pr") || "";
  const ready = Boolean(interviewId && ws && pr);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [artifactRef, setArtifactRef] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approachNote, setApproachNote] = useState("");
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setArtifactRef(await uploadArtifact(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload your file.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!ready || !submissionId || !artifactRef || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await practicalDefenseApi.submitArtifact(ws, pr, interviewId, submissionId, {
        artifact_refs: [artifactRef],
        provenance: { ai_tools_disclosed: [], approach_note: approachNote.trim() },
      });
      navigate(`/candidate/practical-defense/${submissionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your work.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {!ready ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">This work sample link is missing some details.</p>
          <Button variant="outline" onClick={() => navigate("/candidate/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      ) : (
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-base text-ink">Your work sample</CardTitle>
            <CardDescription className="text-sm text-ink/80 pt-1">
              Upload your deliverable and a short note on your approach. After you submit, you'll
              defend your key choices in a short conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {starting && !submissionId ? (
              <p className="text-sm text-muted" aria-busy="true">
                Preparing your submission…
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Deliverable</Label>
                  <label className="flex items-center justify-center gap-2 rounded border border-dashed border-rule p-6 cursor-pointer hover:bg-paper-2 text-sm text-ink">
                    {artifactRef ? (
                      <>
                        <FileCheck className="h-4 w-4 text-success" /> File uploaded — choose another
                        to replace
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading…" : "Upload your deliverable (PDF or DOCX)"}
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={onFile}
                      disabled={uploading || submitting}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="approach-note">Approach note</Label>
                  <Textarea
                    id="approach-note"
                    value={approachNote}
                    onChange={(e) => setApproachNote(e.target.value)}
                    placeholder="Briefly describe how you approached the task and the key judgments you made…"
                    rows={6}
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                    <AlertCircle className="h-3.5 w-3.5" /> {error}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={submit}
                    disabled={!artifactRef || !submissionId || submitting}
                    className="rounded"
                  >
                    {submitting ? "Submitting…" : "Submit and start defense"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
