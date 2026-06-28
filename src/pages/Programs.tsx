/**
 * Programs — route /programs. The recruiter front door to evaluation journeys:
 * lists every program (hiring or skill-analysis) and links into its pipeline.
 * "Build a program" opens the JourneyBuilder. Reuses recruiterJourneysApi.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Plus, RefreshCw, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { recruiterJourneysApi, type Program } from "@/services/recruiterJourneysApi";
import { Button } from "@/components/ui/button";
import { ShimmerTable } from "@/components/ui/shimmer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { cn } from "@/lib/utils";

const PURPOSE_LABEL: Record<string, string> = {
  hiring: "Hiring",
  skill_analysis: "Skill analysis",
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-info-soft text-info border-info/30",
  draft: "bg-paper-3 text-muted border-rule",
  archived: "bg-paper-3 text-muted border-rule",
};

export default function Programs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ws = user?.activeWorkspaceId;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (mode: "initial" | "refresh" = "initial") => {
    if (!ws) {
      setLoading(false);
      return;
    }
    mode === "refresh" ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setPrograms(await recruiterJourneysApi.listPrograms(ws));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load programs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
            Evaluation
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gold-ink" aria-hidden />
            Programs
          </h1>
          <p className="text-xs text-muted mt-1">
            One journey per role — screen, assignment, interview, decision — with a fused profile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold" size="sm" onClick={() => navigate("/journeys/new")} disabled={!ws}>
            <Plus className="w-4 h-4" />
            Build a program
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load("refresh")}
            disabled={loading || refreshing || !ws}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {!ws && (
        <ErrorBanner
          tone="warning"
          title="No active workspace"
          description="Select a workspace to view its programs."
        />
      )}

      {error && (
        <ErrorBanner
          tone="danger"
          title="Could not load programs"
          description={error}
          retryLabel="Try again"
          onRetry={() => load("initial")}
        />
      )}

      {loading ? (
        <ShimmerTable />
      ) : !error && programs.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No programs yet"
          description="Build a program to evaluate candidates through a staged journey."
          primaryAction={{ label: "Build a program", onClick: () => navigate("/journeys/new") }}
        />
      ) : (
        <ul className="divide-y divide-rule rounded-md border border-rule bg-paper">
          {programs.map((p) => (
            <li key={p.program_id}>
              <button
                type="button"
                onClick={() => navigate(`/programs/${p.program_id}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-paper-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {p.title || "Untitled program"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {PURPOSE_LABEL[p.purpose] ?? p.purpose}
                    {p.domain ? ` · ${p.domain}` : ""}
                  </p>
                </div>
                {p.status ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase",
                      STATUS_TONE[p.status] ?? "bg-paper-3 text-muted border-rule",
                    )}
                  >
                    {p.status}
                  </span>
                ) : null}
                <ChevronRight className="w-4 h-4 shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
