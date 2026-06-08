/**
 * Assessments studio (recruiter) — browse the library, open full detail, edit
 * every field, create, AI-draft / improve / suggest-scoring / generate-from-JD,
 * publish to live, and assign. Master-detail: left = library, right = editor.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, Sparkles, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { listsApi } from "@/services/listsApi";
import { AssessmentEditor } from "@/components/assessments/AssessmentEditor";

type CandidateListLite = { id: string; name: string; totalCandidates?: number };
import {
  recruiterAssessmentsApi as api,
  type AssessmentItem,
  type CatalogItem,
} from "@/services/recruiterAssessmentsApi";

const MODE_LABEL: Record<string, string> = {
  scenario: "Scenario", case: "Case study", work_sample: "Work sample", defense: "Defense",
};
const STATUS_CLS: Record<string, string> = {
  curated: "bg-success-soft text-success", draft: "bg-accent/10 text-primary", fixture: "bg-paper-3 text-muted",
};

function parseCandidates(raw: string): { name: string; email: string }[] {
  const out: { name: string; email: string }[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const angle = line.match(/^(.*?)<([^>]+)>$/);
    if (angle) { out.push({ name: angle[1].trim() || angle[2].trim(), email: angle[2].trim() }); continue; }
    out.push({ name: line.split("@")[0], email: line });
  }
  return out.filter((c) => c.email.includes("@"));
}

type Pane =
  | { mode: "empty" }
  | { mode: "edit"; kind: string; item: AssessmentItem; isNew: boolean }
  | { mode: "ai" }
  | { mode: "jd" }
  | { mode: "assign"; item: CatalogItem };

export default function Assessments() {
  const { currentWorkspace, currentProject } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const projectId = currentProject?.id;
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pane, setPane] = useState<Pane>({ mode: "empty" });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try { setCatalog(await api.getCatalog("finance", wsId)); }
    catch (e: any) { setError(e?.message || "Could not load the catalog."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [wsId]);

  const filtered = useMemo(
    () => catalog.filter((c) => `${c.title} ${c.mode} ${c.status}`.toLowerCase().includes(q.toLowerCase())),
    [catalog, q],
  );

  async function openItem(c: CatalogItem) {
    setError(null);
    try {
      // Backend unions Firestore + JSON seed, so this opens any catalog item.
      const item = await api.getItem(c.id);
      setPane({ mode: "edit", kind: item.kind || c.mode, item, isNew: false });
    } catch (e: any) {
      setError(e?.message || "Could not open this item.");
    }
  }

  function newItem(kind: string) {
    const base: AssessmentItem = kind === "scenario"
      ? { kind, status: "draft", difficulty: "mid", response_type: "keyed", canonical_ids: [], prompt: "",
          options: [{ id: "a", text: "", score: 90 }, { id: "b", text: "", score: 20 }] }
      : { kind, status: "draft", difficulty: "mid", canonical_ids: [], task_brief: "",
          rubric: { rubric_id: `r-${Date.now()}`, mode: kind, criteria: [] } };
    setPane({ mode: "edit", kind, item: base, isNew: true });
  }

  async function save() {
    if (pane.mode !== "edit") return;
    setSaving(true); setError(null);
    try {
      if (pane.isNew) {
        const { id } = await api.createItem(pane.kind, pane.item, wsId);
        setFlash("Draft created."); await refresh();
        const item = await api.getItem(id);
        setPane({ mode: "edit", kind: pane.kind, item, isNew: false });
      } else {
        await api.updateItem(pane.item.id, pane.kind, pane.item);
        setFlash("Saved."); await refresh();
      }
    } catch (e: any) { setError(e?.message || "Save failed"); }
    finally { setSaving(false); }
  }
  async function publish() {
    if (pane.mode !== "edit" || pane.isNew) return;
    setSaving(true); setError(null);
    try {
      await api.publishItem(pane.item.id);
      setFlash("Published — now live to candidates."); await refresh();
      setPane({ ...pane, item: { ...pane.item, status: "curated" } });
    } catch (e: any) { setError(e?.message || "Publish failed"); }
    finally { setSaving(false); }
  }
  async function del() {
    if (pane.mode !== "edit" || pane.isNew) return;
    if (!confirm("Delete this item?")) return;
    try { await api.deleteItem(pane.item.id); setFlash("Deleted."); setPane({ mode: "empty" }); await refresh(); }
    catch (e: any) { setError(e?.message || "Delete failed"); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Assessments</span>
          <h1 className="text-2xl font-semibold text-ink mt-1">Assessment studio</h1>
          <p className="text-sm text-muted mt-1">Browse, author, and publish the assessment library. Drafts are never shown to candidates until published.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => newItem("scenario")}><Plus className="h-3.5 w-3.5 mr-1" /> Scenario</Button>
          <Button variant="outline" size="sm" onClick={() => newItem("case")}><Plus className="h-3.5 w-3.5 mr-1" /> Case</Button>
          <Button variant="outline" size="sm" onClick={() => setPane({ mode: "ai" })}><Sparkles className="h-3.5 w-3.5 mr-1" /> Draft with AI</Button>
          <Button variant="outline" size="sm" onClick={() => setPane({ mode: "jd" })}><FileText className="h-3.5 w-3.5 mr-1" /> From JD</Button>
        </div>
      </div>

      {flash && <p className="text-xs text-success flex items-center gap-1.5 mb-3"><CheckCircle2 className="h-3.5 w-3.5" /> {flash}</p>}
      {error && <p className="text-xs text-danger flex items-center gap-1.5 mb-3" role="alert"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}

      <div className="grid md:grid-cols-[minmax(0,360px)_1fr] gap-6">
        {/* Library */}
        <div className="bg-paper rounded-xl border border-border shadow-1 overflow-hidden">
          <div className="p-3 border-b border-rule">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library…" className="h-9" />
          </div>
          {loading ? (
            <p className="text-sm text-muted p-5">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted p-5">No items. Create one or draft with AI.</p>
          ) : (
            <ul className="divide-y divide-rule max-h-[600px] overflow-auto">
              {filtered.map((c) => (
                <li key={c.id} className={`group ${pane.mode === "edit" && (pane.item as any).id === c.id ? "bg-paper-2" : ""}`}>
                  <div className="flex items-center">
                    <button onClick={() => openItem(c)} className="flex-1 text-left px-4 py-3 hover:bg-paper-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gold-ink">{MODE_LABEL[c.mode] || c.mode}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_CLS[c.status] || ""}`}>{c.status}</span>
                      </div>
                      <p className="text-sm text-ink mt-0.5 line-clamp-2">{c.title}</p>
                    </button>
                    <button onClick={() => setPane({ mode: "assign", item: c })} title="Assign" className="px-3 text-muted hover:text-primary">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail / editor */}
        <div className="bg-paper rounded-xl border border-border shadow-1 p-5 min-h-[300px]">
          {pane.mode === "empty" && (
            <EmptyState title="Pick an item to edit" description="Or create a new one, draft with AI, or generate a set from a job description." />
          )}
          {pane.mode === "edit" && (
            <>
              {!pane.isNew && (
                <div className="flex justify-end mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setPane({ mode: "assign", item: { id: pane.item.id, mode: pane.kind as any, title: pane.item.prompt || pane.item.task_brief || pane.item.id, status: pane.item.status } })}>
                    <Send className="h-3.5 w-3.5 mr-1" /> Assign
                  </Button>
                </div>
              )}
              <AssessmentEditor
                kind={pane.kind} item={pane.item} isNew={pane.isNew} saving={saving}
                onChange={(next) => setPane({ ...pane, item: next })}
                onSave={save} onPublish={publish} onDelete={del}
              />
            </>
          )}
          {pane.mode === "ai" && <AIDraftPane onDrafted={(kind, item) => setPane({ mode: "edit", kind, item, isNew: true })} />}
          {pane.mode === "jd" && <FromJdPane wsId={wsId} onDone={(msg) => { setFlash(msg); setPane({ mode: "empty" }); refresh(); }} />}
          {pane.mode === "assign" && <AssignPane item={pane.item} wsId={wsId} projectId={projectId} onDone={(msg) => { setFlash(msg); setPane({ mode: "empty" }); }} />}
        </div>
      </div>
    </div>
  );
}

function AIDraftPane({ onDrafted }: { onDrafted: (kind: string, item: AssessmentItem) => void }) {
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState("scenario");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!brief.trim()) return;
    setBusy(true); setErr(null);
    try { const r = await api.aiDraft(brief.trim(), mode); onDrafted(r.kind, r.item); }
    catch (e: any) { setErr(e?.message || "AI draft failed"); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-3 max-w-xl">
      <h3 className="text-base font-semibold text-ink">Draft an item with AI</h3>
      <p className="text-sm text-muted">Describe a skill or situation; AI drafts a finance item (kept draft for your review).</p>
      <div>
        <Label className="text-xs">Mode</Label>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 w-full h-9 rounded border border-rule bg-paper px-2 text-sm">
          <option value="scenario">Scenario</option><option value="case">Case study</option><option value="work_sample">Work sample</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Skill or brief</Label>
        <Textarea className="mt-1" rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. GST input-tax-credit reversal after 180 days" />
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
      <Button onClick={go} disabled={busy || !brief.trim()}><Sparkles className="h-4 w-4 mr-1.5" />{busy ? "Drafting…" : "Draft it"}</Button>
    </div>
  );
}

function FromJdPane({ wsId, onDone }: { wsId?: string; onDone: (msg: string) => void }) {
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!jd.trim()) return;
    setBusy(true); setErr(null);
    try {
      const { items } = await api.aiFromJd(jd.trim(), 5);
      let saved = 0;
      for (const it of items) { try { await api.createItem(it.mode || "scenario", it, wsId); saved++; } catch { /* skip */ } }
      onDone(`Generated + saved ${saved} draft${saved === 1 ? "" : "s"} from the JD.`);
    } catch (e: any) { setErr(e?.message || "Generate failed"); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-3 max-w-xl">
      <h3 className="text-base font-semibold text-ink">Generate a set from a job description</h3>
      <p className="text-sm text-muted">AI proposes items covering the role's key skills. All saved as drafts for review.</p>
      <Textarea className="mt-1" rows={8} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the JD / role description…" />
      {err && <p className="text-xs text-danger">{err}</p>}
      <Button onClick={go} disabled={busy || !jd.trim()}><FileText className="h-4 w-4 mr-1.5" />{busy ? "Generating…" : "Generate drafts"}</Button>
    </div>
  );
}

function AssignPane({ item, wsId, projectId, onDone }: { item: CatalogItem; wsId?: string; projectId?: string; onDone: (msg: string) => void }) {
  const poolReady = !!(wsId && projectId);
  const [tab, setTab] = useState<"pool" | "emails">(poolReady ? "pool" : "emails");
  const [emails, setEmails] = useState("");
  const [lists, setLists] = useState<CandidateListLite[]>([]);
  const [listId, setListId] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const candidates = useMemo(() => parseCandidates(emails), [emails]);

  useEffect(() => {
    if (tab !== "pool" || !wsId) return;
    setLoadingLists(true);
    listsApi.getLists(wsId)
      .then((ls: any[]) => setLists(ls || []))
      .catch(() => setLists([]))
      .finally(() => setLoadingLists(false));
  }, [tab, wsId]);

  async function assignEmails() {
    if (!candidates.length) return;
    setBusy(true); setErr(null);
    try {
      const res = await api.assign({ item_id: item.id, mode: item.mode, candidates, title: item.title });
      onDone(`Assigned to ${res.assigned ?? candidates.length} candidate(s).`);
    } catch (e: any) { setErr(e?.message || "Assignment failed"); }
    finally { setBusy(false); }
  }
  async function assignPool() {
    if (!listId || !wsId || !projectId) return;
    setBusy(true); setErr(null);
    try {
      const res = await api.assign({ item_id: item.id, mode: item.mode, list_id: listId, workspace_id: wsId, project_id: projectId, title: item.title });
      onDone(`Assigned the pool to ${res.assigned ?? 0} candidate(s).`);
    } catch (e: any) { setErr(e?.message || "Assignment failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 max-w-xl">
      <h3 className="text-base font-semibold text-ink">Assign “{item.title}”</h3>
      {item.status !== "curated" && (
        <p className="text-xs text-muted">Heads up: this item isn't published yet — candidates can only open it in test mode.</p>
      )}
      <div className="flex gap-1 border-b border-rule">
        {poolReady && (
          <button onClick={() => setTab("pool")} className={`px-3 py-1.5 text-sm ${tab === "pool" ? "border-b-2 border-gold text-ink" : "text-muted"}`}>From talent pool</button>
        )}
        <button onClick={() => setTab("emails")} className={`px-3 py-1.5 text-sm ${tab === "emails" ? "border-b-2 border-gold text-ink" : "text-muted"}`}>Paste emails</button>
      </div>

      {tab === "pool" ? (
        <div className="space-y-2">
          {loadingLists ? (
            <p className="text-sm text-muted">Loading pools…</p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted">No talent pools in this project. Use “Paste emails”.</p>
          ) : (
            <select value={listId} onChange={(e) => setListId(e.target.value)} className="w-full h-9 rounded border border-rule bg-paper px-2 text-sm">
              <option value="">Select a talent pool…</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.totalCandidates ?? 0})</option>)}
            </select>
          )}
          {err && <p className="text-xs text-danger">{err}</p>}
          <Button onClick={assignPool} disabled={busy || !listId}><Send className="h-4 w-4 mr-1.5" />{busy ? "Assigning…" : "Assign pool"}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted">One recipient per line — email, or "Name &lt;email&gt;".</p>
          <Textarea rows={6} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder={"priya@example.com\nArjun Mehta <arjun@example.com>"} className="font-mono text-xs" />
          <p className="text-xs text-muted">{candidates.length} valid recipient{candidates.length === 1 ? "" : "s"}</p>
          {err && <p className="text-xs text-danger">{err}</p>}
          <Button onClick={assignEmails} disabled={busy || !candidates.length}><Send className="h-4 w-4 mr-1.5" />{busy ? "Assigning…" : "Assign"}</Button>
        </div>
      )}
    </div>
  );
}
