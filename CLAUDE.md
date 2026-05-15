# CLAUDE.md — recruiter-assist-frontend

Project-local instructions for Claude sessions in this repo. Inherits and refines the workspace-wide [/Users/alokanand/funnelhq/CLAUDE.md](../CLAUDE.md).

## Stack

- React 18 + Vite 5 + TypeScript
- Tailwind 3 (NOT v4) + shadcn/ui (radix primitives)
- React Router v6, TanStack Query
- No Framer Motion (yet — see "Motion baseline" below)
- Auth: dual context (workspace `AuthContext` + applicant `CandidateAuthContext`)
- Backend on `http://localhost:8082` (FastAPI). Frontend dev on `http://localhost:8080`.

## Design context

Two files at repo root drive every design task:

- [PRODUCT.md](PRODUCT.md) — users, tone, anti-references, strategic principles
- [DESIGN.md](DESIGN.md) — tokens, typography, spacing, components, motion, anti-patterns

The Impeccable skill at `.claude/skills/impeccable/` auto-loads them. Read both before any UI work — don't guess at vocabulary or token names.

## Sentence case (hard rule)

**No Title Case. No ALL CAPS in user-visible copy.** The single exception is the **mono editorial kicker** used as a section eyebrow:

```html
<span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
  WORKSPACE
</span>
```

Headings, button labels, nav, badges, toasts, ARIA labels, page titles → sentence case. The hook at `.claude/hooks/warn-sentence-case.py` will flag obvious violations on file save.

## Backend symbols are stable

Field names, Firestore collection IDs (`candidates`, `interviews`, `interview_sessions`, `qualified_lists`, etc.), API path segments (`/interview/:id/results/:sid` stays — URL stability), code identifiers (`candidate_id`, `interview_id`) — all unchanged. **Only user-visible strings shift.** A vocabulary sweep ran in F9; don't reintroduce the old terms (Candidate, Reviewer, Recruiter, Interview-as-thing) in user-facing copy.

## Marquee artifact

The **Talent Analysis Graph (TAG)** is the product's marquee artifact. Name is fixed — never rename, never abbreviate inconsistently. Visual lives in [src/components/tag/](src/components/tag/) on shared design tokens (no isolated palette).

## Domain mandate

Three finance domains only: **Accounting, Taxation, Management Consulting**. Don't seed demo data or generate copy for domains outside this scope.

## Region

`asia-south1` (Mumbai). All region-coupled assumptions (data residency, bucket regions, latency budgets) follow this.

---

## Design taste — adopted from taste-skill

These are the rules we cherry-picked from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) without taking the full skill or the Framer Motion dependency. Apply them to every new surface.

### Three dials (FunnelHQ baseline)

- **DESIGN_VARIANCE = 4** — sober finance. Modest variance (offset / asymmetric whitespace OK), but no masonry / chaotic Bento. Keep alignment readable.
- **MOTION_INTENSITY = 3** — restrained. CSS transitions only, hover + focus + active states, no perpetual / always-running animation outside the TAG itself.
- **VISUAL_DENSITY = 6** — information-dense dashboards. Use `font-mono tabular-nums` for all numerics. Logic-group data with `border-t` / `divide-y` rather than wrapping every metric in its own card.

When the user explicitly requests a higher dial ("make this more bold", "add motion"), adapt — but state the dial change you're applying.

### Bans (additive to DESIGN.md)

- **No emoji** in product UI, code comments, or marketing copy. Use lucide-react icons.
- **No Inter font.** Geist only.
- **No pure black** (`#000000`, `bg-black`, `text-black`). Use `--ink` / `bg-ink` / `text-ink`.
- **No oversized hero H1.** ≤ `text-4xl` in product surfaces, ≤ `text-5xl` on marketing.
- **No 3-column generic feature card grids** unless data justifies it. Prefer 2-column zig-zag, asymmetric grid, or `border-t` divided rows.
- **No generic placeholder names** ("John Doe", "Jane Smith", "Sarah Chan"). Use Indian-finance-realistic names from PRODUCT.md examples ("Priya Sharma", "Arjun Mehta", "Rohan Iyer", "Ananya Desai").
- **No fake round-number stats** ("99.99%", "10K+", "50%"). Use organic figures or remove the stats strip.
- **No filler superlatives**: "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionary", "Game-changing". Use concrete verbs ("set up", "screen", "decide").
- **No broken Unsplash links** in seeds. Use deterministic placeholders or omit.
- **No custom mouse cursors.** Default cursor everywhere except `cursor-pointer` on interactive surfaces.

### Layout

- Full-viewport surfaces use `min-h-[100dvh]`, never `h-screen` (iOS Safari layout jump).
- CSS Grid for ≥2-axis layouts. Flexbox for single-axis. Avoid `w-[calc(33%-1rem)]`-style flex math.
- Cards only when elevation communicates hierarchy. For dense data, use `border-t` / `divide-y`.

### Motion constraints (apply even without Framer Motion)

- Animate `transform` + `opacity` only. **Never** `width` / `height` / `top` / `left`.
- Use `--ease-spring` (`cubic-bezier(.2,.72,.28,1)`) for transitions.
- Tactile press feedback: `active:translate-y-[1px]` or `active:scale-[0.98]`.
- Skeleton loaders match layout — no generic spinners on data-bearing regions. Use `Spinner` / `PageSpinner` only for true full-screen loads.

---

## Craft principles — Emil Kowalski

Read [emilkowal.ski/skill](https://emilkowal.ski/skill) before any animation, interaction, or detail work. The repo at [emilkowalski/skill](https://github.com/emilkowalski/skill) is a pointer to those articles. Author is Emil Kowalski (Sonner / Vaul / cmdk / next-themes) — the principles are restraint, intentional defaults, and micro-interactions that earn their cost.

Don't install — internalize.

---

## Impeccable commands

Available in this repo via `.claude/skills/impeccable/`:

| Build | Evaluate | Refine |
|---|---|---|
| `craft`, `shape`, `teach`, `document`, `extract` | `critique`, `audit`, `polish` | `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`, `live` |

Plus deterministic CLI: `npx impeccable detect ./src` for the 24-rule anti-pattern scan (no API key required).

The skill auto-loads PRODUCT.md + DESIGN.md on each invocation. Don't manually paste them into prompts.

---

## Existing repo conventions (don't break)

- Lazy-load page components in [src/App.tsx](src/App.tsx) — kept the bundle splittable.
- Vite manualChunks split: react-vendor, ui-vendor, charts-vendor, anim-vendor, stt-vendor, query-vendor, icons-vendor (see [vite.config.ts](vite.config.ts)).
- Auth tokens: workspace `auth_token`, applicant `candidate_auth_token`. Never reuse one for the other.
- All API URLs go through `import.meta.env.VITE_API_BASE_URL` (defaults to `http://localhost:8082`).
- shadcn primitives in [src/components/ui/](src/components/ui/) are token-wired — extend, don't fork.
- Empty states use [components/ui/empty-state.tsx](src/components/ui/empty-state.tsx). Errors use [components/ui/error-banner.tsx](src/components/ui/error-banner.tsx). Don't roll your own.
- TypeScript strictness is lenient — see [tsconfig.app.json](tsconfig.app.json). Don't tighten without coordinating.

## Hooks active in this repo

`.claude/hooks/`:
- `block-secrets-commit.py` — refuses commits containing API key patterns
- `block-destructive-git.py` — refuses `git reset --hard` / `push --force` to main
- `block-prod-db.py` — refuses operations against production Firestore
- `warn-sentence-case.py` — flags Title Case in headings

Don't disable. If a hook misfires, fix the false positive in the hook script.
