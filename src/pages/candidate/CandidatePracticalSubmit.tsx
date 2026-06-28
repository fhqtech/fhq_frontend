/**
 * CandidatePracticalSubmit — a candidate accepts a practical invitation,
 * uploads their deliverable, notes their approach, and submits. On submit we
 * route to the defense chat. Token-gated route; the page requires the
 * candidate to be signed in to accept (CandidateAuthContext).
 *
 * Per CR-04 nothing here shows a score — only the task and confirmations.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Upload, CheckCircle2, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import {
  practicalDefenseApi,
  uploadArtifact,
  type PracticalInvitationView,
} from "@/services/practicalDefenseApi";

export default function CandidatePracticalSubmit() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useCandidateAuth();

  const [invitation, setInvitation] = useState<PracticalInvitationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [artifactRef, setArtifactRef] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approachNote, setApproachNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load the invitation (public).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    practicalDefenseApi
      .getInvitation(token)
      .then((inv) => !cancelled && setInvitation(inv))
      .catch((e) => !cancelled && setError(e?.message || "Could not load this invitation."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Once signed in + invitation loaded, accept it and open a submission.
  useEffect(() => {
    if (!invitation || !isAuthenticated || submissionId || starting) return;
    let cancelled = false;
    setStarting(true);
    (async () => {
      try {
        await practicalDefenseApi.acceptInvitation(token);
        const res = await practicalDefenseApi.startSubmission(
          invitation.workspaceId,
          invitation.projectId,
          invitation.practicalId,
        );
        if (!cancelled) setSubmissionId(res.submission_id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not start your submission.");
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, isAuthenticated, submissionId]);

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
    if (!invitation || !submissionId || !artifactRef || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await practicalDefenseApi.submitArtifact(
        invitation.workspaceId,
        invitation.projectId,
        invitation.practicalId,
        submissionId,
        {
          artifact_refs: [artifactRef],
          provenance: { ai_tools_disclosed: [], approach_note: approachNote.trim() },
        },
      );
      navigate(`/candidate/practical-defense/${submissionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your work.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {loading || authLoading ? (
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">
          Loading your task…
        </p>
      ) : error && !invitation ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">{error}</p>
        </div>
      ) : !isAuthenticated ? (
        <Card className="p-0">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm text-ink">Sign in to start this practical.</p>
            <Button
              onClick={() => {
                // Stash the return URL in sessionStorage too: React Router state
                // is destroyed by the Google OAuth full-page redirect, so the
                // stash is the only thing that survives the round-trip back here.
                try {
                  sessionStorage.setItem(
                    "candidate_post_login_redirect",
                    `/practical-register/${token}`,
                  );
                } catch {
                  /* private mode — state.from still covers the email path */
                }
                navigate("/candidate/login", { state: { from: `/practical-register/${token}` } });
              }}
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      ) : invitation ? (
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-base text-ink">
              {invitation.title || "Your practical"}
            </CardTitle>
            <CardDescription className="text-sm text-ink/80 pt-1">
              Read the task, then upload your deliverable and a short note on your approach. After
              you submit, you'll defend your key choices in a short conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {invitation.assignment?.task_brief && (
              <div className="rounded-md border border-rule bg-paper-2 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono uppercase tracking-[0.14em] text-[10px] text-gold-ink">
                    Your task
                  </p>
                  {invitation.assignment.estimated_effort_min ? (
                    <span className="text-xs text-muted">
                      ~{invitation.assignment.estimated_effort_min} min
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">
                  {invitation.assignment.task_brief}
                </p>
                {invitation.assignment.expected_artifacts &&
                invitation.assignment.expected_artifacts.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-ink mb-1">What to submit</p>
                    <ul className="list-disc pl-5 text-sm text-ink/80 space-y-0.5">
                      {invitation.assignment.expected_artifacts.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
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
      ) : (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <CheckCircle2 className="h-5 w-5 text-muted" />
          <p className="text-sm text-ink">This practical is not available.</p>
        </div>
      )}
    </div>
  );
}
