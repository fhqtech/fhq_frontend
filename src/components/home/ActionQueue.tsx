/**
 * P2-1 — the workspace-pulse action queue. NBA-sorted sections of what's
 * waiting on the recruiter; an empty queue is a good state ("you're caught up"),
 * not dead space. Pure presentation over QueueItem[] from buildActionQueue.
 */
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionQueueRow } from "./ActionQueueRow";
import type { QueueItem } from "@/lib/buildActionQueue";

export interface ActionQueueProps {
  items: QueueItem[];
  onAction?: (item: QueueItem, action: string) => void;
}

const SECTIONS: { bucket: QueueItem["bucket"]; title: string }[] = [
  { bucket: "results", title: "Responses to review" },
  { bucket: "live", title: "Live now" },
];

export function ActionQueue({ items, onAction }: ActionQueueProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="You're caught up"
        description="No interviews are waiting on you right now. New responses and live interviews will appear here."
      />
    );
  }

  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => {
        const sectionItems = items.filter((i) => i.bucket === section.bucket);
        if (sectionItems.length === 0) return null;
        return (
          <section key={section.bucket}>
            <h2 className="mb-2 text-sm font-semibold text-ink">{section.title}</h2>
            <div className="rounded-md border border-rule bg-paper">
              {sectionItems.map((item) => (
                <ActionQueueRow key={item.id} item={item} onAction={onAction} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
