import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDropzone } from "./FileDropzone";
import { MarkdownNotes } from "./MarkdownNotes";
import { CountdownBadge } from "./CountdownBadge";
import { useSubmissionTimer } from "./useSubmissionTimer";
import { saveDraft, loadDraft } from "@/lib/submissionDraft";
import type { InterviewAssignmentBrief } from "@/services/journeysApi";

export interface SubmissionWorkspaceProps {
  brief: InterviewAssignmentBrief | null;
  draftKey: string;
  onSubmit: (payload: { files: File[]; notes: string; aiDisclosed: boolean }) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

const DEFAULT_ACCEPT = [".pdf", ".docx", ".xlsx", ".csv"];

/**
 * Split-view case submission: the brief stays visible (left) while the
 * candidate works (right), with multi-file upload, markdown notes, an optional
 * countdown, autosave, and a review-before-submit gate. Fixes the interview-
 * folded work sample that showed no problem statement at all.
 */
export function SubmissionWorkspace({
  brief,
  draftKey,
  onSubmit,
  submitting = false,
  error,
}: SubmissionWorkspaceProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [aiDisclosed, setAiDisclosed] = useState(false);
  const [phase, setPhase] = useState<"work" | "review">("work");
  const [deadline, setDeadline] = useState<number | null>(null);

  // Restore an autosaved draft once on mount.
  useEffect(() => {
    const d = loadDraft(draftKey);
    if (d) {
      setNotes(d.notes);
      setAiDisclosed(d.aiDisclosed);
    }
  }, [draftKey]);

  // Resolve the deadline once the brief loads. Absolute deadline_at is
  // refresh-safe as-is; a time_limit_min sprint anchors to a persisted deadline
  // (stored in the draft) so a reload can't reset the clock.
  const deadlineInit = useRef(false);
  useEffect(() => {
    if (!brief || deadlineInit.current) return;
    deadlineInit.current = true;
    if (brief.deadline_at) {
      const t = Date.parse(brief.deadline_at);
      setDeadline(Number.isNaN(t) ? null : t);
      return;
    }
    if (brief.time_limit_min) {
      const saved = loadDraft(draftKey);
      const d = saved?.deadline ?? Date.now() + brief.time_limit_min * 60_000;
      setDeadline(d);
    }
  }, [brief, draftKey]);

  // Autosave the text answer + the anchored deadline (files can't be persisted).
  useEffect(() => {
    saveDraft(draftKey, { notes, aiDisclosed, deadline });
  }, [draftKey, notes, aiDisclosed, deadline]);

  const requiredArtifacts = (brief?.expected_artifacts_structured || []).filter((a) => a.required);
  const accept = useMemo(() => {
    const fromBrief = (brief?.expected_artifacts_structured || []).flatMap((a) => a.accept || []);
    return fromBrief.length ? Array.from(new Set(fromBrief)) : DEFAULT_ACCEPT;
  }, [brief]);

  const metCount = Math.min(files.length, requiredArtifacts.length);
  const allRequiredMet = requiredArtifacts.length === 0 ? files.length > 0 : metCount >= requiredArtifacts.length;
  const canSubmit = allRequiredMet && aiDisclosed && !submitting;

  async function handleSubmit() {
    if (submitting || files.length === 0) return;
    await onSubmit({ files, notes, aiDisclosed });
  }

  // Auto-submit the current draft when a timed sprint runs out.
  useSubmissionTimer(deadline, () => {
    if (files.length > 0 && !submitting) void handleSubmit();
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left — the case, always visible */}
      <section className="min-w-0">
        <Tabs defaultValue="brief">
          <TabsList>
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="data">Data &amp; resources</TabsTrigger>
            <TabsTrigger value="evaluate">What we're evaluating</TabsTrigger>
            <TabsTrigger value="time">Time &amp; rules</TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="pt-3">
            {brief?.task_brief ? (
              <p className="whitespace-pre-wrap text-sm text-ink">{brief.task_brief}</p>
            ) : (
              <p className="text-sm text-muted">No brief provided for this task.</p>
            )}
            {brief?.expected_artifacts?.length ? (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">What to submit</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                  {brief.expected_artifacts.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="data" className="pt-3">
            {brief?.exhibits?.length ? (
              <ul className="divide-y divide-rule">
                {brief.exhibits.map((e, i) => (
                  <li key={i} className="py-2 text-sm">
                    <span className="text-ink">{e.label}</span>
                    {e.description ? <span className="text-muted"> — {e.description}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No data files for this task.</p>
            )}
          </TabsContent>

          <TabsContent value="evaluate" className="pt-3">
            {brief?.rubric_public?.length ? (
              <ul className="list-disc pl-5 text-sm text-ink-soft">
                {brief.rubric_public.map((c, i) => (
                  <li key={i}>{c.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Evaluation criteria aren't listed for this task.</p>
            )}
          </TabsContent>

          <TabsContent value="time" className="pt-3 text-sm text-ink-soft">
            {brief?.time_limit_min ? (
              <p>Timed: <span className="font-mono tabular-nums">{brief.time_limit_min}</span> minutes once you begin.</p>
            ) : brief?.deadline_at ? (
              <p>Submit by the deadline. Your work autosaves as you go.</p>
            ) : (
              <p>Take your time — there's no countdown. Your work autosaves as you go.</p>
            )}
            {brief?.estimated_effort_min ? (
              <p className="mt-1 text-muted">Estimated effort: {brief.estimated_effort_min} minutes.</p>
            ) : null}
          </TabsContent>
        </Tabs>
      </section>

      {/* Right — the answer */}
      <section className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Your work</h2>
          <CountdownBadge remainingMs={deadline == null ? null : Math.max(0, deadline - Date.now())} />
        </div>

        {phase === "work" ? (
          <>
            <FileDropzone files={files} onChange={setFiles} accept={accept} disabled={submitting} />
            <MarkdownNotes value={notes} onChange={setNotes} maxWords={800} />
            <div className="flex justify-end">
              <Button type="button" onClick={() => setPhase("review")} disabled={files.length === 0}>
                Review submission
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">Before you submit</p>
              <ul className="mt-2 space-y-1">
                {requiredArtifacts.length ? (
                  requiredArtifacts.map((a, i) => {
                    const met = i < files.length;
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        {met ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted" />
                        )}
                        <span className={met ? "text-ink" : "text-muted"}>{a.label}</span>
                      </li>
                    );
                  })
                ) : (
                  <li className="flex items-center gap-2 text-sm">
                    {files.length > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted" />
                    )}
                    <span className="text-ink">At least one deliverable</span>
                  </li>
                )}
              </ul>
              {!allRequiredMet && (
                <p className="mt-2 text-xs text-muted">Upload every required deliverable to submit.</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-ink-soft">
              <Checkbox checked={aiDisclosed} onCheckedChange={(v) => setAiDisclosed(Boolean(v))} />
              <span>This is my own work and I've disclosed any AI tools I used.</span>
            </label>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-danger" role="alert">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setPhase("work")} disabled={submitting}>
                Back
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? "Submitting…" : "Submit and start defense"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
