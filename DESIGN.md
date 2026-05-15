# DESIGN — FunnelHQ

Visual language: **Indian-finance-trust** — Razorpay / Zerodha tier. Restrained, dense, methodical.

## Color strategy

**Restrained.** Tinted neutrals + one accent (gold) ≤10% of any surface. Orange used sparingly for high-energy moments only.

### Tokens (defined in [src/index.css](src/index.css))

```
--paper            0 0% 100%        # #FFFFFF — primary surface
--paper-2          210 40% 98%      # #F8FAFC — section background
--paper-3          210 33% 96%      # hover
--paper-4          210 24% 93%      # pressed

--ink              221 49% 11%      # #0F1729 — primary text + primary CTA
--ink-soft         221 30% 24%
--muted            221 14% 46%
--muted-2          221 10% 64%

--rule             221 20% 90%      # default border
--rule-strong      221 20% 80%

--gold             42 53% 54%       # #C8A24B — brand accent, primary CTA on key flows
--gold-soft        42 45% 88%
--gold-ink         42 60% 28%

--orange           21 90% 48%       # #EA580C — high-energy accent, use sparingly
--orange-soft      21 90% 94%
--orange-ink       21 80% 30%
```

Status: `--success`, `--warning`, `--danger`, `--info` (each with `-soft` pair).

**Bans**: no `#000`, no `#fff` literals, no hex literals in `src/`, no Tailwind `bg-blue-*`/`text-blue-*` for CTAs (use `bg-ink` or `bg-gold`), no `bg-black`, no dark mode, no gradient text, no glassmorphism by default.

## Typography

Single family: **Geist** (with Geist Mono for numerics). No serif anywhere — Instrument Serif was removed in F4. Banned: Inter (we explicitly chose Geist for character).

- Display / page heading: `text-3xl font-semibold tracking-tight text-ink`. No uppercase.
- Section heading: `text-xl font-semibold text-ink`.
- Body: `text-base text-ink-soft leading-relaxed max-w-[65ch]` for long-form; `text-sm` for dense surfaces.
- Numbers / scores / IDs: `font-mono tabular-nums`.
- **Mono eyebrow** (the *only* uppercase pattern allowed): `font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink`. Used as section kicker above a heading.

Sentence case for headings, button labels, nav, badges. No Title Case. No ALL CAPS outside the mono kicker.

## Spacing & shape

- Grid: 6 / 8 / 12 base. `space-y-6` between sections.
- Container: `max-w-7xl mx-auto`. Marketing surfaces use `max-w-6xl`.
- Radius: `--radius 0.625rem` (~10px). Small chips `--radius-sm`. Hero elements `--radius-lg`.
- Shadow: `--shadow-1` for cards (default), `--shadow-2` for popovers/elevated, `--shadow-3` for modals. **Never `shadow-xl` or `shadow-2xl`.**
- Layout: CSS Grid for ≥2-axis layouts. Avoid flexbox percentage math.
- Full-viewport surfaces use `min-h-[100dvh]`, never `h-screen`.

## Components

shadcn/ui primitives in [src/components/ui/](src/components/ui/), all token-wired (F2). Customizations:

- **Button** variants: `default` (ink), `gold` (primary CTA), `orange` (high-energy), `outline`, `ghost`, `link`, `destructive`.
- **Card**: `bg-paper border border-rule rounded-md shadow-1`. No gradients.
- **Badge**: `tone` prop — `neutral|gold|success|warning|danger|info`. Each uses `*-soft` bg + `*-ink` text.
- **Input/Textarea**: `bg-paper border-rule focus-visible:ring-gold focus-visible:border-gold-ink`.
- **Dialog overlay**: `bg-ink/40 backdrop-blur-sm`.
- **Spinner**: variants `default | gold | danger`. `PageSpinner` for full-screen route loaders.
- **EmptyState**: shared `{icon, title, description, primaryAction, secondaryAction}` for any "no data" surface.
- **ErrorBanner**: shared `{tone, title, description, retryLabel, onRetry, dismissLabel, onDismiss}` — tones `danger|warning|info`.

## Motion

Minimal. CSS transitions only — no Framer Motion currently.

- Animate `transform` + `opacity` only. Never `width`/`height`/`top`/`left`.
- Standard ease: `--ease-spring: cubic-bezier(.2,.72,.28,1)`.
- Tactile feedback on press: `active:translate-y-[1px]` or `active:scale-[0.98]`.
- The Talent Analysis Graph (TAG) has its own internal motion (node hover, edge highlight, side-panel slide). Don't add motion elsewhere without justifying it against `MOTION_INTENSITY = 3` baseline (see CLAUDE.md).
- No perpetual / always-running animation outside TAG.

## TAG (Talent Analysis Graph) — marquee artifact

Lives in [src/components/tag/](src/components/tag/). Three-column layout:
1. Left rail: certifications, tools, ideal-candidate profile (added F21).
2. Center: radial SVG graph with skill nodes color-coded by status (strong/developing/gap).
3. Right rail: proficiency legend (L1–L5 — explicitly NOT NOOB/BASIC/MID/PRO/GOAT).

Below: stats strip + insights cards. Click a node → side panel slides in (overlays right rail).

Name **"Talent Analysis Graph (TAG)"** is fixed. Never rename. Visual tokens are shared with the rest of the app (no isolated palette).

## Anti-patterns banned (FunnelHQ-specific)

In addition to Impeccable's shared bans:

- No NOOB/BASIC/MID/PRO/GOAT proficiency labels — use L1–L5 with sober copy.
- No "Jane Doe" / "John Doe" placeholder names. Use Indian-finance-realistic: "Priya Sharma", "Arjun Mehta", "Rohan Iyer".
- No fictional landing customer logos until real ones exist.
- No 3-column generic feature card grids on marketing.
- No "Coming Soon" disabled buttons. Either ship the action or remove the entry point.
- No mailto: as the primary destructive action (account deletion goes through real DELETE endpoint).
- No raw color hex in `src/` — must reference a token.
- No Title Case headings. No ALL CAPS outside the mono editorial kicker.

## Register

**product** — design serves the product. Marketing landing surfaces (`MarketingLanding.tsx`, `ProductLanding.tsx`) operate under product register too — same palette, same restraint, no separate brand campaign treatment.
