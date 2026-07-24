/**
 * P2-2 / Phase 4 — open a role. The single "create" entry that replaces choosing
 * between the four builders. Mid depth: name the role, pick a finance discipline
 * and how deep the starting pipeline should be, paste (or AI-draft) the JD, and
 * the role is created and lands on its pipeline board. Reuses the Programs engine
 * via recruiterJourneysApi.createRoleWithTemplate.
 *
 * The backend domain stays "finance" (the only SUPPORTED_DOMAIN); the chosen
 * discipline is folded into the JD context so the blueprint agent picks it up.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { recruiterJourneysApi, type JourneyStage, type StageType } from "@/services/recruiterJourneysApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner } from "@/components/ui/error-banner";
import { RoleCuratorModal } from "@/components/role-curator/RoleCuratorModal";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";

const DISCIPLINES = [
  { key: "accounting", label: "Accounting" },
  { key: "taxation", label: "Taxation" },
  { key: "management_consulting", label: "Management consulting" },
] as const;
type DisciplineKey = (typeof DISCIPLINES)[number]["key"];

export type PipelineDepth = "screen" | "interview" | "full";

const DEPTHS: Array<{ key: PipelineDepth; label: string; hint: string }> = [
  { key: "screen", label: "Screen only", hint: "Just an AI screening interview to start." },
  { key: "interview", label: "Screen + interview", hint: "Screen, then a deeper interview and a decision." },
  { key: "full", label: "Full loop", hint: "Screen, assignment, interview, decision." },
];

/** The starting stages for a pipeline depth. Pure + exported for testing. */
export function stagesForPipeline(depth: PipelineDepth): JourneyStage[] {
  const stage = (type: StageType, title: string, order: number): JourneyStage => ({
    stage_id: type,
    order,
    type,
    title,
  });
  if (depth === "interview") {
    return [stage("screen", "Screen", 0), stage("interview", "Interview", 1), stage("decision", "Decision", 2)];
  }
  if (depth === "full") {
    return [
      stage("screen", "Screen", 0),
      stage("assignment", "Assignment", 1),
      stage("interview", "Interview", 2),
      stage("decision", "Decision", 3),
    ];
  }
  return [stage("screen", "Screen", 0)];
}

export function OpenRoleFlow() {
  const navigate = useNavigate();
  const { currentWorkspace, currentProject } = useWorkspace();
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineKey | null>(null);
  const [depth, setDepth] = useState<PipelineDepth>("screen");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurator, setShowCurator] = useState(false);

  const stages = stagesForPipeline(depth);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentWorkspace?.id) return;
    setCreating(true);
    setError(null);
    const disciplineLabel = DISCIPLINES.find((d) => d.key === discipline)?.label;
    const jdText =
      [disciplineLabel ? `Discipline: ${disciplineLabel}.` : "", jd.trim()].filter(Boolean).join("\n\n") ||
      undefined;
    try {
      const roleId = await recruiterJourneysApi.createRoleWithTemplate(currentWorkspace.id, {
        title: title.trim(),
        jdText,
        projectId: currentProject?.id,
        stages,
      });
      navigate(`/roles/${roleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the role");
      setCreating(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header>
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Open a role</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">What are you hiring for?</h1>
        <p className="mt-2 max-w-[65ch] text-base text-ink-soft">
          Name the role, pick a discipline, and choose how deep the pipeline starts. You can add or
          remove stages later.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setShowCurator(true)}>
          <Sparkles className="mr-2 h-4 w-4 text-gold-ink" />
          Draft with AI
        </Button>
      </header>

      {error && <ErrorBanner tone="danger" title="Couldn't open the role" description={error} />}

      <div className="space-y-1.5">
        <Label htmlFor="role-title">Role title</Label>
        <Input
          id="role-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Senior tax associate"
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Discipline</Label>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES.map((d) => {
            const active = discipline === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDiscipline(active ? null : d.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-gold-ink bg-gold-soft text-gold-ink"
                    : "border-rule bg-paper text-ink-soft hover:border-rule-strong",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">Optional — sharpens the generated rubric for the finance area.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-jd">Job description</Label>
        <Textarea
          id="role-jd"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="What this role does, and the finance skills it needs."
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label>Starting pipeline</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {DEPTHS.map((d) => {
            const active = depth === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDepth(d.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  active ? "border-gold-ink bg-gold-soft/40" : "border-rule bg-paper hover:border-rule-strong",
                )}
              >
                <span className="block text-sm font-medium text-ink">{d.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{d.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-md border border-rule bg-paper-2 px-4 py-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted">What happens next</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {stages.map((s, i) => (
              <span key={s.stage_id} className="flex items-center gap-1.5">
                <span className="rounded-sm border border-rule bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft">
                  {s.title}
                </span>
                {i < stages.length - 1 ? <ArrowRight className="h-3 w-3 text-muted" aria-hidden /> : null}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" variant="gold" disabled={!title.trim() || creating}>
        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Open role
      </Button>

      <RoleCuratorModal
        isOpen={showCurator}
        onClose={() => setShowCurator(false)}
        onAccept={(proposal) => {
          if (proposal.title) setTitle(proposal.title);
          if (proposal.description) setJd(proposal.description);
          setShowCurator(false);
        }}
      />
    </form>
  );
}

export default OpenRoleFlow;
