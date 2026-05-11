/**
 * Pool TAG Dashboard — T3 of FunnelHQ repositioning.
 *
 * Mirrors funnelhq.co/GST_Talent_Dashboard.html: aggregate view of a
 * qualified list's candidates with quality + experience distributions,
 * top skills present, sort + filter, and shortlist counter.
 *
 * Route: /lists/:listId/pool   (added in App.tsx)
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, ArrowLeft, Users, Filter } from "lucide-react";

interface PoolStats {
  total: number;
  evaluated: number;
  quality_distribution: { gap: number; developing: number; strong: number; expert: number };
  experience_distribution: Record<string, number>;
  top_skills: { skill: string; count: number }[];
  jd_coverage: { candidate_id: string; skill: string; score: number }[];
}

interface PoolCandidate {
  id: string;
  name?: string;
  overallScore?: number;
  overall_score?: number;
  yearsExperience?: number;
  scores?: Record<string, number>;
  status?: string;
}

const QUALITY_COLORS: Record<string, string> = {
  gap: "bg-red-100 text-red-700",
  developing: "bg-orange-100 text-orange-700",
  strong: "bg-green-100 text-green-700",
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
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Filters
  const [minScore, setMinScore] = useState(0);
  const [mustHaveSkill, setMustHaveSkill] = useState<string>("");
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"score-desc" | "score-asc" | "experience">("score-desc");

  useEffect(() => {
    const wsId = localStorage.getItem("currentWorkspaceId");
    setWorkspaceId(wsId);
    if (!wsId || !listId) {
      setError("Workspace or list ID missing.");
      setLoading(false);
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
    const token = localStorage.getItem("auth_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${apiBase}/api/workspaces/${wsId}/qualified-lists/${listId}/pool-stats`, { headers }).then((r) => r.json()),
      fetch(`${apiBase}/api/workspaces/${wsId}/qualified-lists/${listId}/candidates?limit=500`, { headers }).then((r) => r.json()),
    ])
      .then(([poolRes, candidatesRes]) => {
        if (poolRes?.success === false) throw new Error("Pool stats failed");
        setStats(poolRes);
        setCandidates(candidatesRes?.candidates || []);
      })
      .catch((e) => setError(e?.message || "Failed to load pool"))
      .finally(() => setLoading(false));
  }, [listId]);

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <Card className="flex items-center gap-3 border-red-200 bg-red-50 p-6 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <span>{error || "Pool stats unavailable."}</span>
        </Card>
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
            <p className="text-sm text-slate-500">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Top skills (≥70)
          </h3>
          <div className="space-y-2">
            {stats.top_skills.length === 0 && (
              <p className="text-sm text-slate-400">No skill coverage yet.</p>
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Must have skill ≥70
            </label>
            <select
              value={mustHaveSkill}
              onChange={(e) => setMustHaveSkill(e.target.value)}
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm"
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sort
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="score-desc">Score (high → low)</option>
              <option value="score-asc">Score (low → high)</option>
              <option value="experience">Experience (high → low)</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-slate-500">
            <Filter className="mr-1 inline h-4 w-4" />
            Showing <span className="font-semibold">{filtered.length}</span> of {stats.total}
          </div>
        </div>
      </Card>

      {/* Candidate rows */}
      <Card className="overflow-hidden">
        <div className="border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Candidates
        </div>
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
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
                className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50 ${
                  isShortlisted ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name || c.id}</span>
                    {c.status && <Badge variant="outline" className="text-xs">{c.status}</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {yoe} yrs experience
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold">{score || "—"}</div>
                    <div className="text-xs text-slate-500">Overall</div>
                  </div>
                  <Button
                    size="sm"
                    variant={isShortlisted ? "default" : "outline"}
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
