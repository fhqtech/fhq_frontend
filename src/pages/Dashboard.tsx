import { Users, Robot as Bot, Calendar, TrendUp as TrendingUp, CheckCircle as UserCheck, Clock, Star } from "phosphor-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Mock data
const recentInterviews = [
  { id: 1, candidate: "Sarah Johnson", position: "Senior Accountant", status: "completed", score: 87, date: "2024-01-15" },
  { id: 2, candidate: "Michael Chen", position: "Tax Consultant", status: "in-progress", score: null, date: "2024-01-15" },
  { id: 3, candidate: "Emily Davis", position: "Financial Analyst", status: "scheduled", score: null, date: "2024-01-16" },
  { id: 4, candidate: "James Wilson", position: "Audit Manager", status: "completed", score: 92, date: "2024-01-14" },
  { id: 5, candidate: "Lisa Rodriguez", position: "Bookkeeper", status: "under-review", score: 78, date: "2024-01-13" }
];

const topCandidates = [
  { name: "James Wilson", position: "Audit Manager", score: 92, status: "shortlisted" },
  { name: "Sarah Johnson", position: "Senior Accountant", score: 87, status: "completed" },
  { name: "David Kim", position: "Tax Specialist", score: 85, status: "shortlisted" },
  { name: "Maria Garcia", position: "Financial Analyst", score: 83, status: "completed" }
];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle OAuth callback with token
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Store the token
      localStorage.setItem('auth_token', token);
      
      // Clean up URL by removing the token parameter
      searchParams.delete('token');
      setSearchParams(searchParams, { replace: true });
      
      // Reload to update auth state
      window.location.reload();
    }
  }, [searchParams, setSearchParams]);
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground-muted mt-2">
            Welcome back! Here's an overview of your AI interviewer performance.
          </p>
        </div>
        <Button className="bg-gradient-primary border-0 shadow-brand">
          Create New Interview
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Interviews"
          value={12}
          change={{ value: "+3 from last week", positive: true }}
          icon={Bot}
          variant="primary"
        />
        <StatsCard
          title="Total Candidates"
          value={248}
          change={{ value: "+18 this month", positive: true }}
          icon={Users}
          variant="success"
        />
        <StatsCard
          title="Completed Interviews"
          value={187}
          change={{ value: "85% completion rate", positive: true }}
          icon={UserCheck}
        />
        <StatsCard
          title="Average Score"
          value={78.5}
          change={{ value: "+5.2 points", positive: true }}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Interviews */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-primary" />
              Recent Interviews
            </CardTitle>
            <CardDescription>
              Latest candidate interviews and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInterviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">
                      {interview.candidate}
                    </TableCell>
                    <TableCell className="text-foreground-muted">
                      {interview.position}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={interview.status as any} />
                    </TableCell>
                    <TableCell>
                      {interview.score ? (
                        <span className="font-semibold text-foreground">
                          {interview.score}%
                        </span>
                      ) : (
                        <span className="text-foreground-muted">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-brand-primary" />
              Top Performing Candidates
            </CardTitle>
            <CardDescription>
              Highest scoring candidates from recent interviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCandidates.map((candidate, index) => (
                <div key={candidate.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary text-white text-sm font-semibold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{candidate.name}</p>
                      <p className="text-sm text-foreground-muted">{candidate.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-foreground">{candidate.score}%</span>
                    <StatusBadge status={candidate.status as any} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}