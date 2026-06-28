/**
 * Practicals (recruiter) — unified-evaluation "practical" flow.
 *
 * One page drives the whole recruiter side: create a practical, generate its
 * assignment (async, polled), invite candidates (copy the registration URL),
 * then per submission plan probes → synthesize → read the DefenseReport.
 *
 * Thin by design — simple setInterval polling, no SSE. Backend shapes live in
 * services/practicalsApi.ts (hand-typed; the routers have no response_model).
 */
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  practicalsApi,
  type Practical,
  type PracticalAssignment,
  type PracticalFormat,
  type Submission,
  type DefenseReport,
  type PracticalInvitation,
} from "@/services/practicalsApi";

const FORMAT_OPTIONS: { value: PracticalFormat; label: string }[] = [
  { value: "case_study", label: "Case study" },
  { value: "assignment", label: "Assignment" },
  { value: "challenge", label: "Challenge" },
  { value: "scenario", label: "Scenario" },
];

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_hire: "Strong hire",
  advance_with_concerns: "Advance with concerns",
  borderline: "Borderline",
  reject: "Reject",
};

export default function Practicals() {
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const prId = currentProject?.id;
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [format, setFormat] = useState<PracticalFormat | "">("");
  const [creating, setCreating] = useState(false);

  const listQuery = useQuery({
    queryKey: ["practicals", wsId, prId],
    queryFn: () => practicalsApi.listPracticals(wsId!, prId!),
    enabled: Boolean(wsId && prId),
  });
  const practicals = listQuery.data ?? [];

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: ["practicals", wsId, prId] });

  async function handleCreate() {
    if (!wsId || !prId || !title.trim() || creating) return;
    setCreating(true);
    try {
      const res = await practicalsApi.createPractical(wsId, prId, {
        title: title.trim(),
        jobDescription: jobDescription.trim(),
        format: format || null,
      });
      toast({ title: "Practical created", description: title.trim() });
      setTitle("");
      setJobDescription("");
      setFormat("");
      await refreshList();
      setSelectedId(res.practicalId);
    } catch (err) {
      toast({
        title: "Could not create practical",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Practicals</h1>
        <p className="text-sm text-muted mt-1">
          Set a practical, generate its assignment, invite candidates, and review their
          defended work end-to-end.
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-ink">Create a practical</CardTitle>
          <CardDescription>Describe the role; we generate the assignment from it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="practical-title">Title</Label>
            <Input
              id="practical-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior tax associate — practical"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practical-jd">Job description</Label>
            <Textarea
              id="practical-jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the role description the assignment should be built from…"
              rows={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practical-format">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as PracticalFormat)}>
              <SelectTrigger id="practical-format" className="max-w-xs">
                <SelectValue placeholder="Choose a format (optional)" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> Create practical
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Your practicals</h2>
        {listQuery.isPending ? (
          <p className="text-sm text-muted py-8 text-center" aria-busy="true">
            Loading practicals…
          </p>
        ) : practicals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No practicals yet"
            description="Create one above to get started."
          />
        ) : (
          <div className="rounded-md border border-rule divide-y divide-rule">
            {practicals.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{p.title}</p>
                  <p className="text-xs text-muted truncate">
                    {p.format || "no format"} · {p.domain || "finance"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AssignmentBadge status={p.assignmentStatus} />
                  <ChevronRight
                    className={`h-4 w-4 text-muted transition-transform ${
                      selectedId === p.id ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedId && wsId && prId && (
        <PracticalDetail
          key={selectedId}
          ws={wsId}
          pr={prId}
          practicalId={selectedId}
          onAssignmentChanged={refreshList}
        />
      )}
    </div>
  );
}

function AssignmentBadge({ status }: { status?: string }) {
  if (status === "ready")
    return (
      <Badge variant="outline" className="text-success border-success/40">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Assignment ready
      </Badge>
    );
  if (status === "generating")
    return (
      <Badge variant="outline" className="text-gold-ink border-rule">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating…
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="outline" className="text-danger border-danger/40">
        <XCircle className="h-3 w-3 mr-1" /> Failed
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted border-rule">
      No assignment
    </Badge>
  );
}

function PracticalDetail({
  ws,
  pr,
  practicalId,
  onAssignmentChanged,
}: {
  ws: string;
  pr: string;
  practicalId: string;
  onAssignmentChanged: () => void;
}) {
  const { toast } = useToast();
  const [practical, setPractical] = useState<Practical | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Invite
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState<PracticalInvitation[]>([]);

  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const assignmentStatus = practical?.assignmentStatus;
  const [brief, setBrief] = useState<PracticalAssignment | null>(null);

  // Pull the generated brief once the assignment is ready, so the recruiter can
  // review exactly what the candidate will see.
  useEffect(() => {
    if (assignmentStatus !== "ready") {
      setBrief(null);
      return;
    }
    let cancelled = false;
    practicalsApi
      .getAssignment(ws, pr, practicalId)
      .then((a) => !cancelled && setBrief(a))
      .catch(() => !cancelled && setBrief(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentStatus, practicalId]);

  async function loadPractical() {
    try {
      const p = await practicalsApi.getPractical(ws, pr, practicalId);
      setPractical(p);
      return p;
    } catch (err) {
      toast({
        title: "Could not load practical",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadSubmissions() {
    setLoadingSubs(true);
    try {
      setSubmissions(await practicalsApi.listSubmissions(ws, pr, practicalId));
    } catch {
      // non-fatal; the list just stays empty
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    loadPractical();
    loadSubmissions();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practicalId]);

  // Poll while the assignment is generating.
  useEffect(() => {
    if (assignmentStatus !== "generating") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const p = await loadPractical();
      // Terminal only on a settled status. The generate endpoint returns 202 and
      // sets assignmentStatus="generating" asynchronously, so a tick that reads the
      // practical before that write must keep polling rather than stop forever.
      if (p && (p.assignmentStatus === "ready" || p.assignmentStatus === "failed")) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        onAssignmentChanged();
        if (p.assignmentStatus === "ready") {
          toast({ title: "Assignment ready", description: p.title });
        } else if (p.assignmentStatus === "failed") {
          toast({
            title: "Assignment generation failed",
            description: (p.assignmentError as string) || "Try generating again.",
            variant: "destructive",
          });
        }
      }
    }, 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentStatus]);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      await practicalsApi.generateAssignment(ws, pr, practicalId);
      setPractical((prev) => (prev ? { ...prev, assignmentStatus: "generating" } : prev));
      onAssignmentChanged();
      toast({ title: "Generating assignment", description: "We'll update this when it's ready." });
    } catch (err) {
      toast({
        title: "Could not start generation",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      const res = await practicalsApi.inviteCandidates(ws, pr, practicalId, [
        { name: inviteName.trim() || inviteEmail.trim(), email: inviteEmail.trim() },
      ]);
      setInvitations((prev) => [...res.invitations, ...prev]);
      setInviteName("");
      setInviteEmail("");
      toast({
        title: "Invitation created",
        description: "Copy the registration link to share it.",
      });
    } catch (err) {
      toast({
        title: "Could not invite",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted py-8 text-center" aria-busy="true">Loading…</p>;
  }
  if (!practical) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-ink">{practical.title}</CardTitle>
        <CardDescription className="whitespace-pre-line">
          {practical.jobDescription || "No job description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Assignment */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Assignment</h3>
              <p className="text-xs text-muted">
                {assignmentStatus === "ready"
                  ? "The understanding map is built. Candidates can be invited now."
                  : assignmentStatus === "generating"
                    ? "Building the assignment and its understanding map…"
                    : assignmentStatus === "failed"
                      ? (practical.assignmentError as string) || "Generation failed. Try again."
                      : "Generate the assignment before inviting candidates."}
              </p>
            </div>
            <AssignmentBadge status={assignmentStatus} />
          </div>
          {assignmentStatus !== "ready" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating || assignmentStatus === "generating"}
            >
              {generating || assignmentStatus === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…
                </>
              ) : assignmentStatus === "failed" ? (
                "Retry generation"
              ) : (
                "Generate assignment"
              )}
            </Button>
          )}
        </section>

        {/* Generated brief — what the candidate will see */}
        {assignmentStatus === "ready" && brief?.task_brief && (
          <section className="space-y-3 border-t border-rule pt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Task the candidate sees</h3>
              {brief.estimated_effort_min ? (
                <span className="text-xs text-muted">~{brief.estimated_effort_min} min</span>
              ) : null}
            </div>
            <div className="rounded-md border border-rule bg-paper-2 p-4 space-y-3">
              <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">
                {brief.task_brief}
              </p>
              {brief.expected_artifacts && brief.expected_artifacts.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-ink mb-1">Candidate submits</p>
                  <ul className="list-disc pl-5 text-sm text-ink/80 space-y-0.5">
                    {brief.expected_artifacts.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Invite */}
        <section className="space-y-3 border-t border-rule pt-6">
          <h3 className="text-sm font-semibold text-ink">Invite candidates</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Name (optional)</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Priya Sharma"
                className="w-48"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="priya@example.com"
                className="w-64"
              />
            </div>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
              {inviting ? "Inviting…" : "Invite"}
            </Button>
          </div>
          {invitations.length > 0 && (
            <div className="space-y-2 pt-1">
              {invitations.map((inv) => (
                <InvitationRow key={inv.invitation_id} invitation={inv} />
              ))}
            </div>
          )}
        </section>

        {/* Submissions */}
        <section className="space-y-3 border-t border-rule pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Submissions</h3>
            <Button variant="ghost" size="sm" onClick={loadSubmissions} disabled={loadingSubs}>
              {loadingSubs ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
          {submissions.length === 0 ? (
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
      </CardContent>
    </Card>
  );
}

function InvitationRow({ invitation }: { invitation: PracticalInvitation }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(invitation.registrationUrl);
      setCopied(true);
      toast({ title: "Link copied", description: invitation.email });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Copy it from the field instead.", variant: "destructive" });
    }
  }

  return (
    <div className="flex items-center gap-2 rounded border border-rule p-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink truncate">{invitation.email}</p>
        <p className="text-[11px] text-muted font-mono truncate">{invitation.registrationUrl}</p>
      </div>
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="ml-1.5">{copied ? "Copied" : "Copy link"}</span>
      </Button>
    </div>
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
