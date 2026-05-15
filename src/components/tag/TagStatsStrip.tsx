/**
 * TAG stats strip — counts per status bucket above the graph card.
 * Mirrors the marketing reference's "4 STRONG MATCH · 2 DEVELOPING · 2 GAP · 3 TRANSFERABLE".
 */
import { STATUS_LABELS, STATUS_STYLES, TAG_PALETTE, TAG_TYPE } from "./constants";
import type { TagStats } from "./types";

interface TagStatsStripProps {
  stats?: TagStats;
}

const ORDER: (keyof TagStats)[] = ["strong", "developing", "gap", "transferable"];

export function TagStatsStrip({ stats }: TagStatsStripProps) {
  if (!stats) return null;
  return (
    <div className="tag-stats-strip">
      {ORDER.map((key, i) => {
        const count = stats[key] ?? 0;
        const color = STATUS_STYLES[key].stroke;
        return (
          <div
            key={key}
            className="tag-stat"
            style={{
              borderRight:
                i < ORDER.length - 1 ? `1px solid ${TAG_PALETTE.rule}` : undefined,
            }}
          >
            <div
              className="tag-stat-num"
              style={{ fontFamily: TAG_TYPE.serif, color }}
            >
              {count}
            </div>
            <div
              className="tag-stat-lbl"
              style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
            >
              {STATUS_LABELS[key]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
