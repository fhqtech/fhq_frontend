import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CandidateNotesProps {
  notes: string;
  onChange?: (notes: string) => void;
  readOnly?: boolean;
  maxLength?: number;
  placeholder?: string;
  lastUpdated?: string;
}

export function CandidateNotes({
  notes,
  onChange,
  readOnly = false,
  maxLength = 1000,
  placeholder = "Add your notes here...",
  lastUpdated,
}: CandidateNotesProps) {
  const characterCount = notes.length;
  const isNearLimit = characterCount > maxLength * 0.9;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    if (newNotes.length <= maxLength && onChange) {
      onChange(newNotes);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="candidate-notes" className="text-sm font-medium">
        Additional Notes (Optional)
      </Label>

      <Textarea
        id="candidate-notes"
        value={notes}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={cn(
          "min-h-[120px] resize-y",
          readOnly && "cursor-default bg-muted"
        )}
        maxLength={maxLength}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={cn(
          isNearLimit && "text-orange-ink font-medium"
        )}>
          {characterCount} / {maxLength} characters
        </span>

        {lastUpdated && (
          <span>
            Last updated: {new Date(lastUpdated).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        )}
      </div>
    </div>
  );
}
