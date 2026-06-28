/**
 * TargetEditor — edit a skill_analysis program's competency target.
 *
 * One row per target skill: a free-text skill name and a 0–100 target the
 * candidate's demonstrated value is later measured against. Rows are seeded
 * from the saved target (or a single empty row). Empty-name rows are dropped
 * on save; targets are clamped to 0..100. Visual density follows the FunnelHQ
 * baseline: a divided list of rows, not a card per row.
 */
import { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  recruiterJourneysApi,
  type Competency,
} from "@/services/recruiterJourneysApi";

/** A local editable row — keeps a stable key so React doesn't re-mount inputs. */
interface Row {
  key: string;
  skill_name: string;
  /** Kept as a string so the input can be cleared while editing. */
  target: string;
  canonical_id?: string;
}

function rowKey(): string {
  return `comp_${Math.random().toString(36).slice(2, 10)}`;
}

function seedRows(initial: Competency[]): Row[] {
  if (initial.length === 0) {
    return [{ key: rowKey(), skill_name: "", target: "70" }];
  }
  return initial.map((c) => ({
    key: rowKey(),
    skill_name: c.skill_name,
    target: String(c.target),
    canonical_id: c.canonical_id,
  }));
}

function clampTarget(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export interface TargetEditorProps {
  ws: string;
  programId: string;
  initial: Competency[];
  onSaved?: (competencies: Competency[]) => void;
  className?: string;
}

export function TargetEditor({
  ws,
  programId,
  initial,
  onSaved,
  className,
}: TargetEditorProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>(() => seedRows(initial));
  const [saving, setSaving] = useState(false);

  const addRow = () =>
    setRows((r) => [...r, { key: rowKey(), skill_name: "", target: "70" }]);

  const removeRow = (key: string) =>
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));

  const updateName = (key: string, skill_name: string) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, skill_name } : row)));

  const updateTarget = (key: string, target: string) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, target } : row)));

  const save = async () => {
    if (saving) return;
    const competencies: Competency[] = rows
      .filter((row) => row.skill_name.trim().length > 0)
      .map((row) => ({
        skill_name: row.skill_name.trim(),
        target: clampTarget(row.target),
        ...(row.canonical_id ? { canonical_id: row.canonical_id } : {}),
      }));

    if (competencies.length === 0) {
      toast({
        title: "Add at least one skill",
        description: "Name a competency before saving the target.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await recruiterJourneysApi.setTarget(ws, programId, competencies);
      toast({
        title: "Target saved",
        description: `${res.count} competenc${res.count === 1 ? "y" : "ies"} set for this program.`,
      });
      setRows(seedRows(res.target_competencies));
      onSaved?.(res.target_competencies);
    } catch (err) {
      toast({
        title: "Could not save target",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cn("rounded-md border border-rule bg-paper", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <div className="min-w-0">
          <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-gold-ink">
            TARGET
          </span>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Target className="w-4 h-4 text-gold-ink" aria-hidden />
            Competency target
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Set the bar each candidate's demonstrated skill is measured against.
          </p>
        </div>
        <Button variant="gold" size="sm" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save target"}
        </Button>
      </div>

      <div className="divide-y divide-rule">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-3 px-4 py-2.5">
            <Input
              value={row.skill_name}
              onChange={(e) => updateName(row.key, e.target.value)}
              placeholder="Working capital analysis"
              aria-label="Skill name"
              className="h-9 flex-1 min-w-0"
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={row.target}
              onChange={(e) => updateTarget(row.key, e.target.value)}
              aria-label="Target (0 to 100)"
              className="h-9 w-20 shrink-0 font-mono tabular-nums text-right"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-danger hover:text-danger"
              onClick={() => removeRow(row.key)}
              disabled={rows.length === 1}
              aria-label="Remove competency"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t border-rule px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-3.5 h-3.5" />
          Add competency
        </Button>
      </div>
    </section>
  );
}

export default TargetEditor;
