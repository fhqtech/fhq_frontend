import { useEffect, useState } from "react";
import { ShimmerCard } from "@/components/ui/shimmer";

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 800;
    const steps = Math.min(value, 20);
    const increment = value / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue}{suffix}</>;
}

interface InterviewKpiTilesProps {
  loading: boolean;
  totalApplicants: number;
  completedApplicants: number;
  eligibleForFitment: number;
  participationRate: number;
}

const tileShellClasses = "rounded-sm p-6 bg-paper transition-shadow duration-200";
const tileShellStyle = { boxShadow: 'var(--shadow-clay)' as const };
const labelClasses = "text-sm text-muted text-xs tracking-wider leading-tight";

export function InterviewKpiTiles({
  loading,
  totalApplicants,
  completedApplicants,
  eligibleForFitment,
  participationRate,
}: InterviewKpiTilesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className={tileShellClasses} style={tileShellStyle}>
        {loading ? (
          <ShimmerCard />
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={totalApplicants} />
            </p>
            <div className={labelClasses}>
              <div>Total</div>
              <div>applicants</div>
            </div>
          </div>
        )}
      </div>

      <div className={tileShellClasses} style={tileShellStyle}>
        {loading ? (
          <ShimmerCard />
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={completedApplicants} />
            </p>
            <div className={labelClasses}>
              <div>Completed</div>
            </div>
          </div>
        )}
      </div>

      <div className={tileShellClasses} style={tileShellStyle}>
        {loading ? (
          <ShimmerCard />
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={eligibleForFitment} />
            </p>
            <div className={labelClasses}>
              <div>Eligible for</div>
              <div>fitment</div>
            </div>
          </div>
        )}
      </div>

      <div className={tileShellClasses} style={tileShellStyle}>
        {loading ? (
          <ShimmerCard />
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-3xl font-bold text-foreground">
              <AnimatedCounter value={participationRate} suffix="%" />
            </p>
            <div className={labelClasses}>
              <div>Participation</div>
              <div>rate</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
