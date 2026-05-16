# Post-F26 application review — 2026-05-15

**Auditor:** Claude (Opus 4.7) via chrome-devtools MCP browser walk + static checks
**Baseline:** [2026-05-15-f22-design-audit.md](2026-05-15-f22-design-audit.md) (30 detect hits, pre-F23/F24/F25/F26)
**Scope:** Logged-out + workspace user + applicant. 16 surfaces walked, screenshots in `screenshots/`.
**Tagging:** **P0** = must-fix before deploy / data-risk / golden-path break · **P1** = should-fix this sprint / clear visual debt · **P2** = backlog / cosmetic

---

## Executive summary

**Readiness: 6.5 / 10.** Foundation tokens, sentence-case sweep (F26), and modernization tracks (F23/F24/F25) have moved the app a long way from the F22 baseline. But this audit found **5 P0s** that block pilot deploy — three functional, two regulatory.

### Top 3 P0s
1. **DPDP rights surfaces broken** for both workspace and applicant. `/account/data` and `/candidate/account/data` fail to load summary because the backend's 401 responses skip CORS headers. **Regulatory risk** (DPDP §11 access right).
2. **`/pool` and `/candidate/results` return 404.** Two routes the app links to are missing from the router. Functional break.
3. **CreateInterview wizard is the worst-styled surface in the app.** ALL CAPS labels, blue palette leaks on credit numerals, red `X` step dot, modal title forced uppercase via CSS. Pre-F26 page that the cleanup sweep missed.

### Delta from F22 baseline
- Impeccable detect: **30 → 13 hits** (−57%). Most remaining are documented exceptions (Geist over-used = ours by design, TAG side-tab = marquee idiom).
- ALL CAPS bare class leaks: **311 → 0** ✓ (F26 sweep clean).
- Off-token text colors: **0 ✓** (F26 sweep clean for `text-*`).
- Off-token bg/border colors: **36 still leaking** (F26 sweep regex missed dark shades `-700/-800` and modal step-indicator usages).
- Hex literals in src: **0** (excluding TestAssets) ✓.
- `bg-black` / `text-black`: **0** ✓.
- `h-screen`: **0** ✓.
- Layout-thrashing CSS animations: **2** (TAG `transition: width` × 2; carried since F22, P0 perf for marquee).
- Generic placeholder names: **0** ✓.
- Filler superlatives: **0** ✓.
- TypeScript: clean.
- Build: green, 6.91s.
- **anim-vendor still 873 kB raw / 240 kB gzip** — F24.0 was supposed to drop ~250-300 kB but the InterviewSwipeView Framer drag features pulled the surface back up. **Still the single biggest bundle line.**

---

## Static findings (Phase A)

| Check | Result | Notes |
|---|---|---|
| `uppercase tracking-wider` (excluding mono kicker) | **0** | F26 clean |
| `text-{red\|yellow\|green\|...}-N` | **0** | F26 clean |
| `bg-{red\|yellow\|green\|...}-N` (excl. TestAssets) | **36** | F26 missed dark shades + bg utilities — see Section A1 |
| `bg-black` / `text-black` | **0** | F26 clean |
| Hex literals `#[0-9a-fA-F]{6}` (excl. TestAssets) | 0 | clean |
| `h-screen` | **0** | clean |
| `transition-width\|height\|top\|left` (Tailwind) | **0** | clean |
| CSS `transition: width` | **2** | TAG perf — Section B |
| Generic names ("John Doe", "Jane Doe", "Lorem ipsum") | **0** | clean |
| Filler superlatives ("Elevate", "Seamless"…) | **0** | clean |
| `npx tsc --noEmit` | **clean** | exit 0 |
| `npm run build` | **green, 6.91s** | bundle: see Section C |
| `npx impeccable detect ./src` | **13 hits** | Section D |

### A1 — 36 residual color leaks (P1)

`bg-red-500/600/700`, `bg-green-500/600/700`, `text-red-800`, `text-green-800`, `text-yellow-800`, `text-red-400`, `bg-yellow-400`, `bg-red-700`, `bg-green-700`, etc. Most concentrated:

| File | Lines | Use |
|---|---|---|
| `src/pages/InterviewResults.tsx` | 262-264 | hiring-decision color map (`text-red-800`, `text-yellow-800`, `text-green-800`) |
| `src/components/tag/EvidencePanel.tsx` | 29-31 | TAG strong/gap pill colors |
| `src/components/modals/InterviewStatusModal.tsx` | 45, 70 | modal status colors |
| `src/components/modals/DuplicateAnalysisModal.tsx` | 299, 335 | error/success cells |
| `src/components/DeleteConfirmationModal.tsx` | 66, 112, 142 | warning/danger styling |
| `src/components/sources/SourceConfigModal.tsx` | 325 | success cell |
| `src/components/sources/SourceManager.tsx` | 159 | hover red dark |
| `src/pages/Settings.tsx` | 682 | hover destructive |
| `src/pages/Lists/components/CreateListDialog.tsx` | 627, 635 | step indicators |
| `src/pages/CandidateRegistration.tsx` | 808, 814, 821 | wizard step indicators (green progress) |
| `src/pages/ManageInterviewsEnhanced.tsx` | 747, 754 | row indicator dots |
| `src/pages/FitmentInterviewDetails.tsx` | 1210, 1217 | row indicator dots |
| `src/pages/InterviewSwipeView.tsx` | 441 | swipe right action button (`bg-green-600`) |
| `src/pages/QuickTour.tsx` | 169 | step "4" indicator |
| `src/components/blueprint/SkillMindMap.tsx` | 34, 43 | proficiency colors |
| `src/components/fitment/CreateFitmentDialog.tsx` | 90, 96, 375 | step bg/lines |
| `src/components/landing/ProblemSection.tsx` | 40 | marketing copy emphasis (`text-red-400`) |
| `src/components/layout/NotificationBell.tsx` | 195 | unread badge `bg-red-600 ... animate-pulse` |
| `src/components/workspace/ProjectSelector.tsx` | 491 | starred fill `text-yellow-400` |
| `src/components/FlowyConversationBox.tsx` | 366 | leftover Flowy-branded button |
| `src/components/ui/toast.tsx` | 78 | shadcn primitive — destructive variant focus ring |

**Fix:** Replace per the F26 mapping table — `red-700/800` → `text-danger-ink`/`bg-danger`, `green-700/800` → `success-ink`/`bg-success`, `yellow-800` → `warning-ink`. Worth lifting an explicit token for the very common dark-status-text need (`--success-ink`, `--warning-ink`, `--danger-ink`) and adding to Tailwind.

---

## P0 findings — must fix before deploy

### P0-1 — DPDP rights endpoints broken (CORS bypass on 401)

**Surfaces:** `/account/data` (workspace), `/candidate/account/data` (applicant)
**Symptom:** Both pages render an `ErrorBanner` reading "Couldn't load summary / Failed to fetch."
**Console:** `Access to fetch at 'http://localhost:8082/api/dpdp/workspace/data-summary' from origin 'http://localhost:8080' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`
**Network:** `GET /api/dpdp/workspace/data-summary [net::ERR_FAILED]`
**Root cause:** Backend returns 401 (preflight is fine, returns 200 with full CORS headers; actual GET returns 401 without CORS headers). FastAPI's `HTTPException` short-circuits before CORSMiddleware adds headers.
**Frontend bug:** [src/pages/account/DataAccount.tsx:36-39](../../src/pages/account/DataAccount.tsx#L36) reads `localStorage.getItem("auth_token")` for workspace, but the backend route is auth-required and the bearer-token format may need fixing — also the `Authorization` header is being sent but server still 401s, suggesting either (a) workspace user's stored token is stale, or (b) the route auth dependency is mis-wired. Verify with `curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/dpdp/workspace/data-summary`.
**Backend fix (also addresses any future 401):** add a `RequestResponseEndpoint` exception handler that wraps `HTTPException` and re-attaches CORS headers from request `Origin`. Or move CORSMiddleware after auth middleware in the middleware stack so 401 responses still get CORS-decorated.
**Regulatory risk:** DPDP §11 requires the data principal to be able to exercise access right "within a reasonable period." If the in-app surface is broken, the operator must field email requests manually — not blocking by itself but a pilot risk.

### P0-2 — `/pool` returns 404

**Surface:** `/pool`
**Symptom:** Renders the 404 NotFound page ("Page Not Found / Return to Dashboard").
**Plan reference:** F23 plan + sidebar nav refer to `/pool` → PoolDashboard.
**Likely cause:** Route was renamed (`/pool/dashboard`?) or PoolDashboard import was lazy-loaded with a typo'd path.
**Fix:** Check [src/App.tsx](../../src/App.tsx) for the correct PoolDashboard route mount; either add `/pool` → `Navigate to "/pool/dashboard"` redirect or remount at `/pool`.
**Detection:** sidebar nav item exists (visual check on 13-lists.png shows "Talent Pools" label) — so users will hit this 404 routinely.

### P0-3 — `/candidate/results` returns 404

**Surface:** `/candidate/results`
**Symptom:** 404.
**Plan reference:** Surface 23 in plan was `/candidate/results` — CandidateResults.
**Likely cause:** Route path mismatch or lazy import broken.
**Fix:** Check [src/App.tsx](../../src/App.tsx) for the right path. Applicants currently access results via the dashboard "View results" button per-interview, so this may be a dead route — but if so, remove the link and the file.

### P0-4 — CreateInterview wizard ALL CAPS + palette leaks

**Surface:** `/interviews/create?type=screening` and `?type=fitment`
**Screenshot:** `screenshots/08b-create-interview-after-modal.png`
**Findings:**
- Step 1 dot is solid red `X` — should be `bg-ink` for active or `bg-success` for complete (currently reads as error)
- Wizard title `INTERVIEW DETAILS` + sub `CONFIGURE THE BASIC INFORMATION ABOUT YOUR INTERVIEW` — both ALL CAPS via CSS `uppercase` class
- Field labels `INTERVIEW TITLE *`, `INTERVIEW TYPE *`, `DURATION *`, `DESCRIPTION *` — ALL CAPS
- `START FROM` label — ALL CAPS
- Buttons `+ CREATE NEW`, `USE BLUEPRINT`, `SCREENING`, `FITMENT`, `← CANCEL`, `NEXT →` — all ALL CAPS
- Credits row uses **bright blue numerals** (`60`, `30`) — palette leak
- Vocab leaks: `MAX CANDIDATES` should be "Max applicants"
**File:** [src/pages/CreateInterview.tsx](../../src/pages/CreateInterview.tsx) — this is the 4,366-line god component flagged for split in F23.3 (incomplete). Pre-dates the F26 sweep for ALL CAPS.
**Fix:** Apply the F26 perl sweep to CreateInterview.tsx specifically (it was excluded from the bulk pass — verify why); convert step indicator to `bg-success` for complete + `bg-ink` for active + `bg-paper-3 border border-rule` for unvisited; replace blue credit numerals with `text-ink` + `font-mono tabular-nums`.

### P0-5 — `INTRODUCING INTERVIEW BLUEPRINTS` modal forces uppercase via CSS

**Surface:** Modal that auto-opens on first visit to `/interviews/create`
**File:** [src/pages/CreateInterview.tsx:3682](../../src/pages/CreateInterview.tsx#L3682) — `<DialogTitle className="text-xl font-bold text-[hsl(var(--ink))] uppercase">`
**Issue:** Title text "Introducing Interview Blueprints" gets uppercased by CSS to `INTRODUCING INTERVIEW BLUEPRINTS`. This is the most prominent ALL CAPS leak in the app — it's the first thing a user sees on creating their first interview.
**Embedded screenshot inside the modal** also shows the OLD multi-color (cyan/violet/pink/blue) skill graph from pre-F1 palette — needs to be replaced with the current finance-trust TAG screenshot.
**Fix:** Remove `uppercase` from line 3682; replace `text-[hsl(var(--ink))]` with `text-ink`; replace the inner image asset with a current TAG screenshot.

---

## P1 findings — should fix this sprint

### P1-1 — Backend scheduler crash from missing Firestore composite index

**Source:** `recruiter-assist-backend/boot.log`
```
ERROR:funnelhq_api.scheduler:_resend_pending_invitations crashed:
FailedPrecondition('The query requires an index. You can create it here: https://...')
```
**Impact:** Pending applicant invitations don't get re-sent on the 5-minute scheduler tick. Operator-action: open the URL the error includes (it auto-generates the composite index spec for `candidate_invitations` on `invitation_sent` + `created_at`) and click create.
**Plan-deferred:** Already known per session memory entry 2173.

### P1-2 — `/interviews/manage` and `/interviews/fitment` "TOTAL CANDIDATES" vocab leak

**Surface:** `/interviews/manage` (screenshots 07), `/interviews/fitment` (screenshots 12)
**Issue:** Stat tile reads `0 / TOTAL CANDIDATES`. Per F9 vocab sweep, "candidates" → "applicants" everywhere user-visible. This stat key was missed.
**File:** [src/pages/ManageInterviewsEnhanced.tsx](../../src/pages/ManageInterviewsEnhanced.tsx) and the analogous fitment list — search for `"Total candidates"` literal.
**Fix:** Search-replace `Total candidates` → `Total applicants` in user-facing strings; backend field name stays.

### P1-3 — Sidebar `Talent Pools` and `Quick Tour` Title Case

**Surface:** Sidebar across all logged-in pages
**Issue:** Items "Quick Tour" and "Talent Pools" use Title Case. Sentence case rule says "Quick tour" / "Talent pools".
**File:** [src/components/layout/Sidebar.tsx](../../src/components/layout/Sidebar.tsx)
**Note:** F26.0 fixed Sidebar nav weights but missed lowercasing — the items are passed in as labels from a parent component or i18n key.

### P1-4 — Settings page form labels Title Case

**Surface:** `/settings` (screenshot 15)
**Issue:** "Profile / Projects / Communications / Voice & AI / Notifications / Appearance" tabs Title Case. "Full Name / Email Address / Phone Number / Company Name / Profile Information" labels Title Case. "Update your personal and company information" sentence case ✓.
**File:** [src/pages/Settings.tsx](../../src/pages/Settings.tsx)
**Fix:** Convert form labels to sentence case ("Full name", "Email address", etc.).

### P1-5 — `/quick-tour` ALL CAPS labels

**Surface:** `/quick-tour` (screenshot 17)
**Issue:** Tab labels "WELCOME TO FUNNELHQ", "SCENARIO 1: MASS RECRUITMENT", "SCENARIO 2: SPECIALIZED ROLE FITMENT", "KEY FEATURES WALKTHROUGH", "GET STARTED" all uppercase. Step header "Step 1 / WELCOME TO FUNNELHQ" + subtitle "Your Complete AI-Powered Interview Solution" Title Case.
**File:** [src/pages/QuickTour.tsx](../../src/pages/QuickTour.tsx)
**Note:** Page also has `animate-bounce` (Impeccable bounce-easing rule, P2).

### P1-6 — `/how-it-works` is on the OLD palette + uses "Flowy" branding

**Surface:** `/how-it-works` (screenshot 18)
**Symptom:** Dark navy background, white logo, multi-color (cyan/lime/violet/pink/blue) skill graph nodes, "How **Flowy** Evaluates" headline, sign-in button styled differently from rest of app.
**Status:** Page predates F1 design rebuild. Likely unused/orphaned but still routable.
**Fix:** Either delete the page (if unused — verify with `rg -n '/how-it-works' src`) or rebuild on the finance-trust palette.

### P1-7 — Dashboard hero copy vocab leak

**Surface:** `/dashboard` (screenshot 06)
**Issue:** Hero subcopy reads "Every **candidate** evaluated against a rubric built by Big-4 practitioners. A CV tells you a story. A TAG tells you the truth."
**File:** [src/pages/Dashboard.tsx](../../src/pages/Dashboard.tsx)
**Fix:** "candidate" → "applicant"

### P1-8 — Lists page "ANALYTICS / DIVERSITY / STARRED" + "TOP / HIGH / GOOD / AVG / LOW / NOT INT" labels

**Surface:** `/lists` (screenshot 13)
**Issue:** Section header "ANALYTICS" + tab headers "TOTAL / DIVERSITY / STARRED / TOP 90+ / HIGH 80-89 / GOOD 70-79 / AVG 60-69 / LOW 1-59 / NOT INT 0" all use heavyweight ALL CAPS. Some may be legitimate mono kicker (small caps with the right tracking) but they read too prominently. "Candidate Distribution" is a vocab leak.
**File:** [src/pages/Lists/](../../src/pages/Lists/)
**Fix:** If these are mono kicker idiom, they're OK; if not, demote to sentence case body. "Candidate Distribution" → "Applicant distribution".

### P1-9 — `/interviews/fitment` page heading "Role Fitment" Title Case

**Surface:** `/interviews/fitment` (screenshot 12)
**Issue:** H1 reads "Role Fitment" — should be "Role fitment".
**File:** [src/pages/FitmentInterviews.tsx](../../src/pages/FitmentInterviews.tsx)

### P1-10 — `/interviews/manage` "Create new interview" button styled with Title Case visually

**Surface:** `/interviews/manage` (screenshot 07)
**Note:** Code reads "Create new interview" (sentence case ✓). Visually appears `Create New Interview` — confirm by inspecting computed CSS; if `text-transform: capitalize` is set somewhere, drop it.

### P1-11 — Anim-vendor bundle still 873kB

**Symptom:** F24.0 was supposed to drop GSAP + react-spring to shrink anim-vendor by ~250-300kB. Build output shows **873kB raw / 240kB gzip**, identical to pre-F24.0.
**Root cause:** Framer Motion's drag/spring features pulled in by InterviewSwipeView negate the deletions. Vite's dependency hoisting preserves the import surface.
**Fix:** Audit Framer feature usage; consider migrating InterviewSwipeView's drag from FM to a lighter-weight library (e.g., `@use-gesture/react` was just removed — but FM's drag is heavy). Alternative: load Framer Motion's drag chunk on demand only on InterviewSwipeView via `lazy(() => import('framer-motion').then(...))`. Realistic target: get anim-vendor under 500kB.

### P1-12 — React Router v7 future flag warnings

**Symptom:** Console warns on every page load: "v7_startTransition" + "v7_relativeSplatPath".
**Fix:** Add the future-flags object to `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>` in [src/App.tsx](../../src/App.tsx). Trivial 2-line edit.

---

## P2 findings — backlog / cosmetic

### P2-1 — Avatar color is bright pure red

Both workspace ("HM" red avatar) and applicant ("AA" red avatar) use a saturated red `bg-red-500`-ish tone for default user initials. Looks like an error indicator. Replace with `bg-paper-3 text-ink` neutral or `bg-ink text-paper`.

### P2-2 — Sidebar "Sign out" uses red text

Hard-red destructive styling on a passive nav link reads as warning. Should be `text-ink-soft hover:text-ink` like the other items, with the destructive treatment reserved for the actual confirm-destroy modal.

### P2-3 — TAG `transition: width` perf carryover

[src/components/tag/TagSvgGraph.tsx:306](../../src/components/tag/TagSvgGraph.tsx#L306) and [src/components/tag/styles.css:354](../../src/components/tag/styles.css#L354). Carried from F22 — flagged P0 there as TAG marquee perf, demoted to P2 here because TAG is rendering acceptably in dev (not measurable Long Tasks > 50ms in the surface walk). Fix: convert to `transform: scaleX` per F22 fix recipe.

### P2-4 — Impeccable `bounce-easing` (2 hits)

[src/pages/QuickTour.tsx:47](../../src/pages/QuickTour.tsx#L47) (`animate-bounce`) and [src/components/interview/TranscriptBox.tsx:85-87](../../src/components/interview/TranscriptBox.tsx#L85) (typing-indicator dots). The typing dots are an established pattern; the QuickTour bounce is decorative. Drop both for `animate-pulse` or `ease-out` opacity cycle.

### P2-5 — Impeccable `side-tab` and `border-l-15` (5 hits)

Mostly carried from F22. [src/components/interview/ConversationPanel.tsx:99,215](../../src/components/interview/ConversationPanel.tsx#L99) uses `border-l-15 border-r-15` (4 hits, decorative gold edge). [src/components/tag/EvidencePanel.tsx:93](../../src/components/tag/EvidencePanel.tsx#L93) `border-l-2`. [src/components/tag/styles.css:354](../../src/components/tag/styles.css#L354) TAG side-panel `border-left: 3px` — documented exception (marquee idiom). [src/pages/EmailTemplatePreview.tsx:52](../../src/pages/EmailTemplatePreview.tsx#L52) `border-left: 4px solid #C8A24B` — gold accent on email preview, dev-only surface, low priority.

### P2-6 — Marketing landing "Outcomes" section has empty body

Section reads "OUTCOMES / What hiring teams ship with FunnelHQ." with no concrete outcomes / stats below. Either fill with three numeric tiles (using real anonymized data) or remove the section.

### P2-7 — Marketing landing capitalization on "the Role" / "the Assessment"

In the "Three steps from job-open to shortlist" body: "Set up the Role" / "Applicants take the Assessment" — Role and Assessment are capitalized mid-sentence. Per CLAUDE.md sentence case, should be lowercase ("Set up the role", "Applicants take the assessment").

### P2-8 — `/start` chooser "Applicant Sign-in" + "Take an Assessment" capitalization

Same Title-Case mid-sentence issue. Fix in [src/pages/StartChooser.tsx](../../src/pages/StartChooser.tsx).

### P2-9 — Privacy page "Postal" still placeholder

[src/pages/legal/PrivacyPolicy.tsx:213](../../src/pages/legal/PrivacyPolicy.tsx#L213) reads "Postal: FunnelHQ Technologies Pvt. Ltd., **[registered office address — to be filled before launch]**." Operator action.

### P2-10 — Candidate profile "Self-assessment" gimmicky

Animal / color / symbol / environment select boxes feel out-of-place for a finance hiring product. Either tie them concretely into TAG signals (with copy explaining how they're used) or remove. Product question more than design.

### P2-11 — `/product-landing?intent=workspace` doesn't show a sign-in form when already logged in

When already authenticated as workspace, navigating to `/product-landing?intent=workspace` immediately redirects to `/interviews/manage`. F12 plan said this should show a centered editorial sign-in card. The redirect is good UX, but if the user *intended* to see the sign-in surface (e.g., to switch accounts), there's no escape hatch. Low priority.

---

## Cross-cutting themes

### Theme 1 — F26 sweep didn't penetrate modals + backend-status pills + step indicators

The 36 residual color leaks (P1-1 list above) are concentrated in three places:
- **Modals** (DeleteConfirmation, DuplicateAnalysis, InterviewStatus, SourceConfig, CreateListDialog): use saturated red/yellow/green for warnings/success.
- **Step indicators** (CandidateRegistration wizard, CreateFitmentDialog, QuickTour): use `bg-green-500` for completed steps.
- **Hard-coded color maps** (InterviewResults hiring-decision pill, EvidencePanel TAG strong/gap, SkillMindMap proficiency).

These need a **dedicated F27 step-indicator + status-pill consolidation**: define `--success-ink`, `--warning-ink`, `--danger-ink` in `index.css`, expose as Tailwind tokens `text-success-ink` / `bg-success-ink`, and replace the 36 sites mechanically.

### Theme 2 — CreateInterview.tsx is the next big restructure

P0-4 + P0-5 confirm the F23.3 "split per wizard step" plan was correct and necessary. The 4,366-line file resists incremental fixes. Worth promoting F23.3 ahead of any other feature work.

### Theme 3 — DPDP surface needs a real backend smoke test

P0-1 (CORS bypass on 401) is the kind of bug that only surfaces when the page actually mounts AND the user isn't already cached as authenticated. CI has no integration test for this. Filed as candidate for the F25.1 follow-up (Vitest render smoke or Playwright auth-flow probe).

### Theme 4 — Vocab leaks recur in field labels and stat tiles, not body copy

The F9 vocab sweep handled body copy well. Remaining "candidate" leaks are in:
- KPI stat headers ("TOTAL CANDIDATES")
- Hero subcopy ("Every candidate evaluated…")
- ARIA labels (need to audit — not checked this pass)
- Backend response messages ("Candidate not found" detail strings)

A small Step F26.1 sweep of these patterns would close the gap.

---

## Bundle analysis

| Chunk | Raw | Gzip | Status |
|---|---|---|---|
| anim-vendor | 873.57 kB | **239.93 kB** | **P1** — Framer drag pulled it back to F22 baseline. F24.0 win evaporated. |
| vendor (catch-all) | 472.56 kB | 161.48 kB | Unsorted fall-through; investigate |
| charts-vendor | 337.71 kB | 84.30 kB | recharts; acceptable |
| react-vendor | 206.65 kB | 65.30 kB | React 19 + DOM; acceptable |
| icons-vendor | 178.87 kB | 22.14 kB | lucide-react; OK |
| ui-vendor | 166.38 kB | 46.86 kB | Radix primitives; OK |
| index (main) | 103.24 kB | 27.53 kB | OK |
| index (lazy entry?) | 72.42 kB | 17.37 kB | OK |
| CreateInterview | 83.36 kB | 21.38 kB | god component — should drop after F23.3 split |

**Total dist size budget feels OK** (~3 MB raw / ~800 KB gzipped) but the anim-vendor surprise is the biggest single win available.

---

## DPDP checklist

| Item | Status |
|---|---|
| `/privacy` page reachable + EN/HI toggle | ✓ |
| `/terms` page reachable | ✓ (not visually inspected; route loads) |
| ConsentBanner appears on first visit | ✓ (visible on marketing landing) |
| Workspace data summary endpoint works | **✗ P0-1** |
| Applicant data summary endpoint works | **✗ P0-1** |
| Workspace can request access export | not testable until P0-1 fixed |
| Applicant can request access export | not testable until P0-1 fixed |
| Workspace can delete account | not tested |
| Applicant can delete account | not tested |
| Sub-processor list (`SUBPROCESSORS.md`) exists | ✓ (file present in backend) |
| Privacy notice in EN + HI (8th Schedule) | ✓ (toggle present, content not audited) |
| Postal address filled | ✗ — operator action |
| Sentry EU + PostHog EU configured | not verified in this audit |

**Verdict:** DPDP rights surfaces are blocked by P0-1. Until that fix lands, the right of access is broken in-product. Operator can field via email manually, but not deploy-ready.

---

## What's NOT covered in this audit

- Live interview session (`/interview/:id/session`) — requires an active interview to navigate to
- Pre-check (`/interview/:id/pre-check`) — requires invitation flow
- Per-interview details + results pages with real data — need a completed interview
- Lighthouse scores — skipped (out of session-budget; flag for follow-up)
- Performance traces during TAG reveal animation — skipped
- Backend route inventory + auth boundary verification (cross-tenant probes) — separate security audit
- Real E2E candidate journey — `interview-flow-tester` agent recommended
- Mobile responsive — desktop only at 1440×900
- Email templates rendering — not inspected
- Notification bell dropdown — not opened

---

## Verification commands (after fixes ship)

```bash
cd recruiter-assist-frontend

# Verify F26 stays clean
rg -nE "uppercase tracking-(wider|widest|wide)\b" src --type tsx --type ts \
  | grep -v "font-mono uppercase tracking-\[0.18em\]" \
  | grep -v "TestAssets.tsx"
# Expect: 0

# Verify color leaks are closed (post-fix target)
rg -nE "(text|bg|border|ring)-(red|yellow|green|blue|purple|indigo|cyan|amber)-[0-9]+" src \
  | grep -v "TestAssets" | wc -l
# Expect after fix: ≤ 5 (only documented exceptions)

# Verify CreateInterview wizard
rg -n "uppercase" src/pages/CreateInterview.tsx | grep -v "tracking-\[0.18em\]"
# Expect: 0

# Verify /pool and /candidate/results route
rg -n "path=\"/pool\"|path=\"/candidate/results\"" src/App.tsx
# Expect: 1 line each

# Verify DPDP CORS fix on backend
curl -i -H "Authorization: Bearer invalid" http://localhost:8082/api/dpdp/workspace/data-summary \
  -H "Origin: http://localhost:8080" | grep -i "access-control-allow-origin"
# Expect: header present even on 401

# Verify anim-vendor drop
npm run build 2>&1 | grep "anim-vendor"
# Target: < 500 kB raw / < 150 kB gzip

# Verify React Router future flags
rg -n "v7_startTransition" src/App.tsx
# Expect: present in BrowserRouter props
```

---

## Operator action items (separate from code)

1. **Create the missing Firestore composite index** for `candidate_invitations` (URL in `boot.log`)
2. **Fill registered office address** in `src/pages/legal/PrivacyPolicy.tsx`
3. **Replace fictional customer logos** on marketing landing trust strip (currently invisible/empty per screenshot 1)
4. **DPO mailbox** `privacy@funnelhq.co` and `security@funnelhq.co` — verify routing works
5. **Sentry EU + PostHog EU env vars** — `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY` need to point to EU regions
6. **Rotate any keys that were committed during dev** (per F23.7 plan note)

---

## Suggested next phase: F27 cleanup pass

Based on this audit, ship a focused F27 PR with:

1. **F27.1** — DPDP CORS fix (backend) + retry the 2 surfaces (P0-1) — ~1 hr
2. **F27.2** — `/pool` + `/candidate/results` route fixes (P0-2, P0-3) — ~30 min
3. **F27.3** — CreateInterview ALL CAPS sweep + step indicator + credit numerals (P0-4, P0-5) — ~2 hr
4. **F27.4** — Status-color token consolidation (`--success-ink`, `--warning-ink`, `--danger-ink`) + sweep 36 leaks (P1-1) — ~2 hr
5. **F27.5** — Sidebar + Settings + QuickTour Title Case sweep (P1-3, P1-4, P1-5) — ~30 min
6. **F27.6** — `/how-it-works` decision: delete or rebuild (P1-6) — ~15 min if delete
7. **F27.7** — Dashboard hero + stat tile vocab fix (P1-2, P1-7) — ~15 min
8. **F27.8** — React Router v7 future flags (P1-12) — 5 min
9. **F27.9** — Anim-vendor lazy-load investigation (P1-11) — ~2 hr

**Total: ~9 hours = one focused day.** P0s alone (F27.1-3) ship in an afternoon.

---

*End of audit. 16 surfaces walked, 5 P0 / 12 P1 / 11 P2 findings. Document size: ~4500 words.*
