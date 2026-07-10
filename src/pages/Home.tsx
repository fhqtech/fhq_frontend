/**
 * P2-1 — Home / workspace pulse. The default post-login surface when role_home
 * is on: an NBA-sorted action queue of what's waiting on the recruiter, built
 * from the same interview snapshots + analytics rollup the dashboard loads.
 * Dashboard stays untouched as the legacy default when the flag is off.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useInterviewListLiveUpdates,
} from "@/hooks/useInterviewListLiveUpdates";
import {
  useInterviewsQuery,
  useInvalidateInterviewsOnRevision,
} from "@/queries/interviewsQueries";
import { analyticsApi } from "@/services/analyticsApi";
import type { ProjectDashboardResponse } from "@/types/analytics";
import type { InterviewSnapshot, InterviewStats } from "@/lib/nextBestAction";
import { buildActionQueue, type QueueItem } from "@/lib/buildActionQueue";
import { ActionQueue } from "@/components/home/ActionQueue";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageSkeleton } from "@/components/ui/shimmer";
import { useFlag } from "@/lib/flags/FlagProvider";
import { Bot } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { currentWorkspace, currentProject } = useWorkspace();
  const sampleRole = useFlag("sample_role");
  const oneBuilder = useFlag("one_builder"); // P2-2: first-run opens a role, not an interview

  // Same live-updates + interviews data the dashboard uses (not refactored here,
  // to keep the pilot's dashboard untouched while role_home is gated).
  const liveRevision = useInterviewListLiveUpdates(currentWorkspace?.id, currentProject?.id);
  useInvalidateInterviewsOnRevision(currentWorkspace?.id, currentProject?.id, liveRevision);
  const interviewsQuery = useInterviewsQuery(currentWorkspace?.id, currentProject?.id, { limit: 100 });
  const interviews = interviewsQuery.data?.interviews ?? [];
  const loading = interviewsQuery.isPending && Boolean(currentWorkspace && currentProject);
  const error = interviewsQuery.error instanceof Error ? interviewsQuery.error.message : null;

  const [dashboardData, setDashboardData] = useState<ProjectDashboardResponse | null>(null);
  useEffect(() => {
    if (!currentWorkspace?.id || !currentProject?.id) return;
    let cancelled = false;
    analyticsApi
      .getProjectDashboard(currentWorkspace.id, currentProject.id)
      .then((d) => {
        if (!cancelled) setDashboardData(d);
      })
      .catch(() => {
        /* the queue still renders from snapshots; rollup just refines counts */
      });
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id, currentProject?.id, liveRevision]);

  const snapshots: InterviewSnapshot[] = useMemo(
    () =>
      interviews.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        candidateCount: (i as any).candidates ?? i.candidateCount ?? 0,
        blueprintStatus: i.blueprintStatus,
        startedAt: (i as any).startedAt,
        type: (i as any).type,
      })),
    [interviews],
  );

  const statsById: Record<string, InterviewStats> = useMemo(() => {
    const m: Record<string, InterviewStats> = {};
    for (const r of dashboardData?.interviews_rollup ?? []) {
      m[r.id] = { totalCandidates: r.invited, completedCandidates: r.completed };
    }
    return m;
  }, [dashboardData]);

  const queue = useMemo(() => buildActionQueue(snapshots, statsById), [snapshots, statsById]);

  const onAction = (item: QueueItem) => {
    // First increment: the share/remind/start actions live on the detail page.
    navigate(`/interviews/${item.snapshot.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <header>
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">What needs you</h1>
        <p className="mt-2 max-w-[65ch] text-base text-ink-soft">
          Clear the queue: responses to review and live interviews, in priority order.
        </p>
      </header>

      {loading ? (
        <PageSkeleton header={false} cards={0} rows={5} cols={2} message="Loading your workspace…" />
      ) : error ? (
        <ErrorBanner tone="danger" title="Couldn't load your workspace" description={error} />
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Set up your first role"
          description="Open a role to start screening candidates. The graph builds itself from there."
          primaryAction={
            oneBuilder
              ? { label: "Open a role", onClick: () => navigate("/roles/new") }
              : { label: "Create your first interview", onClick: () => navigate("/interviews/create") }
          }
          sampleDataAction={sampleRole ? { label: "See a sample analysis", onClick: () => navigate("/sample-tag") } : undefined}
        />
      ) : (
        <ActionQueue items={queue} onAction={onAction} />
      )}
    </div>
  );
}
