import { useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  practicalsApi,
  type PracticalAssignment,
  type PracticalFormat,
} from "@/services/practicalsApi";

export interface AssignmentBuilderProps {
  ws: string;
  pr: string;
  practicalId: string;
}

type Phase = "idle" | "generating" | "ready" | "failed" | "inviting" | "invited";

const FORMATS: { value: PracticalFormat; label: string }[] = [
  { value: "case_study", label: "Case study" },
  { value: "assignment", label: "Assignment" },
  { value: "challenge", label: "Challenge" },
  { value: "scenario", label: "Scenario" },
];

/**
 * Recruiter authoring surface for a role's work-sample assignment: generate the
 * brief, poll until it's ready, review it, then invite. Nothing reaches a
 * candidate without this human review. (Inline editing of the generated brief
 * needs a backend update endpoint — a follow-up.)
 */
export function AssignmentBuilder({ ws, pr, practicalId }: AssignmentBuilderProps) {
  const [format, setFormat] = useState<PracticalFormat>("case_study");
  const [phase, setPhase] = useState<Phase>("idle");
  const [brief, setBrief] = useState<PracticalAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function poll() {
    try {
      const p = await practicalsApi.getPractical(ws, pr, practicalId);
      if (p.assignmentStatus === "ready") {
        setBrief(await practicalsApi.getAssignment(ws, pr, practicalId));
        setPhase("ready");
      } else if (p.assignmentStatus === "failed") {
        setError(p.assignmentError || "Generation failed. Try again.");
        setPhase("failed");
      } else {
        pollTimer.current = setTimeout(poll, 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the assignment.");
      setPhase("failed");
    }
  }

  async function generate() {
    setError(null);
    setPhase("generating");
    try {
      await practicalsApi.generateAssignment(ws, pr, practicalId);
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start generation.");
      setPhase("failed");
    }
  }

  async function invite() {
    if (!email.trim()) return;
    setPhase("inviting");
    setError(null);
    try {
      await practicalsApi.inviteCandidates(ws, pr, practicalId, [
        { name: name.trim() || email.split("@")[0], email: email.trim() },
      ]);
      setPhase("invited");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not invite.");
      setPhase("ready");
    }
  }

  return (
    <section className="space-y-4 rounded-md border border-rule bg-paper p-4">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">Assignment</p>
        <h3 className="mt-1 text-sm font-semibold text-ink">Author the work-sample case</h3>
      </header>

      {(phase === "idle" || phase === "failed") && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assignment-format">Format</Label>
            <select
              id="assignment-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as PracticalFormat)}
              className="rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={generate}>
            {phase === "failed" ? "Try again" : "Generate assignment"}
          </Button>
        </div>
      )}

      {phase === "generating" && (
        <p className="flex items-center gap-2 text-sm text-muted" aria-busy="true">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating the case…
        </p>
      )}

      {(phase === "ready" || phase === "inviting" || phase === "invited") && brief && (
        <div className="space-y-4">
          <div className="rounded-md border border-rule bg-paper-2 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">Preview</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{brief.task_brief}</p>
            {brief.expected_artifacts?.length ? (
              <ul className="mt-3 list-disc pl-5 text-sm text-ink-soft">
                {brief.expected_artifacts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : null}
            {typeof brief.estimated_effort_min === "number" && (
              <p className="mt-2 text-xs text-muted">
                Estimated effort: <span className="font-mono tabular-nums">{brief.estimated_effort_min}</span> minutes.
              </p>
            )}
          </div>

          {phase === "invited" ? (
            <p className="text-sm text-success">Invitation sent.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-name">Candidate name</Label>
                <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">Candidate email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="button" onClick={invite} disabled={!email.trim() || phase === "inviting"}>
                {phase === "inviting" ? "Inviting…" : "Invite"}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger" role="alert">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </section>
  );
}
