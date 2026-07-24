/**
 * PipelineBuilder — the self-saving host for the two controlled journey editors
 * (StageListEditor + GatingRuleEditor). Mounts in RoleContainer beside the
 * TargetEditor. Holds the draft stages + rules, owns the Save button, and bumps
 * the template version monotonically across saves (so repeated saves in one
 * session don't collide on version), then lifts the result to the parent so the
 * pipeline board/table stay in sync.
 *
 * Stages render above rules because GatingRuleEditor shows an add-stages-first
 * empty state until at least one stage exists.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  recruiterJourneysApi,
  type JourneyStage,
  type GatingRule,
} from "@/services/recruiterJourneysApi";
import { StageListEditor } from "./StageListEditor";
import { GatingRuleEditor } from "./GatingRuleEditor";
import { Button } from "@/components/ui/button";

export interface PipelineBuilderProps {
  ws: string;
  programId: string;
  initialStages: JourneyStage[];
  initialRules: GatingRule[];
  initialVersion: number;
  onSaved: (stages: JourneyStage[], rules: GatingRule[], version: number) => void;
}

export function PipelineBuilder({
  ws,
  programId,
  initialStages,
  initialRules,
  initialVersion,
  onSaved,
}: PipelineBuilderProps) {
  const [stages, setStages] = useState<JourneyStage[]>(initialStages);
  const [rules, setRules] = useState<GatingRule[]>(initialRules);
  const [version, setVersion] = useState<number>(initialVersion);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const nextVersion = version + 1;
      await recruiterJourneysApi.saveJourneyTemplate(ws, programId, { stages, rules, version: nextVersion });
      setVersion(nextVersion);
      onSaved(stages, rules, nextVersion);
      toast({ title: "Pipeline saved" });
    } catch (e) {
      toast({
        title: "Couldn't save the pipeline",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-rule bg-paper">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Pipeline</p>
          <h3 className="mt-0.5 text-sm font-semibold text-ink">Stages and gating rules</h3>
        </div>
        <Button variant="gold" size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save pipeline
        </Button>
      </header>
      <div className="space-y-6 p-4">
        <StageListEditor stages={stages} onChange={setStages} />
        <GatingRuleEditor stages={stages} rules={rules} onChange={setRules} />
      </div>
    </section>
  );
}
