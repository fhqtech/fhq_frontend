/**
 * P1 O5 — Pilot operational dashboard.
 *
 * A single-screen "are we healthy?" view for the 100-interview pilot.
 * Polls /api/admin/pilot-stats every 30 seconds. Surfaces the four
 * numbers an on-call engineer cares about during a live launch.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

interface PilotStatsResponse {
  now: string;
  sessions: {
    started_today: number;
    started_24h: number;
    completed_today: number;
    active: number;
  };
  reviewer: {
    results_written_today: number;
    failures_today: number;
    success_rate_today: number | null;
  };
}

export default function PilotDashboard() {
  const [stats, setStats] = useState<PilotStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
      const res = await fetch(`${apiBase}/api/admin/pilot-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`Stats endpoint returned ${res.status}`);
        return;
      }
      setStats(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load pilot stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const i = setInterval(fetchStats, 30_000); // refresh every 30s
    return () => clearInterval(i);
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12">
        <Card className="p-6 border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </Card>
      </div>
    );
  }

  const s = stats!.sessions;
  const r = stats!.reviewer;
  const successPct = r.success_rate_today != null ? Math.round(r.success_rate_today * 100) : null;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pilot dashboard</h1>
        <p className="text-sm text-muted">
          Auto-refreshes every 30s · last updated {new Date(stats!.now).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sessions today" value={s.started_today} hint={`${s.started_24h} in last 24h`} />
        <StatCard
          label="Currently active"
          value={s.active}
          hint="started, not yet completed"
          icon={<Activity className="w-4 h-4 text-emerald-500" />}
        />
        <StatCard label="Completed today" value={s.completed_today} />
        <StatCard
          label="Reviewer success"
          value={successPct != null ? `${successPct}%` : "—"}
          hint={`${r.results_written_today} written · ${r.failures_today} failed`}
          warn={successPct != null && successPct < 90}
        />
      </div>

      {r.failures_today > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <strong>{r.failures_today}</strong> reviewer failure{r.failures_today > 1 ? "s" : ""} today.
            Check Firestore <code className="font-mono">reviewer_failures</code> collection for details.
          </div>
        </Card>
      )}

      {r.failures_today === 0 && successPct === 100 && (
        <Card className="p-4 border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">All reviewer runs successful today.</div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  warn,
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  warn?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={`p-4 ${warn ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
