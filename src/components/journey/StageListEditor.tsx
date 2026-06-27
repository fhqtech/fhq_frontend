/**
 * StageListEditor — add / reorder / remove typed pipeline stages.
 *
 * Each stage carries a title and an auto-assigned `order` (1-based, kept
 * contiguous after every mutation). The six stage types map 1:1 to the
 * backend `StageType` enum. Visual density follows the FunnelHQ baseline:
 * divided rows over per-stage cards.
 */
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
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
import type { JourneyStage, StageType } from "@/services/recruiterJourneysApi";

const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: "screen", label: "Screen" },
  { value: "assignment", label: "Assignment" },
  { value: "review", label: "Review" },
  { value: "interview", label: "Interview" },
  { value: "fitment", label: "Fitment" },
  { value: "decision", label: "Decision" },
];

const DEFAULT_TITLES: Record<StageType, string> = {
  screen: "Resume screen",
  assignment: "Work sample",
  review: "Panel review",
  interview: "AI interview",
  fitment: "Fitment check",
  decision: "Hiring decision",
};

export function makeStageId(): string {
  return `stg_${Math.random().toString(36).slice(2, 10)}`;
}

/** Re-number stages 1..n so `order` stays contiguous after any mutation. */
function renumber(stages: JourneyStage[]): JourneyStage[] {
  return stages.map((s, i) => ({ ...s, order: i + 1 }));
}

export interface StageListEditorProps {
  stages: JourneyStage[];
  onChange: (stages: JourneyStage[]) => void;
  className?: string;
}

export function StageListEditor({ stages, onChange, className }: StageListEditorProps) {
  const addStage = (type: StageType) => {
    const next: JourneyStage = {
      stage_id: makeStageId(),
      order: stages.length + 1,
      type,
      title: DEFAULT_TITLES[type],
    };
    onChange(renumber([...stages, next]));
  };

  const removeStage = (stageId: string) => {
    onChange(renumber(stages.filter((s) => s.stage_id !== stageId)));
  };

  const updateTitle = (stageId: string, title: string) => {
    onChange(stages.map((s) => (s.stage_id === stageId ? { ...s, title } : s)));
  };

  const updateType = (stageId: string, type: StageType) => {
    onChange(stages.map((s) => (s.stage_id === stageId ? { ...s, type } : s)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(renumber(next));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {stages.length === 0 ? (
        <div className="rounded-md border border-dashed border-rule bg-paper-2 px-4 py-8 text-center">
          <p className="text-sm text-muted">No stages yet. Add the first step a candidate moves through.</p>
        </div>
      ) : (
        <div className="rounded-md border border-rule bg-paper divide-y divide-rule">
          {stages.map((stage, index) => (
            <div key={stage.stage_id} className="flex items-center gap-3 px-3 py-3">
              <div className="flex items-center gap-2 shrink-0">
                <GripVertical className="w-4 h-4 text-muted" aria-hidden />
                <span className="font-mono tabular-nums text-xs text-muted w-5 text-right">
                  {stage.order}
                </span>
              </div>

              <Select value={stage.type} onValueChange={(v) => updateType(stage.stage_id, v as StageType)}>
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={stage.title}
                onChange={(e) => updateTitle(stage.stage_id, e.target.value)}
                placeholder="Stage title"
                aria-label={`Stage ${stage.order} title`}
                className="flex-1 min-w-0"
              />

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move stage up"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => move(index, 1)}
                  disabled={index === stages.length - 1}
                  aria-label="Move stage down"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-danger hover:text-danger"
                  onClick={() => removeStage(stage.stage_id)}
                  aria-label="Remove stage"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted mr-1">Add stage:</span>
        {STAGE_TYPES.map((t) => (
          <Button
            key={t.value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStage(t.value)}
          >
            <Plus className="w-3.5 h-3.5" />
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default StageListEditor;
