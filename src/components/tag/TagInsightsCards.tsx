/**
 * TAG insights cards — 4 editorial cards below the graph that summarize
 * what the TAG tells in 60 seconds. Results mode only.
 */
import { STATUS_LABELS, STATUS_STYLES, TAG_PALETTE, TAG_TYPE } from "./constants";
import type { TagInsight } from "./types";

interface TagInsightsCardsProps {
  insights?: TagInsight[];
}

const ORDER = ["strong", "developing", "gap", "transferable"] as const;

export function TagInsightsCards({ insights }: TagInsightsCardsProps) {
  if (!insights || insights.length === 0) return null;
  const byStatus = new Map(insights.map((i) => [i.status, i]));
  return (
    <div className="tag-insights-grid">
      {ORDER.map((status) => {
        const insight = byStatus.get(status);
        if (!insight) return null;
        const color = STATUS_STYLES[status].stroke;
        return (
          <article
            key={status}
            className="tag-insight"
            style={{
              borderTop: `3px solid ${color}`,
              background: TAG_PALETTE.paper2,
              border: `1px solid ${TAG_PALETTE.rule}`,
              borderTopWidth: 3,
              borderTopColor: color,
            }}
          >
            <div
              className="tag-insight-kicker"
              style={{ fontFamily: TAG_TYPE.mono, color }}
            >
              {STATUS_LABELS[status]}
            </div>
            <h3
              style={{
                fontFamily: TAG_TYPE.serif,
                color: TAG_PALETTE.ink,
                margin: "0 0 10px",
                fontWeight: 400,
                fontSize: 22,
                lineHeight: 1.15,
              }}
            >
              {insight.headline}
            </h3>
            <p
              style={{
                fontFamily: TAG_TYPE.sans,
                color: TAG_PALETTE.muted,
                fontSize: 14,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {insight.body}
            </p>
          </article>
        );
      })}
    </div>
  );
}
