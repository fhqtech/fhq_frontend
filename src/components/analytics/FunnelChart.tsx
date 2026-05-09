import { Card } from "@/components/ui/card";
import { AnalyticsCandidate } from "@/types/analytics";

interface FunnelChartProps {
  candidates: AnalyticsCandidate[];
}

const stages = [
  { key: 'screening', label: 'Screening', color: 'bg-chart-1' },
  { key: 'prelims', label: 'Preliminary', color: 'bg-chart-2' },
  { key: 'fitment', label: 'Fitment', color: 'bg-chart-3' },
  { key: 'final', label: 'Final Review', color: 'bg-chart-4' },
  { key: 'selected', label: 'Selected', color: 'bg-success' }
];

export function FunnelChart({ candidates }: FunnelChartProps) {
  const stageCounts = stages.map(stage => ({
    ...stage,
    count: candidates.filter(c => c.stage === stage.key).length
  }));

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Candidate Pipeline</h3>
      <div className="space-y-3">
        {stageCounts.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const prevCount = index > 0 ? stageCounts[index - 1].count : stage.count;
          const conversionRate = prevCount > 0 ? ((stage.count / prevCount) * 100).toFixed(0) : '100';

          return (
            <div key={stage.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">{stage.label}</span>
                <div className="flex items-center gap-3">
                  {index > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {conversionRate}% conversion
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">{stage.count}</span>
                </div>
              </div>
              <div className="relative h-10 bg-secondary rounded-lg overflow-hidden">
                <div
                  className={`h-full ${stage.color} transition-all duration-500 ease-out flex items-center px-4 group-hover:opacity-90`}
                  style={{ width: `${widthPercent}%` }}
                >
                  {stage.count > 0 && (
                    <span className="text-xs font-medium text-white/90">
                      {stage.count} candidate{stage.count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
