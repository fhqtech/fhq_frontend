# Multi-agent review of inspiration board — 2026-05-15

**Reviewers:** Impeccable critique (manual, since target is markdown not HTML) + taste-skill agent + a11y-architect agent
**Target:** [.claude/audits/2026-05-15-design-inspiration-board.md](2026-05-15-design-inspiration-board.md)
**Verdict:** **Conditional pass** — board has real judgment in 60% of picks, but two centerpiece picks must be cut and three discipline gaps must be added before F28 ships.

---

## Section 1 — Impeccable critique (manual, anti-patterns lens)

Target is a curation document, not a viewable page; deterministic detector + browser overlay don't apply. Applying the **shared design laws** + **absolute bans** as the lens.

### Anti-patterns verdict

- **Hero-metric template** — D5 (Aceternity Resizable Navbar) and the Razorpay D4 reference both pull toward the SaaS-cliché big-number-small-label-supporting-stats layout. Board doesn't push back. **P1**.
- **Identical card grids** — D2 (Magic UI bento-grid as accepted) is exactly the "skewed/uniform tile" anti-pattern that the absolute-bans list calls out. Adapting it to `bg-paper border border-rule shadow-1` strips the only thing it ships. **P0** — drop, lift the *idea* of bento composition into our own `BentoGrid.tsx` instead.
- **Side-stripe borders** — board doesn't propose any (good). But also doesn't audit whether existing surfaces have them. The post-F26 audit found ConversationPanel `border-l-15`, EvidencePanel `border-l-2`, EmailTemplatePreview `border-left: 4px`. F28 should sweep these. **P1**.
- **Modal as first thought** — F28.5 sample-data is described as a CTA, not a modal — good. F28.7 onboarding stepper is inline — good. But the existing CreateInterview "INTRODUCING INTERVIEW BLUEPRINTS" modal (audit P0-5) isn't in the F28 fix list explicitly. **P1** — add to F28.3.
- **Em dashes** — copy ban from shared design laws. The board itself uses em dashes liberally (50+ instances). The board is internal documentation, not user-facing copy, so this is acceptable for the artifact, but the board's "what to steal" notes should not propose em dashes for user-visible strings. None do. **Pass**.
- **Gradient text / glassmorphism / pure black** — board's reject pile correctly nukes Aceternity Lamp/Beams/Sparkles. **Pass**.

### Color strategy

Board doesn't restate FunnelHQ's chosen strategy. From DESIGN.md: **Restrained** (tinted neutrals + one accent ≤10%). All accepted picks need to honor this. Two flags:
- `@number-flow/react` (T2/F28.4) doesn't itself violate, but per-digit slot-machine reveal **adds chroma weight** to the TAG hero — Restrained budgets ≤10% accent, and a full ring + animated digits + insights cards push past it. **P1** — pick the ring OR the per-digit, not both.
- F28.2 marquee with customer logos — if logos are full-color (Razorpay blue, Cred yellow, etc.), strip exceeds 10% accent. Apply `grayscale hover:grayscale-0` so the trust-strip default reads neutral and color reveals on hover. **Add to F28.2 spec**.

### Theme / scene sentence

Board never ran the scene sentence. Forcing it now: *"Finance hiring manager at a 16-person CA firm in Pune, mid-morning between two screening calls, scanning the dashboard on a 14-inch laptop in a fluorescent-lit office, looking for which candidate to call back."* This forces **light theme, max-density, low-motion** — confirms the dial settings and rules out the Aceternity-style scroll-shrink navbar (D5). Scene-sentence test was missed. **P2** — document it in PRODUCT.md so future picks anchor against it.

### Typography / layout / motion

- Body line length not mentioned for any pick — most are tile/card primitives where it's moot. **Pass**.
- "Cards are the lazy answer" — D1, D3 are non-card primitives ✓. D2 bento is all cards ✗. F28.7 onboarding stepper is two-pane (card + screenshot) — borderline; checklist items inside are list rows, not nested cards ✓.
- Motion: D5 Aceternity navbar animates layout (height, position) — violates "Don't animate CSS layout properties." **Drop confirmed**.
- Exponential easing: F28.1 number-ticker uses Motion's spring default (`useSpring`). Spring is acceptable for spring-feel moments, but the shared law says "Ease out with exponential curves… No bounce, no elastic." `useSpring` with default stiffness can read springy. **Spec for F28.1**: pass `transition: { ease: [0.16, 1, 0.3, 1], duration: 0.6 }` (ease-out-expo) instead of bare `useSpring`.

### LLM design review summary

- **What works**: Reject pile is sharp. Top-5 picks (number-ticker, marquee, multi-select, circular progress, bento — minus bento) are largely earned. Cross-cutting patterns (status pill inline, divide-y, sticky header, ⌘K hint) are pure VISUAL_DENSITY=6 wins.
- **What doesn't**: The "we'll just adapt it" rationalization shows up 3 times (D2 bento, D5 navbar, T2 number-flow). Taste-skill caught all three. Drop them.
- **Biggest opportunity**: The board treats *patterns* as the unit of work, not *user-felt moments*. The post-F26 audit identified a CreateInterview wizard that screams ALL CAPS and uses a red-X for "active step." That's a felt-quality emergency; F28.3 mentions it but doesn't budget enough. Promote F28.3 to be the first PR, not the third.

---

## Section 2 — Taste-skill agent verdict (verbatim summary)

**Pass:** D1/F28.1 number-ticker · D3/F28.4 circular progress · W1/F28.3 multi-select · X1-X4 cross-cutting · F28.6 cmd+K + sticky header · entire reject pile.

**Fail:**
- **D2 / Magic UI bento-grid** — pure-black-adjacent gradient default + perpetual-feel mount stagger violates DESIGN_VARIANCE=4 and pure-black ban. Adapting to `bg-paper border border-rule` strips the only value-add. **Drop**.
- **D5 / Aceternity Resizable Navbar** — animates layout properties + dark-mode-first defaults. **Drop**.
- **T2 / `@number-flow/react`** — second numeric-animation lib alongside Magic UI ticker; board admits "two patterns shouldn't coexist." **Drop**.
- **F28.5 sample-data names** — pairing with "5 applicants, 60%" risks fake-round-number-stats smell. Use organic counts (7 applicants, 3 active stages).
- **O1 / Onboarding checklist (Ravikatiyar)** — playful gradients + emoji checkmarks ship by default. Lift the *idea* (paired screenshot pane), not the component.

**Missing from the board:**
- **Skeleton loaders matching layout** — DESIGN.md mandates these; zero F28 PRs cover them. Add F28.8.
- **`active:translate-y-[1px]` / `active:scale-[0.98]` tactile press sweep** — explicit motion rule, unaudited.
- **Toast/drawer tuning** (Sonner/Vaul reference in CLAUDE.md) — board doesn't mention. Verify shadcn defaults use `--ease-spring`.
- **Form-field error & validation patterns** for CreateInterview — board fixes the stepper + multi-select but ignores field-level error states.
- **`min-h-[100dvh]` audit** — no pick verifies whether MarketingLanding/Dashboard use `h-screen`.

**Overall verdict:** *60% taste-skill-disciplined, 40% slop-in-finance-trust-clothing. Strip D2/D5/T2, add the skeleton/tactile/dvh sweeps, F28 becomes a clean shipping plan.*

---

## Section 3 — A11y-architect agent verdict (full report inlined)

The board treats motion, semantics, and keyboard flow as implementation details. WCAG 2.2 AA gaps per F28 PR + the contracts to bake in before merge:

### F28.1 Number Ticker
- **Gap**: Magic UI ticker uses `useSpring` with no `prefers-reduced-motion` fallback. Screen readers hear nothing on value mutation, or worse, every interpolated integer if `aria-live` is naive.
- **Contract**:
  - `useReducedMotion()` → render final value immediately, no count
  - Visually-hidden `aria-live="polite"` sibling announces only the final value once; animated digits carry `aria-hidden="true"`
  - TAG: `<span className="sr-only" aria-live="polite">Talent Analysis Graph score: 73 out of 100</span>`
- **WCAG**: SC 2.2.2, 2.3.3, 4.1.3

### F28.2 Marquee trust strip
- **Gap**: Magic UI marquee CSS-animates infinitely; pause-on-hover only via prop. No keyboard pause. Logos lack `role="img"` + `aria-label`.
- **Contract**:
  - `pauseOnHover` prop + `:focus-within { animation-play-state: paused }`
  - Visible "Pause" button (`aria-pressed`) above the strip — required for >5s animation per SC 2.2.2
  - `prefers-reduced-motion: reduce` → static wrapped row
  - Each logo: `<img alt="Razorpay">` with real alt; wrap whole strip in `<section aria-label="Customer logos">`
- **WCAG**: SC 2.2.2, 2.3.3, 1.1.1

### F28.3 CreateInterview wizard
- **Gaps**: Origin UI multi-select needs focus restoration on close, chip-removal announcement, modal focus contract. Stepper SC 1.4.1 — never use color/shape alone for active vs complete.
- **Contracts**:
  - Multi-select chip remove: `aria-label="Remove {skill}"` + `aria-live="polite"` "Tax compliance removed. 3 skills selected."
  - Listbox: `role="listbox" aria-multiselectable="true"`, options `role="option" aria-selected`. Arrow + Home/End/typeahead.
  - Wizard modal: `role="dialog" aria-modal="true" aria-labelledby`, focus trap, Esc closes, focus returns to trigger.
  - Stepper: `<ol aria-label="Interview setup steps">`, active `aria-current="step"`, completed has visually-hidden "completed" text. Each step `aria-label="Step 2 of 4: Skills"`.
- **WCAG**: SC 2.4.3, 2.4.7, 1.3.1, 4.1.2, 2.1.2

### F28.4 TAG ring + per-digit reveal
- **Gaps**: `@number-flow/react` per-digit can read each `<span>` as separate token on VoiceOver. SVG ring has no role.
- **Contract**:
  - SVG + number-flow root → `aria-hidden="true"`
  - Sibling `<div role="img" aria-label="Talent Analysis Graph score: 73 out of 100. Above average for Taxation domain.">` carries semantic
  - Ring fill respects `prefers-reduced-motion` — render at final stroke-dashoffset
  - Don't rely on gold-ink alone for score band — pair with textual label ("Strong", "Average", "Below threshold")
- **WCAG**: SC 1.4.1, 1.1.1, 2.3.3
- **Note**: this gap also reinforces taste-skill's "drop number-flow" finding — a11y burden compounds.

### F28.5 Sample-data + inline-compose
- **Gaps**: Two CTAs without primary, tab-order ambiguity, dynamic seeding without announcement.
- **Contract**:
  - One **primary** (`Button variant="primary"`), one **secondary** — visually + DOM order. Primary first in tab order.
  - After seed: `aria-live="polite"` toast "5 sample applicants added. Clear sample data anytime from Settings."
  - Inline-compose textarea: visible `<label>`, `aria-describedby` for helper, `aria-invalid` + `aria-errormessage` on parse failure
  - "Clear sample data" button: `aria-describedby` warning ("This removes 5 applicants.") — SC 3.3.4
- **WCAG**: SC 3.3.1, 3.3.4, 4.1.3, 2.4.3

### F28.6 Cmd+K hint + sticky table headers
- **Gaps**: `<kbd>⌘K</kbd>` reads "command K" on VoiceOver but not on NVDA. Sticky `<thead>` z-index can occlude focus rings on row 1. Cmd+K may collide with screen-reader virtual cursor.
- **Contract**:
  - Hint markup: `<kbd aria-label="Press Command K to open search">⌘K</kbd>` + non-Mac equivalent (`Ctrl+K`) detected via `navigator.platform`
  - Shortcut: `event.preventDefault()` only when focus is **not** in input/textarea/contenteditable
  - Sticky thead: `:focus-visible` outline higher z-index than thead, `scroll-padding-top: 3rem` so focused rows aren't hidden under sticky header (SC 2.4.11 Focus Not Obscured — new in WCAG 2.2)
  - Table needs `<caption>` (sr-only) + `scope="col"` on `<th>`
- **WCAG**: SC 2.1.1, 2.4.11, 1.3.1, 2.1.4

### F28.7 Onboarding stepper with screenshots
- **Gaps**: Screenshot alt text instructional, "Skip onboarding" must be reachable via keyboard FIRST, returning users with screen readers don't know they've completed it (localStorage state silent).
- **Contract**:
  - Each screenshot: `alt="Domain picker showing Taxation, Accounting, Management Consulting tiles"` — describe what user sees, not "screenshot of step 1"
  - "Skip onboarding": visible link in top-right, `tabIndex={0}`, focusable BEFORE stepper content
  - Stepper: `<ol aria-label="Getting started">`, active `<li aria-current="step">`, completed has `<span class="sr-only">Completed</span>`
  - Pane crossfade respects `prefers-reduced-motion`
- **WCAG**: SC 1.1.1, 2.4.3, 2.4.4, 4.1.3, 2.3.3

### Cross-cutting a11y additions for the F28 series
- Minimum 24×24 CSS px target (SC 2.5.8) — chip remove "x" buttons in multi-select are highest risk
- Focus indicator: 2px solid `--gold-ink`, 2px offset, 3:1 contrast against adjacent colors (SC 2.4.11/2.4.13)
- `lang="en-IN"` on `<html>` for Indian English (currently `<html lang>` is set but not regionalized — verify)

---

## Section 4 — Synthesis: revised F28 plan

Combining all three reviews, the revised F28 spec:

### Cuts (drop entirely)
- **D2 / F28 dashboard recomp via Magic UI bento-grid** — taste + impeccable agree
- **D5 / Aceternity Resizable Navbar** — taste + impeccable agree (animates layout)
- **T2 / `@number-flow/react`** — taste + a11y agree (extra dep + a11y burden)
- **O1 / install ravikatiyar onboarding-checklist component** — taste flagged (lift idea only)

### Additions (new F28 PRs)

**F28.8 — Skeleton loaders matching layout (~2 hr)**
- Audit Dashboard, ManageInterviewsEnhanced, InterviewDetails, TAG, PoolDashboard for `<Loader2 animate-spin>` usages
- Replace with layout-matched `<Skeleton>` shapes (we ship shadcn `Skeleton` primitive)
- Spec: each skeleton mirrors the rendered layout (cards → card-shaped skeletons, rows → row-shaped skeletons)

**F28.9 — Tactile press sweep (~1 hr)**
- Add `active:translate-y-[1px]` to all primary buttons in `src/components/ui/button.tsx`
- Add `active:scale-[0.98] transition-transform duration-100` to interactive cards (Dashboard tiles, list rows, candidate drawer cards)
- Verify F24.1 sweep was applied; if not, complete it

**F28.10 — `min-h-[100dvh]` + `lang="en-IN"` audit (~30 min)**
- `rg "h-screen" src` → replace with `min-h-[100dvh]` (CLAUDE.md says 0 — verify still 0)
- Confirm `<html lang="en-IN">` in `index.html`; switch to `lang={i18n.language}` if i18n is wired

**F28.11 — Form-field error states for CreateInterview (~2 hr)**
- Define inline-error pattern: `<Input aria-invalid aria-errormessage="field-error-id">` + `<p id="field-error-id" className="text-sm text-danger">{error}</p>`
- Apply to all CreateInterview fields + applicant registration fields
- Toast on submit failure summarizes "3 fields need attention"

### Updated F28 spec for kept PRs (a11y contracts inline)

Each kept PR (F28.1, F28.2, F28.3, F28.4, F28.5, F28.6, F28.7) gets the **a11y contract** from Section 3 added to its acceptance criteria. No code change to the original board's selection — only the contract spec.

### Revised total estimate
- Original 7 PRs × ~10 hr
- Minus dropped picks (D2 bento + D5 navbar + T2 number-flow + O1 install): -3 hr
- Plus new F28.8/.9/.10/.11: +5.5 hr
- Plus a11y contracts on kept PRs: +2 hr (additional `aria-live`, `useReducedMotion` wiring, focus contracts)
- **Revised total: ~14.5 hr = 2 working days.**

### Revised priority order (by user-felt impact, not by source list)
1. **F28.3** — CreateInterview polish (P0 audit carryover, biggest felt-quality gap)
2. **F28.8** — Skeleton loaders (every page improves)
3. **F28.1** — Number ticker (TAG + dashboard, highest visibility)
4. **F28.9** — Tactile press sweep (universal)
5. **F28.6** — Cmd+K hint + sticky table headers (power-user)
6. **F28.4** — TAG ring (marquee polish; drop number-flow)
7. **F28.5** — Sample-data empty states (cold-start fix)
8. **F28.7** — Onboarding stepper screenshots (returning-user polish)
9. **F28.10** — `min-h-[100dvh]` + `lang` audit (5 min)
10. **F28.11** — Form-field error states (CreateInterview polish complement)
11. **F28.2** — Marquee trust strip (operator action — needs real logos)

---

## Final verdict

**Inspiration board is shippable as a research artifact**, but the F28 PR list should not ship as-written. After the agent review:

- **Cut 4 picks** that violate dial settings or duplicate work (D2 bento, D5 navbar, T2 number-flow, O1 install)
- **Add 4 new PRs** the board missed (skeleton loaders, tactile press sweep, dvh/lang audit, form-field errors)
- **Wire a11y contracts** into every kept PR's acceptance criteria

Net: **11 PRs, ~14.5 hr, ~2 working days.** Ships felt-quality lift across 4 surfaces with WCAG 2.2 AA discipline + taste-skill compliance.

The board's strength: judgment in the reject pile + the cross-cutting patterns. Its weakness: rationalizing 3 picks ("we'll just adapt it") that the dials didn't authorize. Multi-agent review caught all three — exactly what this kind of review is for.

---

*Reviewers: Impeccable critique (manual against shared design laws + absolute bans), taste-skill agent (general-purpose against CLAUDE.md taste rules), a11y-architect (WCAG 2.2 AA per-PR contracts). 3 independent assessments, no shared context, synthesized here.*
