/**
 * MadeInIndiaMark — small "Made in India" badge for footers and chrome.
 *
 *   <MadeInIndiaMark />            — default sm
 *   <MadeInIndiaMark size="md" />  — slightly larger
 *
 * Design note: this glyph paints the real tricolor (saffron / white / green
 * with the navy Ashoka chakra) at the user's explicit request — a deliberate
 * override of the gold-ink-only accent rule. It stays a tiny inline SVG (no
 * emoji, per the design ban) and reads as a flag by both shape and colour.
 *
 * Two exports:
 *   - MadeInIndiaMark: the full glyph + wordmark, drop into a footer.
 *   - IndiaFlagGlyph: just the icon, for use inside a SecurityTrust card
 *     where the card already provides its own label box.
 */
import { useId } from "react";
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

// Flag geometry in the viewBox 0..28 × 0..20: a tricolour chip inset to
// x 2..26, y 3..17 (24 × 14), split into three equal horizontal bands. The
// navy Ashoka chakra sits in the white band, centred on (14, 10).
const FLAG = { x: 2, y: 3, w: 24, h: 14 };
const BAND_H = FLAG.h / 3; // 4.667
const CHAKRA = { cx: 14, cy: FLAG.y + FLAG.h / 2, r: 2.0 }; // r fits the white band

// India tricolour + navy chakra (BIS-standard-ish hexes).
const SAFFRON = "#FF9933";
const GREEN = "#138808";
const NAVY = "#000080";

// Pre-computed Ashoka chakra spokes: 24 evenly-spaced radial lines from
// inner radius 0.55 to outer radius (r), centred on the chakra. Baked at
// build-time so render is plain JSX — no runtime trig, no per-spoke rotate.
// 24 = canonical spoke count for the Ashoka chakra.
const CHAKRA_SPOKES: Array<{ x1: number; y1: number; x2: number; y2: number }> = (() => {
  const { cx, cy, r } = CHAKRA;
  const inner = 0.55;
  const outer = r - 0.25;
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
 * Renders the flag glyph in full tricolour. If `className` carries width/height
 * utilities (e.g. "w-5 h-5"), they win and `size` is ignored — this is what the
 * SecurityTrust card grid needs (the card sets `w-5 h-5` on every icon).
 * Otherwise the size prop drives a fixed pixel dimension.
 *
 * Glyph: a rounded tricolour chip — saffron / white / green bands — with the
 * navy Ashoka chakra (24 spokes + hub + ring) in the white band and a hairline
 * border for contrast on light and dark grounds alike.
 */
export function IndiaFlagGlyph({ size = "sm", className }: IndiaFlagGlyphProps) {
  const hasClassDim =
    !!className && /(^|\s)(w-|h-)/.test(className);
  const { w, h } = GLYPH_PX[size];
  const clipId = useId();
  return (
    <svg
      {...(hasClassDim ? {} : { width: w, height: h })}
      viewBox="0 0 28 20"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={FLAG.x} y={FLAG.y} width={FLAG.w} height={FLAG.h} rx="1.6" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Saffron / white / green bands */}
        <rect x={FLAG.x} y={FLAG.y} width={FLAG.w} height={BAND_H} fill={SAFFRON} />
        <rect x={FLAG.x} y={FLAG.y + BAND_H} width={FLAG.w} height={BAND_H} fill="#ffffff" />
        <rect x={FLAG.x} y={FLAG.y + BAND_H * 2} width={FLAG.w} height={BAND_H} fill={GREEN} />
        {/* Ashoka chakra — ring + 24 spokes + hub, navy */}
        <circle cx={CHAKRA.cx} cy={CHAKRA.cy} r={CHAKRA.r} fill="none" stroke={NAVY} strokeWidth="0.5" />
        {CHAKRA_SPOKES.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={NAVY} strokeWidth="0.32" />
        ))}
        <circle cx={CHAKRA.cx} cy={CHAKRA.cy} r="0.5" fill={NAVY} />
      </g>
      {/* Hairline border so the chip reads on any ground */}
      <rect
        x={FLAG.x}
        y={FLAG.y}
        width={FLAG.w}
        height={FLAG.h}
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="0.75"
        className="text-ink"
      />
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
