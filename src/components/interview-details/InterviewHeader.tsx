import { useNavigate } from "react-router-dom";
import { CaretLeft } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui/shimmer";

interface InterviewHeaderProps {
  loading: boolean;
  title?: string;
  interviewId?: string;
  createdLabel?: string;
}

export function InterviewHeader({ loading, title, interviewId, createdLabel }: InterviewHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-background border-b border-border pb-4 pt-4 -mt-4 mb-4">
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/interviews/manage")}
          className="flex items-center gap-2 rounded-sm font-bold mt-1"
        >
          <CaretLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1">
          {loading ? (
            <div className="space-y-2">
              <Shimmer className="h-8 w-64" />
              <Shimmer className="h-4 w-96" />
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-foreground mb-2">{title}</h1>
              <p className="font-mono text-sm text-muted-2 mt-1">#{interviewId}</p>
              <p className="text-muted text-xs mt-0.5">Created on {createdLabel}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
