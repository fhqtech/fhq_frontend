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

/**
 * Renders the flag glyph. If `className` carries width/height utilities
 * (e.g. "w-5 h-5"), they win and `size` is ignored — this is what the
 * SecurityTrust card grid needs (the card sets `w-5 h-5` on every icon).
 * Otherwise the size prop drives a fixed pixel dimension.
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
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-gold-ink shrink-0", className)}
    >
      {/* Pole */}
      <line x1="2" y1="2" x2="2" y2="19" />
      {/* Flag rectangle (single outline, no fills — gold-ink only) */}
      <path d="M2 3 L26 3 L26 14 L2 14 Z" />
      {/* Three horizontal bands — two thin rules suggest stripes */}
      <line x1="2" y1="6.7" x2="26" y2="6.7" opacity="0.6" />
      <line x1="2" y1="10.3" x2="26" y2="10.3" opacity="0.6" />
      {/* Chakra hint — small circle on the middle band */}
      <circle cx="14" cy="8.5" r="1.4" />
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
