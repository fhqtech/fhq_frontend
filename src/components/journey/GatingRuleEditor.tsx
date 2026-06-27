/**
 * GatingRuleEditor — declarative rows that gate movement through the pipeline.
 *
 * Each row reads: "when {from_stage} {metric} {op} {value}, {action} {to_stage}".
 * The only metric today is `score` (0–100). Reject needs no target stage, so
 * the to-stage select is hidden for it. Stage selects are sourced from the
 * live stage list, so a rule can never point at a stage that no longer exists.
 */
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  GatingAction,
  GatingOp,
  GatingRule,
  JourneyStage,
} from "@/services/recruiterJourneysApi";

const OPS: { value: GatingOp; label: string }[] = [
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: "==", label: "=" },
];

const ACTIONS: { value: GatingAction; label: string }[] = [
  { value: "skip", label: "Skip to" },
  { value: "unlock", label: "Unlock" },
  { value: "reject", label: "Reject" },
];

export function makeEmptyRule(stages: JourneyStage[]): GatingRule {
  const first = stages[0]?.stage_id ?? "";
  const last = stages[stages.length - 1]?.stage_id ?? "";
  return {
    from_stage_id: first,
    metric: "score",
    op: ">=",
    value: 75,
    action: "unlock",
    to_stage_id: last,
  };
}

export interface GatingRuleEditorProps {
  stages: JourneyStage[];
  rules: GatingRule[];
  onChange: (rules: GatingRule[]) => void;
  className?: string;
}

export function GatingRuleEditor({ stages, rules, onChange, className }: GatingRuleEditorProps) {
  const canAdd = stages.length > 0;

  const addRule = () => onChange([...rules, makeEmptyRule(stages)]);

  const removeRule = (index: number) =>
    onChange(rules.filter((_, i) => i !== index));

  const patchRule = (index: number, patch: Partial<GatingRule>) =>
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const stageLabel = (id: string) => stages.find((s) => s.stage_id === id)?.title || "—";

  if (stages.length === 0) {
    return (
      <div className={cn("rounded-md border border-dashed border-rule bg-paper-2 px-4 py-8 text-center", className)}>
        <p className="text-sm text-muted">Add stages first — gating rules connect one stage to another.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-rule bg-paper-2 px-4 py-8 text-center">
          <p className="text-sm text-muted">
            No rules yet. Candidates move straight through every stage in order.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-md border border-rule bg-paper px-3 py-3"
            >
              <span className="text-xs text-muted">When</span>

              <Select
                value={rule.from_stage_id}
                onValueChange={(v) => patchRule(index, { from_stage_id: v })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.stage_id} value={s.stage_id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-xs text-muted font-mono">score</span>

              <Select value={rule.op} onValueChange={(v) => patchRule(index, { op: v as GatingOp })}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={0}
                max={100}
                value={Number.isFinite(rule.value) ? rule.value : 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patchRule(index, { value: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0 });
                }}
                aria-label="Score threshold"
                className="w-20 font-mono tabular-nums"
              />

              <span className="text-xs text-muted">then</span>

              <Select
                value={rule.action}
                onValueChange={(v) => patchRule(index, { action: v as GatingAction })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rule.action !== "reject" && (
                <>
                  <ArrowRight className="w-4 h-4 text-muted" aria-hidden />
                  <Select
                    value={rule.to_stage_id}
                    onValueChange={(v) => patchRule(index, { to_stage_id: v })}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Target stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.stage_id} value={s.stage_id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-auto text-danger hover:text-danger"
                onClick={() => removeRule(index)}
                aria-label="Remove rule"
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              {rule.action === "reject" && (
                <p className="basis-full text-[11px] text-muted font-mono pl-1">
                  Rejects {stageLabel(rule.from_stage_id)} candidates below the threshold.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRule} disabled={!canAdd}>
        <Plus className="w-3.5 h-3.5" />
        Add rule
      </Button>
    </div>
  );
}

export default GatingRuleEditor;
