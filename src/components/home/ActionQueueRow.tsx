/**
 * P2-1 — one row in the action queue: the interview and its single resolved
 * next-best-action. The verb either navigates (href, e.g. review responses) or
 * fires an inline action (share/remind/start), so the recruiter acts without
 * first opening a detail page.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { QueueItem } from "@/lib/buildActionQueue";

export interface ActionQueueRowProps {
  item: QueueItem;
  onAction?: (item: QueueItem, action: string) => void;
}

export function ActionQueueRow({ item, onAction }: ActionQueueRowProps) {
  const { snapshot, nba } = item;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-rule px-4 py-3 first:border-t-0">
      <div className="min-w-0">
        <Link
          to={`/interviews/${snapshot.id}`}
          className="block truncate text-sm font-medium text-ink hover:underline"
        >
          {snapshot.title || "Untitled interview"}
        </Link>
        {nba.hint && <p className="mt-0.5 text-xs text-ink-soft">{nba.hint}</p>}
      </div>
      <div className="shrink-0">
        {nba.href ? (
          <Button asChild variant="outline" size="sm">
            <Link to={nba.href}>{nba.label}</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={nba.pending}
            onClick={() => onAction?.(item, nba.action || "open")}
          >
            {nba.label}
          </Button>
        )}
      </div>
    </div>
  );
}
