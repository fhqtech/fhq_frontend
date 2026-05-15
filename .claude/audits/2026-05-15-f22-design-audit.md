# F22 design audit — 2026-05-15

Findings only. No edits applied.

Inputs:
- `npx impeccable detect ./src` (deterministic 24-rule scanner) — **30 hits**
- Manual ripgrep sweep against the taste-skill bans we adopted in [CLAUDE.md](../../CLAUDE.md)

Triage convention: **P0** = must-fix before pilot deploy. **P1** = should-fix this sprint. **P2** = backlog / cosmetic.

---

## Section 1 — Impeccable detect (30 hits across 7 rules)

| Rule | Count | Severity |
|---|---|---|
| `border-accent-on-rounded` | 11 | P1 |
| `pure-black-white` | 6 | P1 |
| `side-tab` | 5 | P1 |
| `overused-font` (Geist) | 3 | **dismissed** — Geist is the FunnelHQ standard, not a slop signal here. Document override. |
| `layout-transition` (animating width) | 2 | P0 (TAG perf) |
| `bounce-easing` (`animate-bounce`) | 2 | P2 |
| `ai-color-palette` (purple in CandidateDrawer) | 1 | P1 |

### 1.1 `pure-black-white` (P1)

`bg-black` is leaking through shadcn primitives' overlay colors and one demo surface. We banned `bg-black` in DESIGN.md → must use `bg-ink`.

| File | Line | Context |
|---|---|---|
| [src/components/ui/alert-dialog.tsx](../../src/components/ui/alert-dialog.tsx) | 19 | overlay `bg-black/80` |
| [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) | 22 | overlay `bg-black/80` |
| [src/components/ui/drawer.tsx](../../src/components/ui/drawer.tsx) | 29 | overlay `bg-black/80` |
| [src/components/ui/source-delete-confirmation-modal.tsx](../../src/components/ui/source-delete-confirmation-modal.tsx) | 28 | overlay `bg-black/50` |
| [src/components/ui/delete-confirmation-modal.tsx](../../src/components/ui/delete-confirmation-modal.tsx) | 36 | overlay `bg-black/50` |
| [src/components/ui/particle-effect-for-hero.tsx](../../src/components/ui/particle-effect-for-hero.tsx) | 302 | demo background `bg-black` |

Plus `text-black` in [src/components/ui/hand-writing-text.tsx](../../src/components/ui/hand-writing-text.tsx) lines 30-32 (also retains a `dark:text-white` branch — dead-code drift since we have no dark mode).

**Fix:** Sweep `bg-black/N` → `bg-ink/N`. Sweep `text-black` → `text-ink`. Strip `dark:` variants from hand-writing-text. Delete `particle-effect-for-hero.tsx` if not imported anywhere (likely dead — we removed the marketing particles in F7).

### 1.2 `side-tab` and `border-accent-on-rounded` (P1)

The "thick colored side border on a rounded card" pattern fires 5 times for `border-l-N` on cards and 11 times for `border-b-2` on rounded surfaces. Combined: 16 hits across our most-trafficked surfaces — they're our biggest aesthetic tell.

Notable hits:
- [src/components/blueprint/BlueprintDisplay.tsx:129](../../src/components/blueprint/BlueprintDisplay.tsx#L129) — `border-l-4` on cards
- [src/components/layout/NotificationBell.tsx:221](../../src/components/layout/NotificationBell.tsx#L221) — `border-l-4` on notification rows
- [src/components/tag/EvidencePanel.tsx:92](../../src/components/tag/EvidencePanel.tsx#L92) — `border-l-2` on TAG evidence (acceptable subtlety; review)
- [src/components/tag/styles.css:352](../../src/components/tag/styles.css#L352) — `border-left: 3px solid var(--tag-gold)` on side panel (TAG idiom; **likely intentional, document the exception**)
- [src/pages/FitmentInterviewDetails.tsx](../../src/pages/FitmentInterviewDetails.tsx) lines 724, 736, 758, 770, 1204 — five `border-b-2` on stat tiles
- [src/pages/InterviewDetails.tsx:2038](../../src/pages/InterviewDetails.tsx#L2038) — `border-b-2`
- [src/pages/ManageInterviewsEnhanced.tsx:814](../../src/pages/ManageInterviewsEnhanced.tsx#L814) — `border-b-2`
- [src/pages/EmailTemplatePreview.tsx:52](../../src/pages/EmailTemplatePreview.tsx#L52) — `border-left: 4px solid #667eea` (purple — also matches `ai-color-palette`)
- [src/components/auth/OAuth2Handler.tsx:59](../../src/components/auth/OAuth2Handler.tsx#L59) — `border-b-2`
- [src/components/ui/file-preview.tsx:210](../../src/components/ui/file-preview.tsx#L210) — `border-b-2`
- [src/components/ui/google-sheets-preview.tsx:188](../../src/components/ui/google-sheets-preview.tsx#L188) — `border-b-2`

**Fix:** Replace `border-l-{2,4} border-{color}` accents with either (a) a `bg-{color}-soft` row background, or (b) a 1px gold-ink left edge `border-l border-gold-ink`, or (c) drop the accent entirely if the row already lives in a list. For `border-b-2` on tiles: drop to `border-b border-rule` (1px) or use the bottom-of-tile `text-xs font-mono uppercase tracking-[0.18em] text-gold-ink` mono kicker pattern instead.

The TAG side panel's `border-left: 3px` is the marquee component's signature — keep it, add a comment in `styles.css` explaining the deliberate override of the Impeccable rule.

### 1.3 `layout-transition` — animating width (**P0** — TAG perf)

| File | Line |
|---|---|
| [src/components/tag/TagSvgGraph.tsx:306](../../src/components/tag/TagSvgGraph.tsx#L306) | `transition: width` |
| [src/components/tag/styles.css:283](../../src/components/tag/styles.css#L283) | `transition: width` |

This is the rule we adopted from taste-skill verbatim ("animate transform + opacity only — never width/height/top/left"). On the marquee TAG component it's the most visible motion; on a 60Hz monitor with many nodes this is the layout-thrash hot path.

**Fix:** Convert width animations to `transform: scaleX(n)` with `transform-origin: left` (or right depending on side). Acceptable cost — the visual is identical to viewers; the perf delta on low-end devices is significant.

### 1.4 `bounce-easing` (P2)

| File | Line |
|---|---|
| [src/pages/QuickTour.tsx:47](../../src/pages/QuickTour.tsx#L47) | `animate-bounce` on tour avatar |
| [src/components/interview/TranscriptBox.tsx:85-87](../../src/components/interview/TranscriptBox.tsx#L85) | three `animate-bounce` dots (typing indicator) |

**Fix:** TranscriptBox dots → swap to a 1.5s opacity pulse with staggered delays (more typewriter-like, matches finance-trust restraint). QuickTour avatar — kill the bounce; the screen already explains itself.

### 1.5 `ai-color-palette` — purple (P1)

[src/components/analytics/CandidateDrawer.tsx:630](../../src/components/analytics/CandidateDrawer.tsx#L630) has `text-purple-600` on a heading. We have no purple in the FunnelHQ palette — this is a leak.

**Fix:** Swap to `text-gold-ink` or `text-ink` per context.

### 1.6 `overused-font` — Geist (dismissed)

Three hits flag Geist as an "overused font." We deliberately picked Geist as our single family (F1) and won't change. **Action:** Add a section to DESIGN.md documenting the Geist override, and consider adding the lines to an Impeccable ignore-list if it supports one.

---

## Section 2 — Manual taste-skill sweeps

### 2.1 `h-screen` instead of `min-h-[100dvh]` (P1)

20 leaks. Most are `min-h-screen` (still wrong on iOS Safari). Two are raw `h-screen`:

- [src/pages/TestAssets.tsx:332](../../src/pages/TestAssets.tsx#L332) — dev page, dismiss
- [src/pages/HowItWorks.tsx:865](../../src/pages/HowItWorks.tsx#L865) — `min-h-screen`
- [src/pages/DynamicBlueprintPage.tsx:210](../../src/pages/DynamicBlueprintPage.tsx#L210) — raw `h-screen`
- [src/pages/ListDetail.tsx:318,331](../../src/pages/ListDetail.tsx#L318) — two raw `h-screen`

Plus 14 `min-h-screen` on: ErrorBoundary, MarketingLanding, ProductLanding, CandidateListDetail, CandidatePortal (×3), CandidateAnalytics, StartChooser, ProblemSection, InterviewThankYou, DynamicBlueprintPage, NotFound.

**Fix:** Sweep `min-h-screen` → `min-h-[100dvh]`, `h-screen` → `min-h-[100dvh]` (or flex-1 + parent constraint where the layout requires fixed-height). Single perl one-liner across 18 files; one commit.

Two adjacent issues found while sweeping:
- [src/pages/CandidatePortal.tsx:1187](../../src/pages/CandidatePortal.tsx#L1187) — `bg-paper-2 from-slate-50 to-slate-100` (gradient class without a `bg-gradient-to-*` direction; dead) — **remove** the `from-`/`to-` classes.
- [src/pages/HowItWorks.tsx:865](../../src/pages/HowItWorks.tsx#L865) — `selection:bg-blue-500 selection:text-paper` — swap blue selection to `selection:bg-gold-soft selection:text-ink`.
- [src/components/interview/InterviewThankYou.tsx:100](../../src/components/interview/InterviewThankYou.tsx#L100) — raw hex `bg-[#EEEEEE]` — swap to `bg-paper-2`.

### 2.2 Generic placeholder names (P1)

Three live "John Doe" placeholders in form inputs:
- [src/pages/CreateInterview.tsx:2985](../../src/pages/CreateInterview.tsx#L2985)
- [src/pages/EmailTemplatePreview.tsx:125](../../src/pages/EmailTemplatePreview.tsx#L125)
- [src/pages/Lists/components/CreateListDialog.tsx:496](../../src/pages/Lists/components/CreateListDialog.tsx#L496)

**Fix:** Swap to Indian-finance-realistic per PRODUCT.md: `Priya Sharma`, `Arjun Mehta`, `Rohan Iyer`. Keep variety across the three sites.

### 2.3 Hex literals leaking (P1)

`rg -nP '#[0-9a-fA-F]{6}\b' src` finds these (excluding `index.css` token definitions):

- [src/components/create-interview/BlueprintPreviewRail.tsx:75](../../src/components/create-interview/BlueprintPreviewRail.tsx#L75) — `boxShadow: "inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5"` (claymorphism shadow)
- [src/components/sources/SourceManager.tsx:116](../../src/components/sources/SourceManager.tsx#L116) — same claymorphism shadow
- [src/components/sources/SourceConfigModal.tsx:264,294,316](../../src/components/sources/SourceConfigModal.tsx#L264) — same x3
- [src/components/FlowyConversationBox.tsx:341](../../src/components/FlowyConversationBox.tsx#L341) — `fill="#FDE68A"` SVG fill
- [src/components/analytics/ListCard.tsx:46-52](../../src/components/analytics/ListCard.tsx#L46) — array of 7 chart palette hexes (emerald/amber/violet/pink/cyan/orange/indigo)
- [src/components/interview/ParticleSphere.tsx:319,358](../../src/components/interview/ParticleSphere.tsx#L319) — three.js material colors `#ffffff` and `#000000`

**Fix categories:**
- Claymorphism shadows — replace with `--shadow-1` / `--shadow-2` tokens; the inset hex values are ad-hoc.
- ListCard chart palette — define `--chart-{1..7}` tokens in `index.css` rooted in our gold/ink/orange/status palette, no purple/violet/pink/cyan/indigo.
- ParticleSphere — three.js uses CSS-incompatible color objects; document with a one-line comment that hex is required by the WebGL material.
- FlowyConversationBox SVG fill — swap to `fill="hsl(var(--gold))"`.

### 2.4 `shadow-xl` / `shadow-2xl` leaks (P2)

- [src/pages/Lists/ListsPage.tsx:215](../../src/pages/Lists/ListsPage.tsx#L215) — `shadow-2xl` on analytics drawer
- [src/components/ui/SkillsGraph.tsx:489,518](../../src/components/ui/SkillsGraph.tsx#L489) — `shadow-xl` on tooltips
- [src/components/ui/chart.tsx:180](../../src/components/ui/chart.tsx#L180) — `shadow-xl` on chart tooltip

**Fix:** Cap at `shadow-2` (`--shadow-2` token). Tooltips → `shadow-3` if we want elevation, but `shadow-xl` directly is banned in DESIGN.md.

### 2.5 Em-dashes (P2 — review-only, not a blanket fix)

55 em-dashes across 20 page files. taste-skill bans them in marketing copy; we use them liberally in TAG explanations and in legal/PrivacyPolicy.md (12 hits — appropriate). **Action:** No blanket sweep. Manual review of MarketingLanding, ProductLanding, StartChooser only — replace with commas/periods where copy reads cleaner. Leave product-side prose alone.

### 2.6 No leaks found (clean)

- ✅ No Inter font references
- ✅ No `from-blue/cyan/sky/indigo/purple/pink/violet-` gradient leaks
- ✅ No Unsplash links
- ✅ No filler superlatives (`seamless`, `unleash`, `elevate`, `next-gen`, `revolutionary`, `game-changing`)
- ✅ No `text-3xl/4xl/5xl/6xl` headings combined with `uppercase` (sentence-case sweep held)

---

## Punch list — by severity

### P0 — must fix before pilot deploy (1 item)

1. **TAG width animation** → convert to transform-scaleX. Marquee component perf hot path. ~1 hr. Files: TagSvgGraph.tsx, tag/styles.css.

### P1 — this sprint (8 items)

2. **`bg-black` overlay sweep** in 6 shadcn primitives → `bg-ink`. ~30 min.
3. **`text-black` + `dark:` cleanup** in `hand-writing-text.tsx`. ~10 min.
4. **`side-tab` / `border-accent-on-rounded` review** — 16 hits across 11 files. Replace pattern per type (row vs tile vs marquee). TAG side-panel is the documented exception. ~2 hr triage + edits.
5. **Purple in CandidateDrawer** → `text-gold-ink`. ~5 min.
6. **`min-h-screen` / `h-screen` sweep** → `min-h-[100dvh]`. 18 files. ~30 min (sed + verify).
7. **Three "John Doe" placeholders** → Indian-finance names. ~10 min.
8. **Claymorphism hex shadows** → `--shadow-1/2` tokens. 5 files. ~30 min.
9. **ListCard chart palette** → define `--chart-{1..7}` tokens; remove purple/violet/cyan from chart hexes. ~45 min.

### P2 — backlog (5 items)

10. **`animate-bounce`** in QuickTour avatar + TranscriptBox dots → opacity pulse. ~30 min.
11. **`shadow-xl`/`2xl`** sweep → `shadow-2/3`. 4 hits. ~15 min.
12. **`particle-effect-for-hero.tsx`** — verify dead, delete if so. ~10 min.
13. **Em-dash review** on marketing surfaces (manual). ~30 min.
14. **Document Geist font override** in DESIGN.md so future audits don't re-flag it. ~5 min.

---

## Estimates

- **P0 alone:** ~1 hr
- **P0 + P1:** ~5–6 hr (one focused afternoon)
- **All P0/P1/P2:** ~7–8 hr

Recommend doing P0 + P1 in a single F23 commit batch. P2 can wait for the next polish round.

---

## Methodology notes

- **Impeccable** flagged `overused-font: Geist` 3 times. We deliberately chose Geist over Inter as a finance-trust signal (Razorpay/Zerodha aesthetic). This is a documented override, not a fix.
- **TAG side panel `border-left: 3px solid var(--tag-gold)`** is the marquee component's signature treatment. Adding the rule's anti-pattern flag would degrade the artifact. Documented exception only.
- **Em-dashes in legal pages** (PrivacyPolicy.tsx — 12 hits) are appropriate for legal prose tone. Not flagged for fix.
- The hook at `.claude/hooks/warn-sentence-case.py` already prevents most P1 / P2 regressions on save. Good news for the rate at which new findings will accumulate.

End of audit.
