/**
 * TagProficiencyLegend — right-rail global legend for proficiency tiers.
 *
 * Mirrors the BlueprintViewModal's PROFICIENCY LEVELS panel. Reads the
 * 1-5 level map from `graph_data.proficiency_legend` (derived server-side
 * from the blueprint). Falls back to a default Big-4 mapping when the
 * field is missing — older results docs render gracefully.
 */
import type { TagProficiencyLevel } from "./types";

interface Props {
  legend?: TagProficiencyLevel[];
}

// S2.7: sober finance-trust labels. Earlier NOOB/BASIC/MID/PRO/GOAT was
// off-brand for Big-4 hiring teams. L1-L5 reads cleanly across cultures.
const KEY_BY_LEVEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
  5: "L5",
};

const SWATCH_BY_LEVEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "bg-success",
  2: "bg-info",
  3: "bg-gold",
  4: "bg-danger",
  5: "bg-orange",
};

const DEFAULT_LEGEND: TagProficiencyLevel[] = [
  { level: 1, name: "Beginner", description: "Basic familiarity" },
  { level: 2, name: "Basic", description: "Comfortable with fundamentals" },
  { level: 3, name: "Intermediate", description: "Independent execution" },
  { level: 4, name: "Advanced", description: "Leads workstreams" },
  { level: 5, name: "Expert", description: "Sets the bar" },
];

export function TagProficiencyLegend({ legend }: Props) {
  const rows = legend && legend.length > 0 ? legend : DEFAULT_LEGEND;

  return (
    <aside className="w-56 flex-shrink-0">
      <div className="bg-paper border border-rule rounded-md p-3 shadow-1">
        <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider mb-3">
          Proficiency levels
        </p>
        <ul className="flex flex-col gap-2">
          {rows
            .slice()
            .sort((a, b) => a.level - b.level)
            .map((lvl) => (
              <li key={lvl.level} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${SWATCH_BY_LEVEL[lvl.level]}`} />
                <span className="text-[10px] font-mono font-bold text-ink-soft tracking-wider">
                  {KEY_BY_LEVEL[lvl.level]}
                </span>
                <span className="text-[11px] text-muted">{lvl.name}</span>
              </li>
            ))}
        </ul>
      </div>
    </aside>
  );
}

export default TagProficiencyLegend;
