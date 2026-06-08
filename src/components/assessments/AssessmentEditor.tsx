/**
 * AssessmentEditor — edit one assessment item (scenario keyed/open, case,
 * work-sample). Edits the authorable fields + nested arrays (options, rubric
 * criteria). Inline AI: improve-from-notes + suggest-scoring (advisory). Save
 * keeps it draft; Publish takes it live. Sentence case, no emoji.
 */
import { useState } from "react";
import { Plus, Trash2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recruiterAssessmentsApi, type AssessmentItem } from "@/services/recruiterAssessmentsApi";

type Props = {
  kind: string;
  item: AssessmentItem;
  onChange: (next: AssessmentItem) => void;
  onSave: () => void;
  onPublish?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  isNew?: boolean;
};

const DIFFICULTIES = ["easy", "mid", "hard"];

export function AssessmentEditor({ kind, item, onChange, onSave, onPublish, onDelete, saving, isNew }: Props) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<AssessmentItem>) => onChange({ ...item, ...patch });
  const isScenario = kind === "scenario";
  const isKeyed = isScenario && (item.response_type === "keyed" || Array.isArray(item.options));

  async function improve() {
    if (!notes.trim()) return;
    setBusy("improve"); setErr(null);
    try { onChange((await recruiterAssessmentsApi.aiImprove(item, notes.trim())).item); setNotes(""); }
    catch (e: any) { setErr(e?.message || "AI improve failed"); }
    finally { setBusy(null); }
  }
  async function suggestScoring() {
    setBusy("score"); setErr(null);
    try {
      const s = await recruiterAssessmentsApi.aiSuggestScoring(item);
      if (s.options?.length && Array.isArray(item.options)) {
        const byId: Record<string, number> = {};
        s.options.forEach((o: any) => { byId[o.id] = o.score; });
        set({ options: item.options.map((o: any) => ({ ...o, score: byId[o.id] ?? o.score })) });
      }
    } catch (e: any) { setErr(e?.message || "AI suggest failed"); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">{kind.replace("_", " ")}</span>
          <span className="text-[10px] px-2 py-0.5 rounded border border-rule text-muted">{item.status || "draft"}</span>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && !isNew && <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger">Delete</Button>}
          <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving…" : isNew ? "Create draft" : "Save"}</Button>
          {onPublish && !isNew && <Button size="sm" onClick={onPublish} disabled={saving}>Publish</Button>}
        </div>
      </div>

      {/* difficulty + skills */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Difficulty</Label>
          <select
            value={item.difficulty || "mid"} onChange={(e) => set({ difficulty: e.target.value })}
            className="mt-1 w-full h-9 rounded border border-rule bg-paper px-2 text-sm"
          >
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Skills (canonical ids, comma-separated)</Label>
          <Input
            className="mt-1" value={(item.canonical_ids || []).join(", ")}
            onChange={(e) => set({ canonical_ids: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      </div>

      {/* prompt / task brief */}
      <div>
        <Label className="text-xs">{isScenario ? "Scenario prompt" : "Task brief"}</Label>
        <Textarea
          className="mt-1" rows={5}
          value={isScenario ? (item.prompt || "") : (item.task_brief || "")}
          onChange={(e) => set(isScenario ? { prompt: e.target.value } : { task_brief: e.target.value })}
        />
      </div>

      {/* keyed options */}
      {isKeyed && (
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Options (one correct; spread the scores)</Label>
            <Button variant="ghost" size="sm" onClick={suggestScoring} disabled={busy === "score"}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />{busy === "score" ? "Scoring…" : "Suggest scoring"}
            </Button>
          </div>
          <div className="mt-1 space-y-2">
            {(item.options || []).map((o: any, i: number) => (
              <div key={o.id || i} className="flex items-center gap-2">
                <Input
                  className="flex-1" value={o.text || ""}
                  onChange={(e) => set({ options: item.options.map((x: any, j: number) => j === i ? { ...x, text: e.target.value } : x) })}
                />
                <Input
                  type="number" min={0} max={100} className="w-20" value={o.score ?? 0}
                  onChange={(e) => set({ options: item.options.map((x: any, j: number) => j === i ? { ...x, score: Number(e.target.value) } : x) })}
                />
                <Button variant="ghost" size="icon" onClick={() => set({ options: item.options.filter((_: any, j: number) => j !== i) })}>
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set({ options: [...(item.options || []), { id: String.fromCharCode(97 + (item.options?.length || 0)), text: "", score: 0 }] })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add option
            </Button>
          </div>
        </div>
      )}

      {/* case/work-sample answer key */}
      {!isScenario && (
        <div>
          <Label className="text-xs">Answer key (planted defect / model solution — never shown to candidate)</Label>
          <Textarea className="mt-1" rows={3} value={item.answer_key || ""} onChange={(e) => set({ answer_key: e.target.value })} />
        </div>
      )}

      {/* AI improve */}
      <div className="border-t border-rule pt-4">
        <Label className="text-xs flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5 text-gold-ink" /> Improve with AI</Label>
        <div className="mt-1 flex gap-2">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. make it harder, add a cross-border twist" />
          <Button variant="outline" onClick={improve} disabled={busy === "improve" || !notes.trim()}>
            {busy === "improve" ? "Improving…" : "Improve"}
          </Button>
        </div>
      </div>

      {err && <p className="text-xs text-danger" role="alert">{err}</p>}
    </div>
  );
}
