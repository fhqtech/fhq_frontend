/**
 * JourneyTimeline — vertical timeline of a candidate's lifetime journey.
 *
 * Renders the journey_nodes from a ProfileTag (Phase 1.6). Nodes are
 * grouped by category (corporate, academy, training, side_project,
 * certification, gap, achievement) and rendered chronologically within
 * each group.
 *
 * Design: dense, border-divided rows (no individual cards), sentence case,
 * mono editorial kicker per category. Matches the DESIGN.md taste profile:
 * VISUAL_DENSITY=6, no emoji, lucide icons only.
 */
import { useMemo } from "react";
import {
  Briefcase,
  GraduationCap,
  BookOpenCheck,
  Code2,
  Award,
  CircleSlash,
  Trophy,
  Calendar,
} from "lucide-react";

export type JourneyCategory =
  | "academy"
  | "corporate"
  | "training"
  | "side_project"
  | "certification"
  | "gap"
  | "achievement";

export interface JourneyNode {
  id: string;
  category: JourneyCategory;
  title: string;
  organization?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  summary: string;
  source: "resume" | "interview";
  evidence_quotes?: string[];
}

interface JourneyTimelineProps {
  nodes: JourneyNode[];
  /** Optional empty-state copy when nodes is empty. */
  emptyLabel?: string;
}

const CATEGORY_META: Record<
  JourneyCategory,
  { label: string; icon: typeof Briefcase; order: number }
> = {
  corporate: { label: "Corporate", icon: Briefcase, order: 1 },
  academy: { label: "Academy", icon: GraduationCap, order: 2 },
  training: { label: "Training", icon: BookOpenCheck, order: 3 },
  certification: { label: "Certifications", icon: Award, order: 4 },
  side_project: { label: "Side projects", icon: Code2, order: 5 },
  achievement: { label: "Achievements", icon: Trophy, order: 6 },
  gap: { label: "Gaps", icon: CircleSlash, order: 7 },
};

function formatPeriod(start?: string | null, end?: string | null): string {
  if (!start && !end) return "";
  if (start && !end) return `${start} – present`;
  if (!start && end) return `until ${end}`;
  return `${start} – ${end}`;
}

export function JourneyTimeline({ nodes, emptyLabel }: JourneyTimelineProps) {
  const grouped = useMemo(() => {
    const groups = new Map<JourneyCategory, JourneyNode[]>();
    for (const node of nodes) {
      const list = groups.get(node.category) ?? [];
      list.push(node);
      groups.set(node.category, list);
    }
    // Sort each group: most recent first by period_end (or period_start).
    for (const [cat, list] of groups.entries()) {
      list.sort((a, b) => {
        const aDate = a.period_end ?? a.period_start ?? "";
        const bDate = b.period_end ?? b.period_start ?? "";
        return bDate.localeCompare(aDate);
      });
      groups.set(cat, list);
    }
    return [...groups.entries()].sort(
      ([a], [b]) => CATEGORY_META[a].order - CATEGORY_META[b].order,
    );
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-md border border-rule bg-paper-2 px-4 py-8 text-center text-sm text-ink-soft">
        {emptyLabel ?? "No journey yet."}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {grouped.map(([category, items]) => {
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;
        return (
          <section key={category} className="py-5 first:pt-0 last:pb-0">
            <header className="mb-3 flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {meta.label}
              </span>
              <span className="font-mono tabular-nums text-[11px] text-muted">
                {items.length}
              </span>
            </header>
            <ol className="space-y-3">
              {items.map((node) => (
                <li
                  key={node.id}
                  className="grid grid-cols-[120px_1fr] gap-4 border-t border-rule pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start gap-1.5 pt-0.5">
                    <Calendar
                      className="mt-0.5 h-3 w-3 text-muted"
                      aria-hidden
                    />
                    <span className="font-mono tabular-nums text-xs text-muted">
                      {formatPeriod(node.period_start, node.period_end) || "—"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-ink">
                        {node.title}
                      </span>
                      {node.organization && (
                        <span className="text-sm text-ink-soft">
                          · {node.organization}
                        </span>
                      )}
                      {node.source === "interview" && (
                        <span
                          className="rounded-sm bg-gold-ink/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gold-ink"
                          title="Surfaced during the discovery interview, not on the resume"
                        >
                          interview
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {node.summary}
                    </p>
                    {node.evidence_quotes && node.evidence_quotes.length > 0 && (
                      <details className="mt-2 text-xs text-muted">
                        <summary className="cursor-pointer select-none hover:text-ink-soft">
                          Evidence ({node.evidence_quotes.length})
                        </summary>
                        <ul className="mt-1.5 space-y-1 border-l-2 border-rule pl-3">
                          {node.evidence_quotes.map((q, idx) => (
                            <li key={idx} className="italic">
                              &ldquo;{q}&rdquo;
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
