import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface EmptyListCardProps {
  onClick: () => void;
}

export function EmptyListCard({ onClick }: EmptyListCardProps) {
  return (
    <Card
      className="p-4 transition-all duration-200 hover:shadow-lg cursor-pointer border-dashed border-2 hover:border-primary group"
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">Create New Candidate Pool</h3>
        <p className="text-xs text-muted-foreground">
          Add custom candidate pool
        </p>
      </div>
    </Card>
  );
}
