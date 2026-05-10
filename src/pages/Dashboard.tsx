import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bot, Users, UserCheck, TrendingUp, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import { computeDashboardNBA, type InterviewSnapshot } from "@/lib/nextBestAction";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, currentProject } = useWorkspace();

  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback with token (preserved from old Dashboard).
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("auth_token", token);
      searchParams.delete("token");
      setSearchParams(searchParams, { replace: true });
      window.location.reload();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!currentWorkspace || !currentProject) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await interviewApi.getInterviews(currentWorkspace.id, currentProject.id, {
          limit: 100,
        });
        if (!cancelled) setInterviews(data.interviews ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load interviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace, currentProject]);

  const stats = useMemo(() => {
    const active = interviews.filter(
      (i) => i.status === "active" || i.status === "in-progress" || i.status === "running"
    ).length;
    const totalCandidates = interviews.reduce((sum, i) => sum + (i.candidates ?? i.candidateCount ?? 0), 0);
    const completedInterviews = interviews.filter((i) => i.status === "completed").length;
    const completionRate =
      interviews.length > 0 ? Math.round((completedInterviews / interviews.length) * 100) : 0;
    return { active, totalCandidates, completedInterviews, completionRate };
  }, [interviews]);

  const recentInterviews = useMemo(
    () =>
      [...interviews]
        .sort(
          (a, b) =>
            new Date(b.created ?? b.createdAt ?? 0).getTime() -
            new Date(a.created ?? a.createdAt ?? 0).getTime()
        )
        .slice(0, 5),
    [interviews]
  );

  const snapshots: InterviewSnapshot[] = useMemo(
    () =>
      interviews.map((i) => ({
        id: i.id,
        status: i.status,
        candidateCount: i.candidates ?? i.candidateCount ?? 0,
        blueprintStatus: i.blueprintStatus,
        startedAt: i.startedAt,
      })),
    [interviews]
  );

  const nba = useMemo(() => computeDashboardNBA(snapshots, loading), [snapshots, loading]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-foreground-muted mt-2">
            {loading
              ? "Loading your interviews…"
              : interviews.length === 0
              ? "Let's create your first interview."
              : `${interviews.length} interview${interviews.length === 1 ? "" : "s"} so far.`}
          </p>
        </div>
        <Button
          onClick={() => navigate("/interviews/create")}
          className="bg-gradient-primary border-0 shadow-brand"
        >
          Create New Interview
        </Button>
      </div>

      <NextBestActionCard nba={nba} />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading dashboard…
        </div>
      ) : interviews.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Bot className="w-12 h-12 text-foreground-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No interviews yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create an interview to start collecting candidate responses with Flowy. We'll guide you the rest of the way.
            </p>
            <Button onClick={() => navigate("/interviews/create")}>Create your first interview</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Active Interviews" value={stats.active} icon={Bot} variant="primary" />
            <StatsCard
              title="Total Candidates"
              value={stats.totalCandidates}
              icon={Users}
              variant="success"
            />
            <StatsCard title="Completed" value={stats.completedInterviews} icon={UserCheck} />
            <StatsCard
              title="Completion Rate"
              value={stats.completionRate}
              change={{ value: "%", positive: true }}
              icon={TrendingUp}
            />
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Recent interviews</CardTitle>
              <CardDescription>Click any row to open the interview details.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Candidates</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInterviews.map((interview) => (
                    <TableRow
                      key={interview.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/interviews/${interview.id}`)}
                    >
                      <TableCell className="font-medium">{interview.title ?? interview.id}</TableCell>
                      <TableCell>
                        <StatusBadge status={(interview.status as any) ?? "draft"} />
                      </TableCell>
                      <TableCell className="text-right">
                        {interview.candidates ?? interview.candidateCount ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-foreground-muted text-sm">
                        {interview.created ?? interview.createdAt
                          ? new Date(interview.created ?? interview.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
