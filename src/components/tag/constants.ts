/**
 * TAG design tokens — ported verbatim from funnelhq.co/tag.html.
 *
 * Single source of truth for TAG colors, type, sizing. Do not duplicate
 * literal hex codes elsewhere — pull from these constants.
 */

// TAG palette — finance-trust tokens, mirror of CSS vars in src/index.css.
// Hex values match the shared --paper / --ink / --gold / --orange so the
// SVG renderer stays in sync with the rest of the app.
export const TAG_PALETTE = {
  paper: "#FFFFFF",
  paper2: "#FFFFFF",
  paper3: "#F1F5F9",
  paper4: "#E2E8F0",
  ink: "#0F1729",
  inkSoft: "#2A3550",
  muted: "#6B7385",
  muted2: "#A0A6B5",
  muted3: "#C4C9D4",
  rule: "rgba(15, 23, 41, 0.08)",
  ruleStrong: "rgba(15, 23, 41, 0.16)",
  gold: "#C8A24B",
  goldSoft: "#A88541",
  green: "#2A7D52",
  greenBg: "#E6F1EA",
  greenTint: "rgba(42, 125, 82, 0.10)",
  orange: "#EA580C",
  orangeBg: "#FFEDD5",
  orangeTint: "rgba(234, 88, 12, 0.10)",
  red: "#B23D3D",
  redBg: "#FCE7E7",
  redTint: "rgba(178, 61, 61, 0.10)",
  purple: "#5A46A0",
  purpleBg: "#E8E3F4",
  purpleTint: "rgba(90, 70, 160, 0.10)",
} as const;

// Single sans family across the whole app (drop Instrument Serif).
// `serif` kept as alias to sans-600 for any straggler imports.
export const TAG_TYPE = {
  sans: '"Geist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  serif: '"Geist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

export const TAG_RADII = {
  sm: "6px",
  md: "10px",
  lg: "14px",
} as const;

export const TAG_EASE_SPRING = "cubic-bezier(.2, .72, .28, 1)";

// --- canvas ---

export const TAG_CANVAS = { width: 1200, height: 760 } as const;

/**
 * Scale a node position to pixels. Backend now emits normalized [0..1]
 * coordinates over the reference 1200x760 canvas; legacy docs may still
 * carry pixel values. Defensive: if either coord is >1, treat as pixels
 * (legacy) and pass through.
 */
export function scalePos(
  p: { x: number; y: number },
  canvas: { width: number; height: number } = TAG_CANVAS,
): { x: number; y: number } {
  const isLegacyPixels = p.x > 1 || p.y > 1;
  if (isLegacyPixels) return { x: p.x, y: p.y };
  return { x: p.x * canvas.width, y: p.y * canvas.height };
}

// Default node radius (skill nodes). Role center is bigger; source-style
// transferable nodes use a square.
export const TAG_NODE_R = 30;
export const TAG_ROLE_R = 58;

// --- status mapping ---

export type TagStatus =
  | "strong"
  | "developing"
  | "gap"
  | "transferable"
  | "role_center";

export const STATUS_OF_SCORE = (s: number | null | undefined): TagStatus => {
  if (s == null) return "gap";
  if (s >= 80) return "strong";
  if (s >= 50) return "developing";
  return "gap";
};

interface StatusStyle {
  fill: string;
  stroke: string;
  tint: string;
  text: string;
}

export const STATUS_STYLES: Record<TagStatus, StatusStyle> = {
  strong: {
    fill: TAG_PALETTE.greenBg,
    stroke: TAG_PALETTE.green,
    tint: TAG_PALETTE.greenTint,
    text: TAG_PALETTE.green,
  },
  developing: {
    fill: TAG_PALETTE.orangeBg,
    stroke: TAG_PALETTE.orange,
    tint: TAG_PALETTE.orangeTint,
    text: TAG_PALETTE.orange,
  },
  gap: {
    fill: TAG_PALETTE.redBg,
    stroke: TAG_PALETTE.red,
    tint: TAG_PALETTE.redTint,
    text: TAG_PALETTE.red,
  },
  transferable: {
    fill: TAG_PALETTE.purpleBg,
    stroke: TAG_PALETTE.purple,
    tint: TAG_PALETTE.purpleTint,
    text: TAG_PALETTE.purple,
  },
  role_center: {
    fill: TAG_PALETTE.ink,
    stroke: "rgba(255, 255, 255, 0.25)",
    tint: "rgba(10, 18, 32, 0.08)",
    text: TAG_PALETTE.paper2,
  },
};

export const STATUS_LABELS: Record<Exclude<TagStatus, "role_center">, string> = {
  strong: "Strong Match",
  developing: "Developing",
  gap: "Gap",
  transferable: "Transferable",
};
