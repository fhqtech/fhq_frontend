/**
 * P2-2 — typed Add-stage menu. Lets a recruiter append a stage to a role's
 * pipeline by type. There are not four builders; there is one role with the
 * stages it needs. Selection bubbles up via onAdd; the container persists the
 * updated template.
 */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { StageType } from "@/services/recruiterJourneysApi";

const STAGE_TYPES: { value: StageType; label: string; desc: string }[] = [
  { value: "screen", label: "Screen", desc: "AI screening interview" },
  { value: "fitment", label: "Fitment", desc: "Deep role-fit interview" },
  { value: "interview", label: "Interview", desc: "AI interview" },
  { value: "assignment", label: "Assignment", desc: "Work sample" },
  { value: "review", label: "Review", desc: "Panel review" },
  { value: "decision", label: "Decision", desc: "Hiring decision" },
];

export interface AddStageMenuProps {
  onAdd: (type: StageType) => void;
  disabled?: boolean;
}

export function AddStageMenu({ onAdd, disabled }: AddStageMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="mr-1.5 h-4 w-4" /> Add stage
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {STAGE_TYPES.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onSelect={() => onAdd(t.value)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="text-sm font-medium text-ink">{t.label}</span>
            <span className="text-xs text-ink-soft">{t.desc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
