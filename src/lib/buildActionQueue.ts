/**
 * P2-1 — assemble the workspace-pulse action queue from the interview snapshots
 * the dashboard already loads, plus the analytics rollup for real completed
 * counts. The queue is only the things awaiting the recruiter's action:
 *   - results: an interview has responses to review/decide on.
 *   - live:    an interview is live but has no responses yet.
 * Draft/setup work is intentionally excluded; an empty queue means caught up.
 * Reuses computeInterviewNBA verbatim so the per-row verb stays the single
 * source of truth.
 */
import {
  computeInterviewNBA,
  type InterviewSnapshot,
  type InterviewStats,
  type NBA,
} from "./nextBestAction";

export type QueueBucket = "results" | "live";

export interface QueueItem {
  id: string;
  snapshot: InterviewSnapshot;
  nba: NBA;
  bucket: QueueBucket;
}

const statusRank = (s?: string): number =>
  s === "active" || s === "running" ? 2 : s === "draft" ? 1 : 0;

const bucketRank = (b: QueueBucket): number => (b === "results" ? 0 : 1);

export function buildActionQueue(
  snapshots: InterviewSnapshot[],
  statsById: Record<string, InterviewStats> = {},
): QueueItem[] {
  const completedOf = (s: InterviewSnapshot) => statsById[s.id]?.completedCandidates ?? 0;

  const items: QueueItem[] = [];
  for (const snapshot of snapshots) {
    const stats = statsById[snapshot.id];
    const completed = stats?.completedCandidates ?? 0;
    const isLive = snapshot.status === "active" || snapshot.status === "running";

    let bucket: QueueBucket | null = null;
    if (completed > 0) bucket = "results";
    else if (isLive) bucket = "live";
    if (!bucket) continue;

    items.push({ id: snapshot.id, snapshot, nba: computeInterviewNBA(snapshot, stats), bucket });
  }

  items.sort((a, b) => {
    if (a.bucket !== b.bucket) return bucketRank(a.bucket) - bucketRank(b.bucket);
    const diff = completedOf(b.snapshot) - completedOf(a.snapshot);
    if (diff !== 0) return diff;
    return statusRank(b.snapshot.status) - statusRank(a.snapshot.status);
  });

  return items;
}
