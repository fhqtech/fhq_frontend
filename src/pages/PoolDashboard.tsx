/**
 * Pool TAG Dashboard — T3 of FunnelHQ repositioning.
 *
 * Mirrors funnelhq.co/GST_Talent_Dashboard.html: aggregate view of a
 * qualified list's candidates with quality + experience distributions,
 * top skills present, sort + filter, and shortlist counter.
 *
 * Route: /lists/:listId/pool   (added in App.tsx)
 */
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/shimmer";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ArrowLeft, Users, Filter, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { usePoolDashboardQuery, type PoolCandidate } from "@/queries/poolQueries";

const QUALITY_COLORS: Record<string, string> = {
  gap: "bg-danger-soft text-danger",
  developing: "bg-orange-100 text-orange-700",
  strong: "bg-success-soft text-success",
  expert: "bg-emerald-100 text-emerald-700",
};

const QUALITY_LABELS: Record<string, string> = {
  gap: "Gap (<50)",
  developing: "Developing (50-69)",
  strong: "Strong (70-84)",
  expert: "Expert (85+)",
};

export default function PoolDashboard() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const workspaceId = typeof window !== "undefined" ? localStorage.getItem("currentWorkspaceId") : null;

  const poolQuery = usePoolDashboardQuery(workspaceId, listId);
  const stats = poolQuery.data?.stats ?? null;
  const candidates: PoolCandidate[] = poolQuery.data?.candidates ?? [];
  const loading = poolQuery.isPending && Boolean(workspaceId && listId);
  const error = !workspaceId || !listId
    ? "Workspace or list ID missing."
    : poolQuery.error instanceof Error
      ? poolQuery.error.message || "Failed to load pool"
      : null;

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [mustHaveSkill, setMustHaveSkill] = useState<string>("");
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"score-desc" | "score-asc" | "experience">("score-desc");

  const filtered = useMemo(() => {
    let list = candidates.filter((c) => {
      const s = (c.overallScore ?? c.overall_score ?? 0) as number;
      if (s < minScore) return false;
      if (mustHaveSkill) {
        const v = c.scores?.[mustHaveSkill];
        if (!v || v < 70) return false;
      }
      return true;
    });
    list = list.sort((a, b) => {
      const sa = (a.overallScore ?? a.overall_score ?? 0) as number;
      const sb = (b.overallScore ?? b.overall_score ?? 0) as number;
      if (sortKey === "score-desc") return sb - sa;
      if (sortKey === "score-asc") return sa - sb;
      const ea = (a.yearsExperience ?? 0) as number;
      const eb = (b.yearsExperience ?? 0) as number;
      return eb - ea;
    });
    return list;
  }, [candidates, minScore, mustHaveSkill, sortKey]);

  const toggleShortlist = (id: string) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCsv = () => {
    const ts = new Date().toISOString().slice(0, 10);
    const header = ["Name", "Score", "Years experience", "Status", "Shortlisted"];
    const rows = filtered.map((c) => [
      c.name || "",
      (c.overallScore ?? c.overall_score ?? "") as number | "",
      c.yearsExperience ?? "",
      c.status || "",
      shortlist.has(c.id) ? "yes" : "no",
    ]);
    downloadCsv(`talent-pool-${listId || "list"}-${ts}.csv`, [header, ...rows]);
  };

  if (loading) {
    return <PageSkeleton header cards={3} rows={8} cols={3} message="Loading talent pool…" />;
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <ErrorBanner
          tone="danger"
          title="Couldn't load talent pool"
          description={error || "Pool stats unavailable."}
          retryLabel="Try again"
          onRetry={() => poolQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(`/lists/${listId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Talent Pool Dashboard</h1>
            <p className="text-sm text-muted">
              {stats.total} candidate{stats.total === 1 ? "" : "s"} · {stats.evaluated} evaluated
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Users className="mr-1 h-3 w-3" /> Shortlist: {shortlist.size}
          </Badge>
          <Button disabled={shortlist.size === 0} variant="default">
            Send shortlist to client
          </Button>
        </div>
      </div>

      {/* Top widgets: quality + experience + top skills */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold text-muted">
            Quality distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.quality_distribution).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <Badge className={QUALITY_COLORS[k] + " text-xs"}>{QUALITY_LABELS[k]}</Badge>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold text-muted">
            Experience distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.experience_distribution).map(([bucket, count]) => (
              <div key={bucket} className="flex items-center justify-between text-sm">
                <span>{bucket} yrs</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold text-muted">
            Top skills (≥70)
          </h3>
          <div className="space-y-2">
            {stats.top_skills.length === 0 && (
              <p className="text-sm text-muted-2">No skill coverage yet.</p>
            )}
            {stats.top_skills.slice(0, 6).map((s) => (
              <div key={s.skill} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.skill}</span>
                <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Filters bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              Min overall score
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-28"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              Must have skill ≥70
            </label>
            <select
              value={mustHaveSkill}
              onChange={(e) => setMustHaveSkill(e.target.value)}
              className="h-10 rounded border border-rule-strong bg-paper px-3 text-sm"
            >
              <option value="">— any —</option>
              {stats.top_skills.map((s) => (
                <option key={s.skill} value={s.skill}>
                  {s.skill}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              Sort
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="h-10 rounded border border-rule-strong bg-paper px-3 text-sm"
            >
              <option value="score-desc">Score (high → low)</option>
              <option value="score-asc">Score (low → high)</option>
              <option value="experience">Experience (high → low)</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted">
            <span>
              <Filter className="mr-1 inline h-4 w-4" />
              Showing <span className="font-semibold">{filtered.length}</span> of {stats.total}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              aria-label="Export filtered applicants as CSV"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Candidate rows */}
      <Card className="overflow-hidden">
        <div className="border-b bg-paper-2 px-4 py-2 text-xs font-semibold text-muted">
          Candidates
        </div>
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">
              No candidates match these filters. Loosen the score or skill requirement above.
            </div>
          )}
          {filtered.map((c) => {
            const score = (c.overallScore ?? c.overall_score ?? 0) as number;
            const yoe = c.yearsExperience ?? 0;
            const isShortlisted = shortlist.has(c.id);
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-paper-2 ${
                  isShortlisted ? "bg-info-soft/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name || c.id}</span>
                    {c.status && <Badge variant="outline" className="text-xs">{c.status}</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {yoe} yrs experience
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold">{score || "—"}</div>
                    <div className="text-xs text-muted">Overall</div>
                  </div>
                  <Button
                    size="sm"
                    variant={isShortlisted ? "default" : "outline-solid"}
                    onClick={() => toggleShortlist(c.id)}
                  >
                    {isShortlisted ? "Shortlisted" : "Shortlist"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
