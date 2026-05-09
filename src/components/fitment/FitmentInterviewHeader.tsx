import { Upload } from "phosphor-react";
import { Button } from "@/components/ui/button";

interface FitmentInterviewHeaderProps {
  onCreateNew: () => void;
}

export function FitmentInterviewHeader({ onCreateNew }: FitmentInterviewHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground uppercase tracking-wider">Role Fitment</h1>
        <p className="text-foreground-muted mt-2 uppercase text-xs tracking-wider">
          Specialized interviews tailored to specific job roles and requirements.
        </p>
      </div>
      <Button
        className="text-white font-medium rounded-sm uppercase transition-all duration-200"
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#222831',
          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
          textTransform: 'uppercase'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
        onClick={onCreateNew}
      >
        <Upload className="w-4 h-4 mr-2" />
        Create New
      </Button>
    </div>
  );
}
