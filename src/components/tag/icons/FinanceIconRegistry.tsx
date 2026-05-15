/**
 * Finance icon registry — inline SVG paths drawn inside each TAG node.
 *
 * Path data ported from funnelhq.co/tag.html. Icons are 20x20 in their
 * native coords and translated to (-10, -10) to center on the node origin.
 *
 * Each icon is a render function so we can pass colors at runtime
 * (status-stroke for outlined icons, white for filled-rect "source" nodes).
 */
import type { ReactNode } from "react";

export type IconRenderer = (color: string, fill?: string) => ReactNode;

const stroke = (
  color: string,
  width: number,
  paths: ReactNode,
  extra: { fill?: string; linecap?: "round" | "butt" | "square"; linejoin?: "round" | "miter" | "bevel" } = {},
) => (
  <g
    transform="translate(-10, -10)"
    stroke={color}
    strokeWidth={width}
    fill={extra.fill ?? "none"}
    strokeLinecap={extra.linecap ?? "round"}
    strokeLinejoin={extra.linejoin ?? "round"}
  >
    {paths}
  </g>
);

export const FINANCE_ICONS: Record<string, IconRenderer> = {
  // --- Strong / accounting cluster ---
  "financial-reporting": (color) =>
    stroke(
      color,
      1.6,
      <>
        <path d="M 2 1 L 13 1 L 18 6 L 18 21 L 2 21 Z" />
        <path d="M 13 1 L 13 6 L 18 6" />
        <path d="M 5 10 L 15 10 M 5 14 L 15 14 M 5 18 L 11 18" />
      </>,
    ),
  budgeting: (color) =>
    stroke(
      color,
      1.6,
      <>
        <path d="M 2 18 L 18 18" />
        <rect x="3" y="10" width="3" height="8" />
        <rect x="8.5" y="6" width="3" height="12" />
        <rect x="14" y="13" width="3" height="5" />
        <path d="M 2 5 L 6 2 L 10 4" />
      </>,
    ),
  "internal-controls": (color) =>
    stroke(
      color,
      1.6,
      <>
        <path d="M 10 2 L 4 5 L 4 11 Q 4 15 10 18 Q 16 15 16 11 L 16 5 Z" />
        <path d="M 7 10 L 9 12 L 13 8" />
      </>,
    ),
  erp: (color) =>
    stroke(
      color,
      1.6,
      <>
        <rect x="3" y="3" width="6" height="6" rx={0.5} />
        <rect x="11" y="3" width="6" height="6" rx={0.5} />
        <rect x="3" y="11" width="6" height="6" rx={0.5} />
        <rect x="11" y="11" width="6" height="6" rx={0.5} />
      </>,
      { linecap: "butt" },
    ),
  // --- Developing / analytics cluster ---
  "data-analytics": (color) =>
    stroke(
      color,
      1.6,
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M 10 2.5 L 10 10 L 17.5 10" />
      </>,
      { linejoin: "round" },
    ),
  "strategic-planning": (color) =>
    stroke(
      color,
      1.6,
      <>
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="4.5" />
        <circle cx="10" cy="10" r="1.5" fill={color} />
      </>,
    ),
  // --- Gap / specialty cluster ---
  tax: (color) =>
    stroke(
      color,
      1.8,
      <>
        <path d="M 7 1 L 7 21" />
        <path d="M 11 5 Q 11 3 7 3 Q 3 3 3 6 Q 3 9 7 10 Q 11 11 11 14 Q 11 17 7 17 Q 3 17 3 15" />
      </>,
    ),
  leadership: (color) =>
    stroke(
      color,
      1.6,
      <>
        <circle cx="7" cy="6" r="2.5" />
        <path d="M 2 16 Q 2 11 7 11 Q 12 11 12 16" />
        <circle cx="14" cy="7" r="2" />
        <path d="M 10 15 Q 11 12.5 14 12.5 Q 18 12.5 18 16" />
      </>,
    ),
  // --- Transferable cluster (cognitive skills) ---
  "strategic-thinking": (color) =>
    stroke(
      color,
      1.4,
      <>
        <circle cx="5" cy="6" r="1.8" fill={color} />
        <circle cx="15" cy="5" r="1.8" fill={color} />
        <circle cx="10" cy="14" r="1.8" fill={color} />
        <path d="M 5 6 L 10 14 M 15 5 L 10 14 M 5 6 L 15 5" />
      </>,
    ),
  "critical-analysis": (color) =>
    stroke(
      color,
      1.7,
      <>
        <circle cx="8" cy="8" r="5" />
        <path d="M 12 12 L 17 17" />
      </>,
    ),
  "problem-solving": (color) =>
    stroke(
      color,
      1.6,
      <>
        <path d="M 10 2 Q 5 2 5 7 Q 5 10 7 12 L 7 15 L 13 15 L 13 12 Q 15 10 15 7 Q 15 2 10 2 Z" />
        <path d="M 8 17 L 12 17" />
      </>,
    ),
  // --- Source-style transferable (chess piece, drawn FILLED for dark nodes) ---
  chess: (color) =>
    stroke(
      color,
      1.4,
      <path d="M 4 20 L 14 20 L 14 18 L 13 14 L 15 11 L 13 8 L 11 9 L 10 5 L 8 7 L 8 11 L 5 15 L 4 18 Z" />,
      { fill: color },
    ),
  // --- Fallback used by getIcon() when no key matches ---
  __fallback__: (color) =>
    stroke(
      color,
      1.6,
      <>
        <circle cx="10" cy="10" r="6" />
        <circle cx="10" cy="10" r="2" fill={color} />
      </>,
    ),
};

/** Allowed icon ids for the reviewer prompt (Phase 1b). Excludes the fallback key. */
export const ICON_REGISTRY_KEYS = Object.keys(FINANCE_ICONS).filter(
  (k) => !k.startsWith("__"),
);

/**
 * Heuristic name → icon map. Used when icon_id isn't a registry key but
 * the skill label contains a keyword. First match wins.
 */
const NAME_HEURISTICS: Array<[RegExp, keyof typeof FINANCE_ICONS]> = [
  [/\btax(es|ation)?\b/i, "tax"],
  [/\bgst\b/i, "tax"],
  [/\bvat\b/i, "tax"],
  [/\btds\b/i, "tax"],
  [/\bdirect tax\b/i, "tax"],
  [/\bindirect tax\b/i, "tax"],
  [/\baccount(ing|s)\b|controllership|reconcil/i, "financial-reporting"],
  [/\breport(ing)?\b|\bifrs\b|\bgaap\b|\bind-?as\b/i, "financial-reporting"],
  [/\bbudget|forecast(ing)?\b|\bfp ?& ?a\b|\bplanning\b|\bclose\b/i, "budgeting"],
  [/internal control|\baudit\b|\bsox\b|compliance|risk/i, "internal-controls"],
  [/\berp\b|sap|oracle|tally|systems/i, "erp"],
  [/\banaly(tic|sis|sing|tical)\b|excel|data interpret/i, "data-analytics"],
  [/strategy|strategic/i, "strategic-planning"],
  [/leadership|team|management|people/i, "leadership"],
  [/strategic thinking/i, "strategic-thinking"],
  [/critical|evaluat/i, "critical-analysis"],
  [/problem|solving/i, "problem-solving"],
  [/research|interpret/i, "data-analytics"],
  [/learning|agility|adapt/i, "problem-solving"],
  [/communication|client/i, "leadership"],
];

export function getIcon(
  iconId: string | null | undefined,
  label?: string | null,
): IconRenderer {
  if (iconId && FINANCE_ICONS[iconId]) return FINANCE_ICONS[iconId];
  const haystack = `${iconId ?? ""} ${label ?? ""}`;
  for (const [pattern, key] of NAME_HEURISTICS) {
    if (pattern.test(haystack)) return FINANCE_ICONS[key];
  }
  return FINANCE_ICONS.__fallback__;
}

/** Center hub icon — bar chart silhouette for the role. */
export const ROLE_CENTER_ICON: IconRenderer = (color) => (
  <g
    transform="translate(-13, -22)"
    stroke={color}
    strokeWidth={2}
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M 1 22 L 25 22" />
    <rect x="2" y="13" width="4.5" height="9" />
    <rect x="10.75" y="6" width="4.5" height="16" />
    <rect x="19.5" y="15" width="4.5" height="7" />
  </g>
);
