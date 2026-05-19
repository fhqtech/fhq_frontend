/**
 * InterviewRollupTable — per-interview summary.
 *
 * Compact table: title, status, invited, completed, avg score. Sorted
 * by most-recently-updated (server side). Click → /interviews/{id}.
 */
import { useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, type Status } from "@/components/dashboard/StatusBadge";
import { cn } from "@/lib/utils";
import type { DashboardInterviewRollup } from "@/types/analytics";

interface InterviewRollupTableProps {
  interviews: DashboardInterviewRollup[];
  className?: string;
}

export function InterviewRollupTable({ interviews, className }: InterviewRollupTableProps) {
  const navigate = useNavigate();

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-ink">Per-interview rollup</CardTitle>
        <CardDescription className="text-xs text-muted">
          How each interview is performing right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {interviews.length === 0 ? (
          <EmptyState
            title="No interviews yet"
            description="Create your first interview to see how it's performing."
            icon={Briefcase}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Invited</TableHead>
                <TableHead className="text-xs text-right">Completed</TableHead>
                <TableHead className="text-xs text-right">Avg score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-paper-2"
                  onClick={() => navigate(`/interviews/${row.id}`)}
                >
                  <TableCell className="font-medium text-ink">
                    {row.title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={(row.status || "draft") as Status} />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-ink-soft">
                    {row.invited}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-ink-soft">
                    {row.completed}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-ink-soft">
                    {row.avg_score != null ? Math.round(row.avg_score) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
