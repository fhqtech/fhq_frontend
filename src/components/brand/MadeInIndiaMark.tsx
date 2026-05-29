/**
 * MadeInIndiaMark — small "Made in India" badge for footers and chrome.
 *
 *   <MadeInIndiaMark />            — default sm
 *   <MadeInIndiaMark size="md" />  — slightly larger
 *
 * Design rule: gold-ink only. We don't paint the tricolor because the
 * design system restricts accents to gold-ink (≤ 10% of any surface).
 * The flag glyph reads as a flag by shape, not color.
 *
 * Two exports:
 *   - MadeInIndiaMark: the full glyph + wordmark, drop into a footer.
 *   - IndiaFlagGlyph: just the icon, for use inside a SecurityTrust card
 *     where the card already provides its own label box.
 */
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

interface MadeInIndiaMarkProps {
  size?: Size;
  className?: string;
}

const TEXT_SIZE: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
};

const GLYPH_PX: Record<Size, { w: number; h: number }> = {
  sm: { w: 14, h: 10 },
  md: { w: 18, h: 13 },
};

interface IndiaFlagGlyphProps {
  size?: Size;
  className?: string;
}

// Pre-computed Ashoka chakra spokes: 24 evenly-spaced radial lines from
// inner radius 1.4 to outer radius 4.0, centred on (14, 10) in the
// viewBox 0..28 × 0..20. We bake the trig at build-time as a const array
// so render is plain JSX, no runtime math, no <g transform="rotate(...)">
// nested per spoke. 24 = canonical spoke count for the Ashoka chakra.
const CHAKRA_SPOKES: Array<{ x1: number; y1: number; x2: number; y2: number }> = (() => {
  const cx = 14;
  const cy = 10;
  const inner = 1.4;
  const outer = 4.0;
  const out: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < 24; i++) {
    const theta = (i * Math.PI * 2) / 24;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    out.push({
      x1: +(cx + cos * inner).toFixed(3),
      y1: +(cy + sin * inner).toFixed(3),
      x2: +(cx + cos * outer).toFixed(3),
      y2: +(cy + sin * outer).toFixed(3),
    });
  }
  return out;
})();

/**
 * Renders the flag glyph. If `className` carries width/height utilities
 * (e.g. "w-5 h-5"), they win and `size` is ignored — this is what the
 * SecurityTrust card grid needs (the card sets `w-5 h-5` on every icon).
 * Otherwise the size prop drives a fixed pixel dimension.
 *
 * Glyph: pole + flag rectangle + Ashoka chakra (24 spokes) on the
 * middle band. Gold-ink stroke only — tricolor is communicated by
 * structure (chakra), not color.
 */
export function IndiaFlagGlyph({ size = "sm", className }: IndiaFlagGlyphProps) {
  const hasClassDim =
    !!className && /(^|\s)(w-|h-)/.test(className);
  const { w, h } = GLYPH_PX[size];
  return (
    <svg
      {...(hasClassDim ? {} : { width: w, height: h })}
      viewBox="0 0 28 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-gold-ink shrink-0", className)}
    >
      {/* Pole */}
      <line x1="2" y1="2" x2="2" y2="19" />
      {/* Flag rectangle (single outline, no fills — gold-ink only) */}
      <path d="M2 3 L26 3 L26 14 L2 14 Z" />
      {/* Two thin band rules — keep top/bottom stripe separation */}
      <line x1="2" y1="6.7" x2="26" y2="6.7" opacity="0.45" />
      <line x1="2" y1="10.3" x2="26" y2="10.3" opacity="0.45" />
      {/* Ashoka chakra — outer ring + 24 spokes + hub */}
      <circle cx="14" cy="10" r="4" strokeWidth="1" />
      {CHAKRA_SPOKES.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          strokeWidth="0.7"
          opacity="0.85"
        />
      ))}
      <circle cx="14" cy="10" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MadeInIndiaMark({ size = "sm", className }: MadeInIndiaMarkProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 select-none", className)}
      aria-label="Made in India"
    >
      <IndiaFlagGlyph size={size} />
      <span className={cn("text-ink font-semibold tracking-tight", TEXT_SIZE[size])}>
        Made in India
      </span>
    </span>
  );
}
