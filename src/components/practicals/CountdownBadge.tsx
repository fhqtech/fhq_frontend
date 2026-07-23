import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Renders the remaining time as mm:ss, warning tone under 2 minutes. Renders
 * nothing when there is no deadline (untimed submission). */
export function CountdownBadge({ remainingMs }: { remainingMs: number | null }) {
  if (remainingMs == null) return null;
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const warn = remainingMs <= 2 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-xs tabular-nums",
        warn ? "border border-danger text-danger" : "bg-paper-2 text-ink-soft",
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
