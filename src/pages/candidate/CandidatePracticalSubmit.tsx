/**
 * CandidatePracticalSubmit — a candidate accepts a practical invitation,
 * uploads their deliverable, notes their approach, and submits. On submit we
 * route to the defense chat. Token-gated route; the page requires the
 * candidate to be signed in to accept (CandidateAuthContext).
 *
 * Per CR-04 nothing here shows a score — only the task and confirmations.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import {
  practicalDefenseApi,
  uploadArtifact,
  type PracticalInvitationView,
} from "@/services/practicalDefenseApi";
import { SubmissionWorkspace } from "@/components/practicals/SubmissionWorkspace";
import { clearDraft } from "@/lib/submissionDraft";
import type { InterviewAssignmentBrief } from "@/services/journeysApi";

export default function CandidatePracticalSubmit() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useCandidateAuth();

  const [invitation, setInvitation] = useState<PracticalInvitationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Adapt the invitation's brief to the shared workspace shape. The practical-
  // invitation endpoint carries the basic fields; the rest default empty.
  const brief = useMemo<InterviewAssignmentBrief | null>(() => {
    const a = invitation?.assignment;
    if (!a) return null;
    return {
      interview_id: invitation.practicalId,
      task_brief: a.task_brief ?? null,
      expected_artifacts: a.expected_artifacts ?? [],
      expected_artifacts_structured: [],
      exhibits: [],
      estimated_effort_min: a.estimated_effort_min ?? null,
      time_limit_min: null,
      deadline_at: null,
      rubric_public: [],
    };
  }, [invitation]);

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

  async function handleSubmit({
    files,
    notes,
    aiDisclosed,
  }: {
    files: File[];
    notes: string;
    aiDisclosed: boolean;
  }) {
    if (!invitation || !submissionId || submitting || files.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const refs: string[] = [];
      for (const f of files) refs.push(await uploadArtifact(f));
      await practicalDefenseApi.submitArtifact(
        invitation.workspaceId,
        invitation.projectId,
        invitation.practicalId,
        submissionId,
        {
          artifact_refs: refs,
          provenance: {
            ai_tools_disclosed: [],
            approach_note: notes.trim(),
            own_work_attested: aiDisclosed,
          },
        },
      );
      clearDraft(invitation.practicalId);
      navigate(`/candidate/practical-defense/${submissionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your work.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
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
        starting && !submissionId ? (
          <p className="text-sm text-muted" aria-busy="true">
            Preparing your submission…
          </p>
        ) : (
          <>
            <header className="mb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">
                Practical
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                {invitation.title || "Your practical"}
              </h1>
              <p className="mt-1 text-sm text-ink-soft">
                Work through the brief on the left and submit your deliverables on the right. After
                you submit, you'll defend your key choices in a short conversation.
              </p>
            </header>
            <SubmissionWorkspace
              brief={brief}
              draftKey={invitation.practicalId}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          </>
        )
      ) : (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <CheckCircle2 className="h-5 w-5 text-muted" />
          <p className="text-sm text-ink">This practical is not available.</p>
        </div>
      )}
    </div>
  );
}
