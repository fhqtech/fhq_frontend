/**
 * ThroughputChart — last-30-days line chart of interviews started vs
 * completed per day. Recruiter's "are we keeping pace?" pulse.
 */
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardThroughputBucket } from "@/types/analytics";

interface ThroughputChartProps {
  buckets: DashboardThroughputBucket[];
  className?: string;
}

const dayLabel = (iso: string): string => {
  // YYYY-MM-DD → "D MMM" (e.g. "12 May")
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1] || ""}`;
};

export function ThroughputChart({ buckets, className }: ThroughputChartProps) {
  const data = useMemo(
    () => buckets.map((b) => ({ ...b, label: dayLabel(b.date) })),
    [buckets],
  );
  const total = useMemo(
    () => buckets.reduce((sum, b) => sum + b.started + b.completed, 0),
    [buckets],
  );

  return (
    <Card className={cn("p-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-ink">Throughput</CardTitle>
        <CardDescription className="text-xs text-muted">
          Interviews started and completed, last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <div className="h-44 grid place-items-center text-xs text-muted">
            No interview activity in the last 30 days.
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#7C7567" }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#7C7567" }}
                  width={24}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="started"
                  name="Started"
                  stroke="#1D1D1F"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#8E6F2E"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
