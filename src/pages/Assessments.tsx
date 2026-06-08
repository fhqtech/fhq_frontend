/**
 * Assessments (recruiter) — assign a case / scenario / work-sample to candidates.
 * Pick an item from the catalog, add candidate emails, assign. Each candidate
 * then sees it as a card in their dashboard and it feeds their skill journey.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  recruiterAssessmentsApi,
  type CatalogItem,
} from "@/services/recruiterAssessmentsApi";

const MODE_LABEL: Record<string, string> = {
  scenario: "Scenario",
  case: "Case study",
  work_sample: "Work sample",
  defense: "Defense",
};

function parseCandidates(raw: string): { name: string; email: string }[] {
  // One per line: "email" or "Name <email>" or "Name, email".
  const out: { name: string; email: string }[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const angle = line.match(/^(.*?)<([^>]+)>$/);
    if (angle) { out.push({ name: angle[1].trim() || angle[2].trim(), email: angle[2].trim() }); continue; }
    const comma = line.split(",").map((s) => s.trim());
    if (comma.length === 2 && comma[1].includes("@")) { out.push({ name: comma[0], email: comma[1] }); continue; }
    out.push({ name: line.split("@")[0], email: line });
  }
  return out.filter((c) => c.email.includes("@"));
}

export default function Assessments() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [emails, setEmails] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    recruiterAssessmentsApi
      .getCatalog()
      .then((items) => !cancelled && setCatalog(items))
      .catch((e) => !cancelled && setError(e?.message || "Could not load the catalog."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => catalog.find((c) => c.id === selectedId), [catalog, selectedId]);
  const candidates = useMemo(() => parseCandidates(emails), [emails]);
  const canAssign = !!selected && candidates.length > 0 && !assigning;

  async function assign() {
    if (!selected || !candidates.length) return;
    setAssigning(true);
    setError(null);
    setDone(null);
    try {
      const res = await recruiterAssessmentsApi.assign({
        item_id: selected.id, mode: selected.mode, candidates,
        title: `${MODE_LABEL[selected.mode]} — ${selected.title}`,
      });
      setDone(res.assigned ?? candidates.length);
      setEmails("");
    } catch (e: any) {
      setError(e?.message || "Assignment failed.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Assessments</span>
        <h1 className="text-2xl font-semibold text-ink mt-1">Assign an assessment</h1>
        <p className="text-sm text-muted mt-1">
          Pick an item and add candidates. Each candidate sees it in their dashboard; results feed their skill journey.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">Loading the catalog…</p>
      ) : catalog.length === 0 ? (
        <EmptyState
          title="No assessment content yet"
          description="Once assessment items are curated (or test mode is on), they'll appear here to assign."
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pick an item */}
          <Card className="p-0">
            <CardHeader>
              <CardTitle className="text-base text-ink flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted" /> Choose an item
              </CardTitle>
              <CardDescription className="text-xs">{catalog.length} available</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-rule max-h-[420px] overflow-auto">
                {catalog.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full text-left px-5 py-3 hover:bg-paper-2 transition-colors ${selectedId === it.id ? "bg-paper-2" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gold-ink">
                          {MODE_LABEL[it.mode] || it.mode}
                        </span>
                        <span className="text-[10px] text-muted">{it.status}</span>
                      </div>
                      <p className="text-sm text-ink mt-0.5 line-clamp-2">{it.title}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Candidates + assign */}
          <Card className="p-0">
            <CardHeader>
              <CardTitle className="text-base text-ink">Candidates</CardTitle>
              <CardDescription className="text-xs">
                One per line — email, or "Name &lt;email&gt;".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Selected item</Label>
                <p className="text-sm text-ink mt-1">
                  {selected ? `${MODE_LABEL[selected.mode]} — ${selected.title}` : <span className="text-muted">Pick an item on the left.</span>}
                </p>
              </div>
              <div>
                <Label htmlFor="emails" className="text-xs">Candidate emails</Label>
                <Textarea
                  id="emails" rows={6} value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder={"priya@example.com\nArjun Mehta <arjun@example.com>"}
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-xs text-muted mt-1">{candidates.length} valid recipient{candidates.length === 1 ? "" : "s"}</p>
              </div>

              {error && (
                <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                  <AlertCircle className="h-3.5 w-3.5" /> {error}
                </p>
              )}
              {done != null && (
                <p className="text-xs text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Assigned to {done} candidate{done === 1 ? "" : "s"}.
                </p>
              )}

              <Button onClick={assign} disabled={!canAssign} className="rounded">
                {assigning ? "Assigning…" : "Assign assessment"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
