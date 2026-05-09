import { CheckCircle as UserCheck, Clock, Target } from "phosphor-react";
import { Card, CardContent } from "@/components/ui/card";
import { FitmentInterview } from "@/services/fitmentInterviewApi";

interface FitmentInterviewStatsProps {
  interviews: FitmentInterview[];
}

export function FitmentInterviewStats({ interviews }: FitmentInterviewStatsProps) {
  const totalFitments = interviews.length;
  const completedCount = interviews.filter(interview => interview.status === 'completed').length;
  const inProgressCount = interviews.filter(interview => interview.status === 'active').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary-light rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalFitments}</p>
              <p className="text-sm text-foreground-muted uppercase text-xs tracking-wider">Total Fitments</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success-light rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-sm text-foreground-muted uppercase text-xs tracking-wider">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-accent-light rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-brand-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
              <p className="text-sm text-foreground-muted uppercase text-xs tracking-wider">In Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
