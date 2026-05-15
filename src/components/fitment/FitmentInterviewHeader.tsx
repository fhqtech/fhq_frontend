import { Upload } from "phosphor-react";
import { Button } from "@/components/ui/button";

interface FitmentInterviewHeaderProps {
  onCreateNew: () => void;
}

export function FitmentInterviewHeader({ onCreateNew }: FitmentInterviewHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Role Fitment</h1>
        <p className="text-muted mt-2 uppercase text-xs tracking-wider">
          Specialized interviews tailored to specific job roles and requirements.
        </p>
      </div>
      <Button
        className="text-paper font-medium rounded-sm uppercase transition-all duration-200"
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'hsl(var(--ink))',
          boxShadow: 'var(--shadow-clay)',
          textTransform: 'uppercase'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink-soft))'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--ink))'}
        onClick={onCreateNew}
      >
        <Upload className="w-4 h-4 mr-2" />
        Create New
      </Button>
    </div>
  );
}
