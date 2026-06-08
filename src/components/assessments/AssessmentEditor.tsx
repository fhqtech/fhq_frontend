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
      if (s.criteria?.length && item.rubric?.criteria) {
        const byId: Record<string, any[]> = {};
        s.criteria.forEach((c: any) => { byId[c.id] = c.anchors; });
        set({ rubric: { ...item.rubric, criteria: item.rubric.criteria.map((c: any) => byId[c.id] ? { ...c, anchors: byId[c.id] } : c) } });
      }
    } catch (e: any) { setErr(e?.message || "AI suggest failed"); }
    finally { setBusy(null); }
  }

  // --- rubric criteria helpers ---
  const rubric = item.rubric || { rubric_id: `r-${item.id || "new"}`, mode: kind, criteria: [] };
  const setCriteria = (criteria: any[]) => set({ rubric: { ...rubric, criteria } });
  const setCriterion = (i: number, patch: any) =>
    setCriteria((rubric.criteria || []).map((c: any, j: number) => (j === i ? { ...c, ...patch } : c)));
  const removeCriterion = (i: number) => setCriteria((rubric.criteria || []).filter((_: any, j: number) => j !== i));
  const addCriterion = () =>
    setCriteria([...(rubric.criteria || []), {
      id: `c${(rubric.criteria?.length || 0) + 1}`, label: "", canonical_ids: [], weight: 1.0,
      anchors: [{ level: "strong", descriptor: "" }, { level: "weak", descriptor: "" }],
    }]);
  const anchor = (cr: any, level: string) =>
    (cr.anchors || []).find((a: any) => a.level === level)?.descriptor || "";
  const setAnchor = (i: number, level: string, descriptor: string) => {
    const cr = (rubric.criteria || [])[i] || {};
    const anchors = [...(cr.anchors || [])];
    const idx = anchors.findIndex((a: any) => a.level === level);
    if (idx >= 0) anchors[idx] = { ...anchors[idx], descriptor };
    else anchors.push({ level, descriptor });
    setCriterion(i, { anchors });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">{kind.replace("_", " ")}</span>
          <span className="text-[10px] px-2 py-0.5 rounded border border-rule text-muted">{({ curated: "Live", draft: "Draft", fixture: "Test" } as Record<string, string>)[item.status || "draft"] || item.status}</span>
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

      {/* rubric editor — open scenario + case + work-sample */}
      {!isKeyed && (
        <div>
          <Label className="text-xs">Rubric criteria (each scores one or more skills, with strong / weak anchors)</Label>
          <div className="mt-1 space-y-3">
            {(item.rubric?.criteria || []).map((cr: any, i: number) => (
              <div key={cr.id || i} className="rounded border border-rule p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Criterion (e.g. Profitability analysis)"
                    value={cr.label || ""} onChange={(e) => setCriterion(i, { label: e.target.value })} />
                  <Input type="number" step="0.5" min={0} className="w-20" title="weight"
                    value={cr.weight ?? 1} onChange={(e) => setCriterion(i, { weight: Number(e.target.value) })} />
                  <Button variant="ghost" size="icon" onClick={() => removeCriterion(i)}><Trash2 className="h-4 w-4 text-muted" /></Button>
                </div>
                <Input className="text-xs" placeholder="skill canonical ids (comma-separated)"
                  value={(cr.canonical_ids || []).join(", ")}
                  onChange={(e) => setCriterion(i, { canonical_ids: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                <Textarea rows={2} placeholder="Strong answer looks like…" value={anchor(cr, "strong")}
                  onChange={(e) => setAnchor(i, "strong", e.target.value)} />
                <Textarea rows={2} placeholder="Weak answer looks like…" value={anchor(cr, "weak")}
                  onChange={(e) => setAnchor(i, "weak", e.target.value)} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCriterion}><Plus className="h-3.5 w-3.5 mr-1" /> Add criterion</Button>
          </div>
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
