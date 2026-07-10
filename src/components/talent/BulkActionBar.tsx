/**
 * P3-4 — floating bulk action bar. Renders only when a selection exists; centred
 * at the foot of the surface. "Compare" is live for a legible 2–4 picks; "clear"
 * resets. Motion is CSS-only (translate + opacity) per the design constraints.
 */
import { Button } from "@/components/ui/button";
import { GitCompare, X } from "lucide-react";

export interface BulkActionBarProps {
  count: number;
  /** Compare reads well for 2–4 graphs; the caller decides the range. */
  canCompare: boolean;
  onCompare: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, canCompare, onCompare, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-6">
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-rule bg-ink px-4 py-2 text-paper shadow-3"
      >
        <span className="font-mono tabular-nums text-xs">
          {count} selected
        </span>
        <span className="h-4 w-px bg-paper/20" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCompare}
          disabled={!canCompare}
          className="h-8 text-paper hover:bg-paper/10 hover:text-paper disabled:opacity-40"
        >
          <GitCompare className="mr-1.5 h-4 w-4" />
          Compare
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 text-paper hover:bg-paper/10 hover:text-paper"
        >
          <X className="mr-1.5 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
