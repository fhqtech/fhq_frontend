/**
 * Roles — route /roles. The recruiter front door: lists every role and links
 * into its pipeline. "Open a role" opens the create-role flow. Reuses
 * recruiterJourneysApi.
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

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

/** Compact relative time ("3d ago") from an ISO string; null if unparseable. */
function relTime(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < hour) return "just now";
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return `${Math.floor(diff / (30 * day))}mo ago`;
}

/** Config readiness a recruiter can act on, derived from the program doc alone
 * (no per-role aggregate exists server-side): a role needs a saved journey
 * pipeline before it can screen anyone. */
function readiness(p: Program): { label: string; ready: boolean } {
  const hasJourney = Boolean(p.journey_template_id);
  return hasJourney
    ? { label: "Journey ready", ready: true }
    : { label: "Setup pending", ready: false };
}

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
      setError(err instanceof Error ? err.message : "Could not load roles.");
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
            Hiring
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gold-ink" aria-hidden />
            Roles
          </h1>
          <p className="text-xs text-muted mt-1">
            One journey per role — screen, assignment, interview, decision — with a fused profile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gold" size="sm" onClick={() => navigate("/roles/new")} disabled={!ws}>
            <Plus className="w-4 h-4" />
            Open a role
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
          description="Select a workspace to view its roles."
        />
      )}

      {error && (
        <ErrorBanner
          tone="danger"
          title="Could not load roles"
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
          title="No roles yet"
          description="Open a role to evaluate candidates through a staged pipeline."
          primaryAction={{ label: "Open a role", onClick: () => navigate("/roles/new") }}
        />
      ) : (
        <ul className="divide-y divide-rule rounded-md border border-rule bg-paper">
          {programs.map((p) => (
            <li key={p.program_id}>
              <button
                type="button"
                onClick={() => navigate(`/roles/${p.program_id}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-paper-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {p.title || "Untitled role"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {PURPOSE_LABEL[p.purpose] ?? p.purpose}
                    {p.domain ? ` · ${p.domain}` : ""}
                  </p>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] font-medium",
                      readiness(p).ready ? "text-success" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        readiness(p).ready ? "bg-success" : "bg-rule-strong",
                      )}
                      aria-hidden
                    />
                    {readiness(p).label}
                  </span>
                  {relTime(p.updatedAt) ? (
                    <span className="font-mono text-[11px] tabular-nums text-muted">
                      Updated {relTime(p.updatedAt)}
                    </span>
                  ) : null}
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
