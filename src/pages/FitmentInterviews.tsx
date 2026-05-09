import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Clock, Target } from "phosphor-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import { FitmentInterviewHeader } from "@/components/fitment/FitmentInterviewHeader";
import { HowFitmentWorks } from "@/components/fitment/HowFitmentWorks";
import { FitmentInterviewTable } from "@/components/fitment/FitmentInterviewTable";

export default function FitmentInterviews() {
  const [fitmentInterviewsData, setFitmentInterviewsData] = useState<any[]>([]);
  const [isLoadingFitmentInterviews, setIsLoadingFitmentInterviews] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentWorkspace, currentProject } = useWorkspace();

  // Load data on component mount
  useEffect(() => {
    if (currentWorkspace?.id && currentProject?.id) {
      loadFitmentInterviews();
    }
  }, [currentWorkspace?.id, currentProject?.id]);

  const loadFitmentInterviews = async () => {
    try {
      console.log('🔄 Loading fitment interviews...');
      setIsLoadingFitmentInterviews(true);
      const response = await interviewApi.getFitmentInterviews(
        currentWorkspace!.id,
        currentProject!.id
      );
      console.log('✅ Fitment interviews loaded:', response);
      setFitmentInterviewsData(response.fitmentInterviews);
    } catch (error) {
      console.error('❌ Error loading fitment interviews:', error);
      toast({
        title: "Error",
        description: "Failed to load fitment interviews. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFitmentInterviews(false);
    }
  };


  const handleCreateNew = () => {
    navigate('/interviews/create?type=fitment&duration=20');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <FitmentInterviewHeader onCreateNew={handleCreateNew} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-sm p-6 bg-white" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
          <div className="flex items-center gap-4">
            <p className="text-5xl font-bold text-foreground">{fitmentInterviewsData.length}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>Total</div>
              <div>Fitments</div>
            </div>
          </div>
        </div>
        <div className="rounded-sm p-6 bg-white" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
          <div className="flex items-center gap-4">
            <p className="text-5xl font-bold text-foreground">{fitmentInterviewsData.filter(interview => interview.status === 'completed').length}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>Completed</div>
            </div>
          </div>
        </div>
        <div className="rounded-sm p-6 bg-white" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
          <div className="flex items-center gap-4">
            <p className="text-5xl font-bold text-foreground">{fitmentInterviewsData.filter(interview => interview.status === 'active').length}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>In Progress</div>
            </div>
          </div>
        </div>
      </div>

      {/* How Fitment Works */}
      <HowFitmentWorks />

      {/* Fitment Interviews Table */}
      <FitmentInterviewTable
        fitmentInterviews={fitmentInterviewsData}
        isLoading={isLoadingFitmentInterviews}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
}