/**
 * JourneyBuilder — route /journeys/new.
 *
 * A four-step Stepper that builds a hiring program and its journey template:
 *   0. Role — title, JD, purpose, domain
 *   1. Stages — the typed pipeline (StageListEditor)
 *   2. Gating — declarative pass/skip/reject rules (GatingRuleEditor)
 *   3. Review — confirm, then POST the program and the journey-template.
 *
 * On create we first POST the program (returns program_id), then POST the
 * journey-template under it, then navigate to the role pipeline.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, GitBranch, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import {
  FINANCE_DOMAINS,
  FINANCE_DOMAIN_IDS,
  type FinanceDomainId,
} from "@/lib/financeTaxonomy";
import {
  recruiterJourneysApi,
  type GatingRule,
  type JourneyStage,
  type ProgramPurpose,
} from "@/services/recruiterJourneysApi";
import { StageListEditor, makeStageId } from "@/components/journey/StageListEditor";
import { GatingRuleEditor } from "@/components/journey/GatingRuleEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stepper, type Step as StepDef } from "@/components/ui/stepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorBanner } from "@/components/ui/error-banner";

const PURPOSES: { value: ProgramPurpose; label: string; hint: string }[] = [
  { value: "hiring", label: "Hiring", hint: "Evaluate candidates for a role — produces a hire decision" },
  { value: "skill_analysis", label: "Skill analysis", hint: "Map a cohort against a competency target — produces a gap-vs-target view" },
];

const STAGE_TYPE_LABELS: Record<JourneyStage["type"], string> = {
  screen: "Screen",
  assignment: "Assignment",
  review: "Review",
  interview: "Interview",
  fitment: "Fitment",
  decision: "Decision",
};

/** Sensible starting pipeline so step 1 isn't a blank slate. */
function defaultStages(): JourneyStage[] {
  return [
    { stage_id: makeStageId(), order: 1, type: "screen", title: "Resume screen" },
    { stage_id: makeStageId(), order: 2, type: "interview", title: "AI interview" },
    { stage_id: makeStageId(), order: 3, type: "decision", title: "Hiring decision" },
  ];
}

export default function JourneyBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentProject } = useWorkspace();
  const { toast } = useToast();
  const ws = user?.activeWorkspaceId;
  // Stages that use the interview engine (screen/interview/fitment) write to a
  // project-scoped path, so the program must carry the active project id.
  const projectId = currentProject?.id;

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 — role
  const [title, setTitle] = useState("");
  const [jdText, setJdText] = useState("");
  const [purpose, setPurpose] = useState<ProgramPurpose>("hiring");
  const [domain, setDomain] = useState<FinanceDomainId | "">("");

  // Step 1 / 2
  const [stages, setStages] = useState<JourneyStage[]>(defaultStages);
  const [rules, setRules] = useState<GatingRule[]>([]);

  const steps: StepDef[] = [
    { id: "role", title: "Role" },
    { id: "stages", title: "Stages" },
    { id: "gating", title: "Gating rules" },
    { id: "review", title: "Review" },
  ];

  const roleValid = title.trim().length > 0 && !!domain;
  const stagesValid = stages.length > 0 && stages.every((s) => s.title.trim().length > 0);

  const stepValid = useMemo(() => {
    switch (currentStep) {
      case 0:
        return roleValid;
      case 1:
        return stagesValid;
      default:
        return true;
    }
  }, [currentStep, roleValid, stagesValid]);

  const goNext = () => {
    if (!stepValid) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleCreate = async () => {
    if (!ws) {
      setError("No active workspace. Pick a workspace before creating a program.");
      return;
    }
    if (!roleValid || !stagesValid || !domain) {
      setError("Fill in the role title, domain, and at least one stage before creating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const program = await recruiterJourneysApi.createProgram(ws, {
        purpose,
        title: title.trim(),
        jdText: jdText.trim() || undefined,
        domain,
        projectId,
      });

      await recruiterJourneysApi.saveJourneyTemplate(ws, program.program_id, {
        stages,
        rules,
        version: 1,
      });

      toast({
        title: "Program created",
        description: `"${title.trim()}" is ready with ${stages.length} stage${stages.length === 1 ? "" : "s"}.`,
      });
      navigate(`/programs/${program.program_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the program.";
      setError(message);
      toast({ title: "Could not create program", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const stageLabel = (id: string) => stages.find((s) => s.stage_id === id)?.title || "—";

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/programs")} aria-label="Back to programs">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
            JOURNEY
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gold-ink" aria-hidden />
            New role pipeline
          </h1>
        </div>
      </div>

      {!ws && (
        <ErrorBanner
          tone="warning"
          title="No active workspace"
          description="Select a workspace to create a hiring program."
        />
      )}

      <Stepper steps={steps} currentStep={currentStep} allowClickNavigation={false} />

      {error && (
        <ErrorBanner tone="danger" title="Something went wrong" description={error} onDismiss={() => setError(null)} />
      )}

      <div className="rounded-md border border-rule bg-paper p-6">
        {/* Step 0 — role */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="program-title">Role title</Label>
              <Input
                id="program-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior tax associate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-purpose">Purpose</Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as ProgramPurpose)}>
                <SelectTrigger id="program-purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted">
                {PURPOSES.find((p) => p.value === purpose)?.hint}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-domain">Domain</Label>
              <Select value={domain} onValueChange={(v) => setDomain(v as FinanceDomainId)}>
                <SelectTrigger id="program-domain">
                  <SelectValue placeholder="Choose a domain" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_DOMAIN_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {FINANCE_DOMAINS[id].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-jd">Job description</Label>
              <Textarea
                id="program-jd"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the JD here. Optional, but it sharpens the screen and interview stages."
                rows={8}
              />
              <p className="text-xs text-muted">Optional. You can refine this later.</p>
            </div>
          </div>
        )}

        {/* Step 1 — stages */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Pipeline stages</h2>
              <p className="text-sm text-muted mt-1">
                Order the steps a candidate moves through. Each stage has a type and a title.
              </p>
            </div>
            <StageListEditor stages={stages} onChange={setStages} />
          </div>
        )}

        {/* Step 2 — gating */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Gating rules</h2>
              <p className="text-sm text-muted mt-1">
                Optional. Auto-skip, unlock, or reject based on a stage score.
              </p>
            </div>
            <GatingRuleEditor stages={stages} rules={rules} onChange={setRules} />
          </div>
        )}

        {/* Step 3 — review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-ink">Review and create</h2>
              <p className="text-sm text-muted mt-1">Confirm the program before we save it.</p>
            </div>

            <dl className="rounded-md border border-rule divide-y divide-rule text-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Role</dt>
                <dd className="text-ink font-medium">{title.trim() || "—"}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Purpose</dt>
                <dd className="text-ink">{PURPOSES.find((p) => p.value === purpose)?.label}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Domain</dt>
                <dd className="text-ink">{domain ? FINANCE_DOMAINS[domain].label : "—"}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <dt className="text-muted">Job description</dt>
                <dd className="text-ink font-mono tabular-nums text-xs">
                  {jdText.trim() ? `${jdText.trim().length} chars` : "Not provided"}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-ink mb-2">
                Stages <span className="font-mono tabular-nums text-muted">({stages.length})</span>
              </h3>
              <ol className="rounded-md border border-rule divide-y divide-rule text-sm">
                {stages.map((s) => (
                  <li key={s.stage_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="font-mono tabular-nums text-xs text-muted w-5 text-right">{s.order}</span>
                    <span className="inline-flex items-center rounded-sm border border-rule bg-paper-3 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                      {STAGE_TYPE_LABELS[s.type]}
                    </span>
                    <span className="text-ink">{s.title}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink mb-2">
                Gating rules <span className="font-mono tabular-nums text-muted">({rules.length})</span>
              </h3>
              {rules.length === 0 ? (
                <p className="text-sm text-muted">No rules — candidates flow through every stage in order.</p>
              ) : (
                <ul className="rounded-md border border-rule divide-y divide-rule text-sm">
                  {rules.map((r, i) => (
                    <li key={i} className="px-4 py-2.5 text-ink font-mono text-xs tabular-nums">
                      when {stageLabel(r.from_stage_id)} score {r.op} {r.value} then {r.action}
                      {r.action !== "reject" ? ` → ${stageLabel(r.to_stage_id)}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goBack} disabled={currentStep === 0 || submitting}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button onClick={goNext} disabled={!stepValid}>
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="gold" onClick={handleCreate} disabled={submitting || !ws}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Create program
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
