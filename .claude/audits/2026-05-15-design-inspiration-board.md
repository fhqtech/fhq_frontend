# Design inspiration board — 2026-05-15

**Curator:** Claude (Opus 4.7)
**Sources mined:** 21st.dev (community + Magic UI registry), Dribbble (Razorpay design portfolio + tagged shots), Eleken fintech-trust roundup, Aceternity, Kokonut UI
**Filter:** Strict — Indian-finance-trust only. Anything reading playful, gradient-heavy, neon, dark-mode-first, or "growth-hack SaaS" was rejected.
**Output shape:** Surface kits (Dashboard / Onboarding / CreateInterview / TAG) + cross-cutting patterns + reject pile + suggested F28 micro-PRs.

> Note: Uiverse (`uiverse.io/buttons` etc.) returned 403 to WebFetch. Recovered the same micro-interaction patterns from Magic UI + 21st.dev. Net loss minimal — Magic UI ships installable shadcn-CLI versions of every Uiverse-class pattern.

---

> **REVISION 2026-05-16** — multi-agent review (Impeccable + taste-skill + a11y-architect, see [2026-05-15-inspiration-board-multi-agent-review.md](2026-05-15-inspiration-board-multi-agent-review.md)) cut 4 picks and added 4 PRs. Top 5 below reflects that revision. Original picks struck through.

## Executive summary — top 5 picks (revised)

Ranked by **highest impact per implementation hour**, all Tier 1 (drop-in via shadcn CLI):

| # | Pick | Source | Surface | Effort | Why |
|---|---|---|---|---|---|
| 1 | **CreateInterview wizard polish (F28.3)** | post-F26 audit P0-4/P0-5 | CreateInterview | 2 hr | Audit P0 carryover. Kills ALL CAPS modal, sweeps labels, fixes red-X step indicator, replaces blue credit numerals, swaps custom skill picker for Origin UI multi-select. Promoted to #1 by multi-agent review — biggest user-felt gap. |
| 2 | **Magic UI `number-ticker`** | magicui.design | Dashboard, TAG | 30 min | Replaces our hand-rolled F24.4 AnimatedCounter with a battle-tested viewport-aware counter. Already uses Motion (we ship it). One token swap on color and we're done. Wire `useReducedMotion()` + `aria-live` per a11y review. |
| 3 | **Skeleton loaders matching layout (F28.8)** | DESIGN.md mandate | every page | 2 hr | DESIGN.md mandates layout-shape skeletons; current code uses bare `<Loader2 animate-spin>` in 6+ places. Universal lift, zero new deps. Added by multi-agent review. |
| 4 | **Magic UI `animated-circular-progress-bar`** | magicui.design | TAG score reveal, CreateInterview step indicator | 45 min | TAG ring + replaces red-X CreateInterview step indicator with success/active/unvisited tri-state. |
| 5 | **Origin UI `multi-select`** | 21st.dev/originui | CreateInterview skills, Pool filters | 1 hr | Mature multi-select replaces CreateInterview's leaky custom skill picker. Bundled into F28.3 above. Reused on Pool filter chip rail. |

**Total: ~6.5 hr for top 5.** All MIT/permissive, ship via `shadcn` CLI. Zero new top-level dependencies (motion already shipped post-F24.0).

### Cuts from original board (multi-agent review)

| Cut | Reason |
|---|---|
| ~~Magic UI `bento-grid`~~ | Pure-black gradient default + DESIGN_VARIANCE=4 ban on bento. Adapting strips its only value-add. **Keep our own [BentoGrid.tsx](../../src/components/dashboard/BentoGrid.tsx); lift composition idea only.** |
| ~~Aceternity Resizable Navbar~~ | Animates layout properties (height/position) → violates "Don't animate CSS layout properties." Dark-mode-first defaults. |
| ~~`@number-flow/react`~~ | Second numeric-animation lib alongside Magic UI ticker. Per-digit `<span>` reads as separate tokens on VoiceOver (a11y burden). Pick one — ticker passes. |
| ~~Install ravikatiyar onboarding-checklist~~ | Playful gradients + emoji checkmarks default. **Lift the paired-screenshot pattern into our own [FirstRunStepper.tsx](../../src/components/onboarding/FirstRunStepper.tsx); don't install the component.** |

---

## Surface kit 1 — Dashboard + KPI tiles

Current state ([src/pages/Dashboard.tsx](../../src/pages/Dashboard.tsx)): F24.5 + F24.9 shipped time-of-day greeting + bare bento grid + HeroKPI tile + onboarding stepper + 4 stat tiles. Cold/empty when workspace has zero data. KPIs flat without sparklines or delta arrows.

### D1. Magic UI Number Ticker — **Tier 1 — fits as-is**
- **What:** Animated counter that counts to N when scrolled into viewport, decimal-aware
- **Source:** [magicui.design/r/number-ticker.json](https://magicui.design/r/number-ticker.json)
- **Install:** `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"`
- **Deps:** `motion` (already shipped)
- **What to steal:** Replace [src/components/ui/animated-counter.tsx](../../src/components/ui/animated-counter.tsx) (F24.4 hand-rolled). Magic UI's `number-ticker` uses the same Motion primitives but with viewport-trigger built-in (no IntersectionObserver in our code). Cleaner.
- **Adaptation:** None. Drop in, swap import, default `font-mono tabular-nums` is what we want.
- **FunnelHQ surface:** Dashboard hero KPI, every stat tile, TAG score reveal, marketing landing scroll-driven stats.

### D2. Magic UI Bento Grid — **Tier 2 — needs ≤30 min adaptation**
- **What:** 3×3 bento layout with first-class card slot, hover lift, mount stagger
- **Source:** [magicui.design/r/bento-grid.json](https://magicui.design/r/bento-grid.json)
- **Install:** `npx shadcn@latest add "https://magicui.design/r/bento-grid.json"`
- **Deps:** `@radix-ui/react-icons` (already in shadcn ecosystem), shadcn `button`
- **What to steal:** Built-in tile slot anatomy (header / body / footer / CTA). Our [BentoGrid.tsx](../../src/components/dashboard/BentoGrid.tsx) is just a div grid — Magic UI's adds the hover affordance + mount stagger Linear users expect.
- **Adaptation:** Strip Magic UI's default `from-neutral-900 to-neutral-950` gradient; replace with `bg-paper border border-rule shadow-1`. Keep stagger animation. ~20 min.
- **FunnelHQ surface:** Dashboard recomposition. Could host: HeroKPI, time-range control, pipeline funnel, domain mix donut, recent interviews preview, next-best-action.

### D3. Magic UI Animated Circular Progress Bar — **Tier 1**
- **What:** Circular gauge counting to N%, smooth Motion-driven
- **Install:** `npx shadcn@latest add "https://magicui.design/r/animated-circular-progress-bar.json"`
- **Deps:** none
- **What to steal:** Better than recharts donut for a single-value gauge. Use for: applicant-stage funnel rate ("23% advance to interview"), workspace credit usage ("60% of monthly credits used"), TAG average score gauge.
- **FunnelHQ surface:** Dashboard, Settings → Plan & billing, TAG hero score area.

### D4. Razorpay Dashboard reference — **inspiration only**
- **Sources:** [RazorpayX Dashboard on Dribbble](https://dribbble.com/shots/6452470-RazorpayX-Dashboard) · [Faster Payments with Razorpay Invoices](https://dribbble.com/shots/6033581-Faster-Payments-with-Razorpay-Invoices)
- **What to steal:**
  - Group related KPIs in a single visually-quiet card with `divide-y` rows (e.g. "Volume / Velocity / Variance" as one tile, not three)
  - Status pills next to data (not in a separate column) — applicant stage as a chip on the row
  - Numerals get `font-mono tabular-nums` always; everything else is sentence-case Geist
- **FunnelHQ surface:** ManageInterviewsEnhanced row design, Dashboard recent interviews preview.

### D5. Aceternity Resizable Navbar — **Tier 2**
- **Source:** [21st.dev/community/components/aceternity/resizable-navbar/default](https://21st.dev/community/components/aceternity/resizable-navbar/default)
- **Deps:** `motion`, `@tabler/icons-react` (we use lucide; swap on adapt)
- **What to steal:** Top nav that shrinks on scroll, hides nav links and shows only logo + Cmd+K + avatar after 100px. Marketing landing only — our app uses sidebar in-product.
- **Adaptation:** ~25 min — swap `@tabler/icons-react` → lucide imports we already have, theme to gold accent.
- **FunnelHQ surface:** MarketingLanding only. Don't touch in-product nav.

### D6. Eleken fintech-trust patterns — **principles only**
- **Source:** [Eleken — Trusted fintech UI examples](https://www.eleken.co/blog-posts/trusted-fintech-ui-examples)
- **What to steal:**
  - Wise: progressive cost disclosure (FunnelHQ analog: TAG progressive evidence panel) ✓ already shipped
  - Stripe: front-and-center key metrics + consistent design across devices (our Dashboard hero needs this)
  - Monarch Money: unified dashboard view (we should make `/dashboard` aggregate `/interviews/manage` summary, not duplicate it)
  - Habstash: wizard-style onboarding with progress tracking — we have F24.8 stepper, but lacks the visual progress fill Habstash uses

---

## Surface kit 2 — Onboarding + empty states

Current state ([src/components/onboarding/FirstRunStepper.tsx](../../src/components/onboarding/FirstRunStepper.tsx) + [src/components/ui/empty-state.tsx](../../src/components/ui/empty-state.tsx)): F24.8 shipped 3-step localStorage stepper. EmptyState has `sampleDataAction` + `inlineCompose` slots from F24.2 but they're unused on actual surfaces.

### O1. 21st.dev Onboarding Checklist (Ravikatiyar) — **Tier 2**
- **Source:** [21st.dev/community/components/ravikatiyar162/onboarding-checklist](https://21st.dev/community/components/ravikatiyar162/onboarding-checklist)
- **Deps:** `lucide-react` (✓ have), `framer-motion` (✓ have)
- **What:** Card with checklist items + inline video guide pane
- **What to steal:** The two-pane layout (checklist left + visual right). Our FirstRunStepper is text-only; pairing with a screenshot/loop for each step would clarify "what does Pick a domain mean" before they click.
- **Adaptation:** ~45 min — replace video pane with a static screenshot per step. Strip the dark bg defaults.
- **FunnelHQ surface:** Dashboard FirstRunStepper enhancement.

### O2. Stripe / Notion sample-data pattern — **principles**
- **Idea:** "Try with 5 sample applicants" CTA on the empty Dashboard / empty Pool. Click → seeds 5 fake (anonymized) applicants the user can navigate, mark, score, then click "Clear sample data" to reset.
- **Lift:** Our `EmptyState.sampleDataAction` slot (F24.2) is built but unused. Wire it on Dashboard + PoolDashboard.
- **Effort:** ~2 hr (backend seed endpoint + frontend wire-up). Worth it — turns the cold first-run dashboard into something explorable in 60 seconds.
- **Names from PRODUCT.md examples:** "Priya Sharma", "Arjun Mehta", "Rohan Iyer", "Ananya Desai", "Vikram Patel". Domains: 2 × Tax, 2 × Audit, 1 × Consulting.

### O3. Inline-compose empty state — **principles**
- **Idea:** PoolDashboard "No applicants yet" → embed a 3-field paste-CSV form in the empty state itself (instead of "Add applicants" button → modal). Reduces taps.
- **Lift:** `EmptyState.inlineCompose` slot exists. Wire it.
- **Effort:** ~1.5 hr.

### O4. Driver.js tour content — **principles**
- **Status:** Driver.js installed (F24.8), unused
- **Idea:** Run a 5-step tour the first time a user lands on `/dashboard` after completing the FirstRunStepper. Highlight: HeroKPI → time range control → recent interviews → Cmd+K hint → "View TAG" example
- **Effort:** ~1 hr

---

## Surface kit 3 — Forms + wizards (CreateInterview)

Current state: [src/pages/CreateInterview.tsx](../../src/pages/CreateInterview.tsx) is the worst-styled surface (P0-4 + P0-5 in post-F26 audit). 4,366 lines, ALL CAPS labels, red-X step indicator, blue palette leaks on credit numerals, modal title forced uppercase by CSS.

### W1. Origin UI Multi-Select — **Tier 1**
- **Source:** [21st.dev/originui/multiselect/default](https://21st.dev/originui/multiselect/default)
- **Install:** Origin UI ships via shadcn CLI; check `originui.com` for exact command
- **What:** Mature multi-select with chip overflow, search, keyboard nav, clear-all
- **What to steal:** CreateInterview's "Add skills" picker is custom and visually noisy. Origin UI's multi-select is the de-facto pattern shadcn ecosystem uses.
- **FunnelHQ surface:** CreateInterview skills picker, Pool/Lists filter chips, ManageInterviewsEnhanced status filter.

### W2. 21st.dev Stepper/Wizard collection — **Tier 2**
- **Sources:** [21st.dev/s/stepper-wizard](https://21st.dev/s/stepper-wizard) · [21st.dev/community/components/user/stepper/default](https://21st.dev/community/components/user/stepper/default) · [21st.dev/nyxbui/stepper/default](https://21st.dev/nyxbui/stepper/default)
- **What to steal:** Linear-style numbered step indicator with horizontal connecting line + filled-bar progress between completed steps. Currently CreateInterview shows red-X for active step (reads as error).
- **Adaptation:** Pick one of the cleaner stepper components, swap `bg-purple-500` defaults for `bg-success` (complete) + `bg-ink` (active) + `bg-paper-3 border border-rule` (unvisited). ~30 min.
- **FunnelHQ surface:** CreateInterview wizard step indicator, CandidateRegistration wizard.

### W3. Hiring Platform Multi-Step Form (Berktug Mutlu, Dribbble) — **inspiration**
- **Source:** [dribbble.com/shots/14452575-Hiring-Platform-Multi-Step-Form](https://dribbble.com/shots/14452575-Hiring-Platform-Multi-Step-Form)
- **Pattern:** Field grouping by intent (Role basics / Skills / Schedule / Review) shown as a vertical sidebar of step cards, each with a checkmark when complete; right pane shows the current step's form. Easier to scan than horizontal stepper for ≥4 steps.
- **FunnelHQ surface:** CreateInterview if F23.3 split happens.

### W4. Magic UI Animated Circular Progress Bar (re-use) — for step indicator
- See D3 above. The circular progress can also serve as a wizard "X of N steps complete" badge in the page header — a Linear pattern.

---

## Surface kit 4 — TAG + data viz

Current state: [src/components/tag/TalentAnalysisGraph.tsx](../../src/components/tag/TalentAnalysisGraph.tsx) — F4 + F21 shipped the radial graph + side-rail (certs/tools/ideal-candidate) + insights cards. F24.4 added animated counter on score reveal. Audit P0 carryover: `transition: width` on score-fill bars (TAG-perf, see [TagSvgGraph.tsx:306](../../src/components/tag/TagSvgGraph.tsx#L306) and [styles.css:283](../../src/components/tag/styles.css#L283)).

### T1. Magic UI Number Ticker (re-use) — for TAG score
- See D1 above. Replaces the hand-rolled F24.4 counter on the hero score area.

### T2. Animated Number from reuno-ui (alternative) — **Tier 2**
- **Source:** [21st.dev/community/components/reuno-ui/animated-number](https://21st.dev/community/components/reuno-ui/animated-number)
- **Deps:** `motion`, `@number-flow/react`, `react-intersection-observer`
- **Note:** `@number-flow/react` is the modern best-in-class library for animated numerics — it preserves digit alignment AND animates per-digit (not just whole-number). For TAG marquee, this gives a slot-machine feel that's appropriate for a "score reveal" moment.
- **Adaptation:** Add `@number-flow/react` dep (~12 KB gzip), use with `font-mono tabular-nums` styling
- **Trade-off vs Magic UI ticker:** number-flow is *prettier* per-digit; Magic UI ticker is *simpler*. For TAG specifically, number-flow earns its weight.
- **FunnelHQ surface:** TAG hero score, marketing landing big-number stats.

### T3. Network/radial graph reference — Dribbble Assessment Report
- **Source:** [Assessment Candidate Report (NamanKreative)](https://dribbble.com/shots/22915821-Assessment-Candidate-Report-UX-Visual-Improvements)
- **Pattern:** Two-column layout — left column shows radial chart at full size, right column shows a stacked list of skill rows with mini-bars and L1-L5 chips. Click a row → graph node highlights. Click graph node → row highlights + scrolls into view.
- **What to steal:** The bidirectional row↔node selection sync. Our TAG already has the side panel but no scroll-into-view binding.
- **Effort:** ~2 hr to wire `scrollIntoView({ behavior: 'smooth', block: 'center' })` on selected row.

### T4. Magic UI Animated Circular Progress Bar (re-use) — for TAG ring
- See D3. Wrap the central TAG hero score in a thin gold-ink animated ring filling from 0 → score%. Builds the "deliberate reveal" moment F24.4 plan called for.

---

## Cross-cutting patterns

### X1. Status pill next to data (not in a separate column)
Lift from Razorpay payment dashboard idiom. Currently FunnelHQ has status as a separate table column — moving the pill inline next to applicant name halves visual scan distance.

### X2. `divide-y` over individually bordered cards in dense data zones
Already in DESIGN.md as a directive but unevenly applied. Audit hits: ManageInterviewsEnhanced rows, Lists analytics rail, Settings sub-tabs. Worth a follow-up sweep.

### X3. Sticky table header + filter chip rail
Vercel/Linear pattern. Our ManageInterviewsEnhanced table doesn't pin the header on scroll. For a recruiter scrolling 50+ applicants, this is a real friction. Tailwind `sticky top-0 bg-paper border-b border-rule z-10` on `<thead>`.

### X4. Cmd+K hint visible in nav
F24.3 shipped Cmd+K palette but no visible discoverability. Add a small `<kbd>⌘K</kbd>` hint in the top-right of the chrome.

### X5. Font: keep Geist
Impeccable detect flagged Geist as "overused-font." Reject this finding — Geist is FunnelHQ's chosen face per DESIGN.md. Document the override.

### X6. ~~`@number-flow/react`~~ — **CUT** by multi-agent review
Per-digit `<span>` reads as separate tokens on VoiceOver. Plus second numeric-anim lib alongside Magic UI ticker. Pick one — ticker passes. (Original entry retained for trail.)

---

## Reject pile

Patterns we considered and rejected — recorded so we don't re-evaluate later.

| Pattern | Source | Rejected because |
|---|---|---|
| Aceternity Lamp / Background Beams / Sparkles | 21st.dev/aceternity | Decorative dark-mode-first effects. Off-palette. |
| Magic UI `animated-beam` | magicui.design | Cyber-aesthetic node-graph beams. Off-brand for finance. |
| Magic UI `orbiting-circles` | magicui.design | Decorative — adds nothing for our surfaces |
| Magic UI `terminal` | magicui.design | Dev-tool aesthetic; we're not selling to engineers |
| Aceternity skewed bento | 21st.dev/aceternity/bento-grid | "Skewed grid" violates DESIGN.md "alignment readable" rule |
| Sparkles / SparklesText | 21st.dev/magicui/sparkles-text | Decorative; doesn't earn its motion budget |
| Display Cards (Codehagen) | 21st.dev/Codehagen/display-cards | "Stacked card layout" — cute but doesn't fit our information-dense pages |
| Modern sidebar (uniquesonu) | 21st.dev/community/components/uniquesonu/modern-side-bar | Heavy gradient defaults; we already have a working sidebar |
| Custom jatin-yadav05 command palette | 21st.dev/community | We already shipped F24.3 with shadcn `<CommandDialog>` — re-doing wastes budget |
| FlipCountdown | 21st.dev/easemize/flip-countdown | Wrong tone; finance-trust isn't game-show countdown |
| Uiverse buttons | uiverse.io | 403 to fetch + their button library is overwhelmingly playful/animated |
| Marketing landing dark gradient hero (Stripe-clone) | many sources | F1 explicitly banned dark mode; F7 ripped out the gradient hero |

---

## Suggested F28 micro-PRs (revised after multi-agent review)

11 PRs in **revised priority order** (by user-felt impact, per multi-agent synthesis). Each ships independently. A11y contracts inlined per PR.

### F28.3 — CreateInterview wizard polish (~2 hr) — **PRIORITY 1**
Audit P0-4/P0-5 carryover. Worst-styled surface in app.
- Drop CSS `uppercase` on Dialog title at [CreateInterview.tsx:3682](../../src/pages/CreateInterview.tsx#L3682) (the "INTRODUCING INTERVIEW BLUEPRINTS" modal)
- Sweep ALL CAPS labels (`INTERVIEW DETAILS`, `INTERVIEW TITLE *`, `INTERVIEW TYPE *`, `START FROM`, `DURATION *`, `DESCRIPTION *`, `SCREENING`/`FITMENT` tabs, `CREATE NEW`, `USE BLUEPRINT`, `CANCEL`/`NEXT` buttons)
- Fix red-X step indicator → tri-state: `bg-success` (complete) / `bg-ink text-paper` (active) / `bg-paper-3 border border-rule text-muted` (unvisited). Numbered, with `aria-current="step"` on active and visually-hidden "Completed" text on done steps.
- Replace blue credit numerals (`60`, `30`) with `font-mono tabular-nums text-ink`
- Vocab: "MAX CANDIDATES" → "Max applicants"
- Replace custom skills picker with Origin UI multi-select (chips have `aria-label="Remove {skill}"`, listbox `aria-multiselectable="true"`, `aria-live="polite"` on chip removal)
- Wizard modal: `role="dialog" aria-modal="true"`, focus trap, Esc closes, focus restores to trigger
- **Files:** [src/pages/CreateInterview.tsx](../../src/pages/CreateInterview.tsx)
- **WCAG:** SC 1.3.1, 1.4.1, 2.1.2, 2.4.3, 2.4.7, 4.1.2
- **Commit:** `F28.3: CreateInterview palette + stepper + multi-select + a11y`

### F28.8 — Skeleton loaders matching layout (~2 hr) — **PRIORITY 2 (NEW)**
DESIGN.md mandates skeleton loaders match layout. Currently 6+ surfaces use bare `<Loader2 animate-spin>`.
- Audit: `rg "Loader2" src` to find all `animate-spin` usages on data-bearing regions
- Replace each with shadcn `<Skeleton>` shaped to match the rendered layout (cards → card-shaped skeletons, rows → row-shaped skeletons, KPI tiles → tile-shaped skeletons)
- Honor `prefers-reduced-motion` — Tailwind's `animate-pulse` already respects this; verify
- **Files:** [src/pages/Dashboard.tsx](../../src/pages/Dashboard.tsx), [src/pages/ManageInterviewsEnhanced.tsx](../../src/pages/ManageInterviewsEnhanced.tsx), [src/pages/InterviewDetails.tsx](../../src/pages/InterviewDetails.tsx), [src/pages/PoolDashboard.tsx](../../src/pages/PoolDashboard.tsx), [src/components/tag/TalentAnalysisGraph.tsx](../../src/components/tag/TalentAnalysisGraph.tsx)
- **Commit:** `F28.8: layout-matched skeleton loaders across data surfaces`

### F28.1 — Number Ticker upgrade (~45 min) — **PRIORITY 3**
Replaces F24.4 hand-rolled counter.
- Install: `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"`
- Replace [src/components/ui/animated-counter.tsx](../../src/components/ui/animated-counter.tsx) call sites with `<NumberTicker value={...} />`
- **Spec:** pass `transition: { ease: [0.16, 1, 0.3, 1], duration: 0.6 }` (ease-out-expo per shared design law) instead of bare `useSpring`
- Wrap in `useReducedMotion()` — when true, render final value immediately
- Add visually-hidden `aria-live="polite"` sibling that announces only the final value once; animated digits carry `aria-hidden="true"`
- TAG: `<span className="sr-only" aria-live="polite">Talent Analysis Graph score: {value} out of 100</span>`
- Delete the F24.4 hand-rolled counter
- **Files:** [src/components/dashboard/HeroKPI.tsx](../../src/components/dashboard/HeroKPI.tsx), [src/components/dashboard/StatsCard.tsx](../../src/components/dashboard/StatsCard.tsx), [src/pages/MarketingLanding.tsx](../../src/pages/MarketingLanding.tsx), [src/components/tag/](../../src/components/tag/)
- **WCAG:** SC 2.2.2, 2.3.3, 4.1.3
- **Commit:** `F28.1: replace AnimatedCounter with Magic UI number-ticker (viewport-aware + a11y)`

### F28.9 — Tactile press sweep (~1 hr) — **PRIORITY 4 (NEW)**
Explicit motion rule in CLAUDE.md, currently unaudited.
- Add `active:translate-y-[1px] transition-transform duration-100` to all primary buttons in [src/components/ui/button.tsx](../../src/components/ui/button.tsx)
- Add `active:scale-[0.98]` to interactive cards (Dashboard tiles, list rows, candidate drawer cards)
- Verify F24.1 sweep was applied; if not, complete it
- **Commit:** `F28.9: universal tactile press feedback on buttons + cards`

### F28.6 — Cmd+K hint + sticky table headers (~45 min) — **PRIORITY 5**
- Add `<kbd aria-label="Press Command K to open search">⌘K</kbd>` hint in top-right of [src/components/layout/Header.tsx](../../src/components/layout/Header.tsx) — detect non-Mac via `navigator.platform`, show `Ctrl+K`
- Cmd+K shortcut: `event.preventDefault()` only when focus is **not** in input/textarea/contenteditable
- Add `sticky top-0 bg-paper border-b border-rule z-10` to ManageInterviewsEnhanced + Lists tables `<thead>`
- Add `scroll-padding-top: 3rem` on the scroll container so focused rows aren't hidden under sticky header (SC 2.4.11 Focus Not Obscured — new in WCAG 2.2)
- Table needs `<caption>` (sr-only) + `scope="col"` on `<th>`
- **WCAG:** SC 2.1.1, 2.1.4, 2.4.11, 1.3.1
- **Commit:** `F28.6: Cmd+K hint + sticky table headers + a11y`

### F28.4 — TAG ring (~1 hr) — **PRIORITY 6**
- Install: `npx shadcn@latest add "https://magicui.design/r/animated-circular-progress-bar.json"`
- Add gold-ink ring around TAG hero score that fills 0→score% on mount
- ~~Optional: install `@number-flow/react`~~ — **CUT** by multi-agent review
- SVG + ring → `aria-hidden="true"`; sibling `<div role="img" aria-label="Talent Analysis Graph score: {value} out of 100. {band} for {domain}.">`
- Pair gold-ink color with textual label ("Strong" / "Average" / "Below threshold") — never rely on color alone (SC 1.4.1)
- Ring fill respects `prefers-reduced-motion` — render at final stroke-dashoffset
- **Files:** [src/components/tag/TalentAnalysisGraph.tsx](../../src/components/tag/TalentAnalysisGraph.tsx)
- **WCAG:** SC 1.1.1, 1.4.1, 2.3.3
- **Commit:** `F28.4: TAG circular progress ring + a11y`

### F28.5 — Sample-data + inline-compose empty states (~3 hr) — **PRIORITY 7**
- Backend: add `POST /api/workspaces/{wid}/seed-sample-data` route that creates **organic counts** (e.g. 7 applicants, 3 active stages) using PRODUCT.md anonymized Indian-finance names ("Priya Sharma", "Arjun Mehta", "Rohan Iyer", "Ananya Desai", "Vikram Patel", "Shreya Iyer", "Ravi Krishnan"). **Avoid round numbers (5/10/100/95%) per taste-skill ban on fake-round-number stats.**
- Wire `EmptyState.sampleDataAction` on Dashboard + PoolDashboard (uses existing F24.2 slot)
- Wire `EmptyState.inlineCompose` on PoolDashboard for paste-CSV
- **One primary CTA, one secondary** — primary first in tab order
- After seed: `aria-live="polite"` toast: "7 sample applicants added. Clear sample data anytime from Settings."
- Inline-compose textarea: visible `<label>`, `aria-describedby` for helper, `aria-invalid` + `aria-errormessage` on parse failure
- "Clear sample data" button: `aria-describedby` warning ("This removes 7 applicants and 1 sample interview.") — SC 3.3.4
- **WCAG:** SC 3.3.1, 3.3.4, 4.1.3, 2.4.3
- **Commit:** `F28.5: sample-data path + inline-compose empty states + a11y`

### F28.7 — Onboarding stepper with screenshots (~2 hr) — **PRIORITY 8**
Lift the *idea* of paired-screenshot pane from ravikatiyar onboarding-checklist; **don't install the component**.
- Capture 3 screenshots: domain pick, create interview, invite teammate
- Pair with FirstRunStepper as right-pane preview
- "Skip onboarding" rendered as visible link in top-right, `tabIndex={0}`, focusable **before** stepper content
- Each screenshot: `alt="Domain picker showing Taxation, Accounting, Management Consulting tiles"` — describe what user sees, not "screenshot of step 1"
- Stepper: `<ol aria-label="Getting started">`, active `<li aria-current="step">`, completed has `<span class="sr-only">Completed</span>`
- Right-pane crossfade respects `prefers-reduced-motion`; announce step change via `aria-live="polite"`
- **Files:** [src/components/onboarding/FirstRunStepper.tsx](../../src/components/onboarding/FirstRunStepper.tsx)
- **WCAG:** SC 1.1.1, 2.4.3, 2.4.4, 4.1.3, 2.3.3
- **Commit:** `F28.7: onboarding stepper with paired screenshot pane + a11y`

### F28.10 — `min-h-[100dvh]` + `lang="en-IN"` audit (~30 min) — **PRIORITY 9 (NEW)**
- `rg "h-screen" src` → must be 0 (CLAUDE.md says 0; verify)
- Replace any hits with `min-h-[100dvh]`
- Confirm `<html lang="en-IN">` in [index.html](../../index.html); switch to `lang={i18n.language}` if i18n is wired
- **Commit:** `F28.10: dvh + lang audit`

### F28.11 — Form-field error states (~2 hr) — **PRIORITY 10 (NEW)**
Board fixed CreateInterview stepper + multi-select but ignored field-level error states.
- Define inline-error pattern: `<Input aria-invalid aria-errormessage="field-error-id">` + `<p id="field-error-id" className="text-sm text-danger">{error}</p>`
- Apply to all CreateInterview fields + applicant CandidateRegistration fields
- Toast on submit failure summarizes "3 fields need attention"
- **WCAG:** SC 3.3.1, 3.3.3, 4.1.3
- **Commit:** `F28.11: inline form-field error states (CreateInterview + CandidateRegistration)`

### F28.2 — Marketing trust strip (~45 min) — **PRIORITY 11 (deferred — needs operator action)**
- Install: `npx shadcn@latest add "https://magicui.design/r/marquee.json"`
- Replace empty trust-strip placeholder on [src/pages/MarketingLanding.tsx](../../src/pages/MarketingLanding.tsx) with infinite-scroll customer logo row
- Set `pauseOnHover` AND wrap in container with `:focus-within { animation-play-state: paused }`
- Visible "Pause" button (`aria-pressed`) above the strip — required for >5s animation per SC 2.2.2
- `prefers-reduced-motion: reduce` → static wrapped row
- Each logo: `<img alt="Razorpay">` (real alt, not decorative); wrap whole strip in `<section aria-label="Customer logos">`
- Logos: `grayscale hover:grayscale-0` so trust-strip default reads neutral and color reveals on hover (per Restrained color strategy ≤10% accent)
- **Operator action:** provide 6-8 real customer logo SVGs (deferred until pilot customers confirmed)
- **WCAG:** SC 2.2.2, 2.3.3, 1.1.1
- **Commit:** `F28.2: marquee trust strip on marketing landing + a11y`

**Revised F28 total: ~14.5 hours = 2 working days.** Ships felt-quality lift across 4 surfaces with WCAG 2.2 AA discipline + taste-skill compliance.

### Cuts from original F28 (multi-agent review)
- ~~Magic UI `bento-grid` install~~ — keep our [BentoGrid.tsx](../../src/components/dashboard/BentoGrid.tsx); lift composition idea
- ~~Aceternity Resizable Navbar~~ — animates layout properties
- ~~`@number-flow/react`~~ — second numeric-anim lib + a11y burden
- ~~Install ravikatiyar onboarding-checklist~~ — playful gradients ship by default; lift paired-screenshot pattern only

---

## Source list (clickable)

**21st.dev community + Magic UI:**
- [21st.dev community](https://21st.dev/community/components/s/shadcn-ui)
- [21st.dev empty state collection](https://21st.dev/s/empty-state)
- [21st.dev stepper-wizard collection](https://21st.dev/s/stepper-wizard)
- [21st.dev cmdk collection](https://21st.dev/s/cmdk)
- [21st.dev animated number counter](https://21st.dev/s/animated-number-counter)
- [21st.dev bento grid collection](https://21st.dev/community/components/s/bento-grid)
- [21st.dev sidebar collection](https://21st.dev/s/sidebar)
- [Magic UI homepage](https://magicui.design/)
- [Origin UI homepage](https://originui.com/)
- [Aceternity UI](https://ui.aceternity.com/)
- [Kokonut UI](https://kokonutui.com/)

**Dribbble & visual references:**
- [Razorpay design portfolio](https://dribbble.com/razorpay)
- [RazorpayX Dashboard](https://dribbble.com/shots/6452470-RazorpayX-Dashboard)
- [Faster Payments with Razorpay Invoices](https://dribbble.com/shots/6033581-Faster-Payments-with-Razorpay-Invoices)
- [Hiring Platform Multi-Step Form (Berktug Mutlu)](https://dribbble.com/shots/14452575-Hiring-Platform-Multi-Step-Form)
- [Assessment Candidate Report (NamanKreative)](https://dribbble.com/shots/22915821-Assessment-Candidate-Report-UX-Visual-Improvements)
- [Bento grid for revops startup (Robin Holesinsky)](https://dribbble.com/shots/25765472-Bento-grid-dashboard-for-revops-startup)
- [Dribbble fintech-dashboard tag](https://dribbble.com/tags/fintech-dashboard)
- [Dribbble bento-grids tag](https://dribbble.com/tags/bento-grids)

**Pattern guides & analyses:**
- [Eleken — Trusted fintech UI examples](https://www.eleken.co/blog-posts/trusted-fintech-ui-examples)
- [Orbix — Bento Grid Dashboard Design Guide 2026](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)
- [BalTech — Bento Grids for AI Dashboards](https://baltech.in/blog/bento-grids-for-ai-dashboards/)

---

## Verification

After triaging:
1. Open the F28 list above; pick which to greenlight
2. For each greenlit Tier 1: copy the install command, run it, swap the two or three identified files, ship
3. For each Tier 2: read the adaptation note + budget the extra ≤30 min
4. None of the picks introduce new top-level dependencies beyond `motion` (already shipped) and optionally `@number-flow/react` (~12 KB gz, only for F28.4)

If you want a PR-ready spec for any single F28 item — say which one and I'll write the file-by-file plan in another session.

---

*End of inspiration board. ~25 accepted picks across 4 surfaces, organized into 7 F28 micro-PRs totaling ~10 hr.*
