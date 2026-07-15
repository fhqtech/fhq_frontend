# unified_ia rollout + revert runbook

Operator runbook for the unified role model + front door cutover (Spec 1,
`docs/superpowers/specs/2026-07-15-unified-role-model-front-door-design.md`).
The whole change sits behind one kill-switch flag on each side of the stack,
so shipping and reverting are both single-flag operations.

## Flags

| Side | Flag | Type | Default | Where |
|---|---|---|---|---|
| Frontend | `unified_ia` | feature flag (`FlagKey`) | **on** — seeded via `REDESIGN_BASELINE` | `src/lib/flags/FlagProvider.tsx` |
| Backend | `UNIFIED_IA` | Cloud Run env var | **off / unset** | read in `funnelhq_api/dependencies/unified_ia.py` |

Notes:

- The frontend flag resolves with precedence `override > remote > baseline`
  (`src/lib/flags/resolve.ts`). `REDESIGN_BASELINE` in `FlagProvider.tsx` seeds
  `unified_ia: true` as the lowest-precedence source, so every workspace gets
  the unified nav/redirects out of the box unless a per-workspace remote flag
  or a dev's localStorage override turns it off. The flag registry itself
  stays default-off (`resolve.ts` invariant) — the baseline only applies
  inside the provider.
- The backend flag is read by `block_standalone_when_unified()`, a FastAPI
  dependency attached only to the standalone create/invite handlers listed
  below. With `UNIFIED_IA` unset it is a pure no-op — nothing changes on the
  backend until an operator explicitly sets it. When set (`1` / `true` /
  `True`), guarded handlers respond `410 {"error": "standalone_retired",
  "use": "role stages"}`.
- The two flags are independent kill-switches. The frontend flag alone
  controls what recruiters see and where legacy paths redirect; the backend
  flag alone controls whether the retired standalone create/invite endpoints
  still accept requests. Cutover turns both on (frontend first); revert turns
  either or both off.

## Redirect contract

With `unified_ia` on, the following legacy paths redirect to their unified
target via `UnifiedRedirect` (wrapped around each legacy route in
`src/App.tsx`). With `unified_ia` off, the legacy page renders instead (the
kill-switch). Source of truth: `UNIFIED_REDIRECTS` in
`src/test/unified-ia-redirects.test.tsx`.

| Legacy path | Redirects to |
|---|---|
| `/dashboard` | `/home` |
| `/interviews/create` | `/roles/new` |
| `/interviews/manage` | `/roles` |
| `/interviews/fitment` | `/roles` |
| `/interviews/skill-analysis` | `/roles` |
| `/practicals` | `/roles` |
| `/skill-matcher` | `/talent` |
| `/programs` | `/roles` |
| `/journeys/new` | `/roles/new` |

**Not redirected (by design):** result and detail deep-links stay live
regardless of `unified_ia`, because URL stability is a hard constraint (see
the frontend `CLAUDE.md` "Backend symbols are stable" section):

- `/interview/:interviewId/results/:sessionId`
- `/interviews/:id`
- `/interview-blueprint/:interviewId`

## Cutover sequence

1. **Ship frontend with `unified_ia` on.** It already is (default-on via
   `REDESIGN_BASELINE`), so this is the current state of the branch once
   merged and deployed. Backend `UNIFIED_IA` stays unset — the standalone
   create/invite endpoints keep working as a safety net while the frontend
   change soaks.
2. **Verify green for N days.** Confirm on the live deploy:
   - Nav shows exactly 5 items: Home, Roles, Talent, Shortlists, Settings.
   - Every legacy path in the redirect contract above lands on its unified
     target.
   - Result deep-links (`/interview/:id/results/:sessionId`, etc.) still
     load.
   - "Open a role" is the only create flow reachable from the UI.
   - See the manual click-through checklist below for the full pass.
3. **Set backend `UNIFIED_IA=1`** on the 3 Cloud Run services
   (`flowdot-backend`, `flowdot-reviewer`, `flowdot-blueprint`) and roll.
   This retires the standalone create/invite front-doors server-side (410),
   closing the gap for any client bypassing the frontend redirect (old tab,
   direct API call, etc.). The journeys stage-adapters call the underlying
   services directly, not these HTTP routers, so this does not affect stage
   execution.
4. **After stable, open the deletion follow-up PR** — see the checklist
   below.

## Revert procedure

Because the whole change is gated behind one kill-switch flag per side,
reverting restores the legacy nav and surfaces exactly — no data migration,
no partial state.

**Frontend:**

- For a single dev/browser: set `localStorage` key `flag_overrides` to
  include `{"unified_ia": false}` (this is the override source, highest
  precedence — see `src/lib/flags/FlagProvider.tsx` / `resolve.ts`).
- For a workspace: flip the flag off via `PUT /api/flags` (the remote
  source, `src/services/flagsApi.ts`), which overrides the `REDESIGN_BASELINE`
  default for that workspace.

**Backend:**

- Unset `UNIFIED_IA` on the 3 Cloud Run services and roll. This immediately
  makes `block_standalone_when_unified()` a no-op again, re-enabling the
  standalone create/invite endpoints.

Reverting either side independently is safe: turning off the frontend flag
alone restores the legacy nav/redirects even if the backend guard is still
on (recruiters just can't reach the guarded standalone endpoints through the
retired UI, which was already the case). Turning off the backend flag alone
re-enables the standalone endpoints without changing what the frontend
shows.

## Manual pre-cutover click-through checklist

(Deferred from Task 7 — run this on a preview deploy before flipping the
backend flag in step 3 above.)

With `unified_ia` on:

- [ ] Nav shows exactly: Home, Roles, Talent, Shortlists, Settings.
- [ ] `/dashboard` redirects to `/home`.
- [ ] `/interviews/create` redirects to `/roles/new`.
- [ ] `/interviews/manage` redirects to `/roles`.
- [ ] `/interviews/fitment` redirects to `/roles`.
- [ ] `/interviews/skill-analysis` redirects to `/roles`.
- [ ] `/practicals` redirects to `/roles`.
- [ ] `/skill-matcher` redirects to `/talent`.
- [ ] `/programs` redirects to `/roles`.
- [ ] `/journeys/new` redirects to `/roles/new`.
- [ ] A result deep-link, e.g. `/interview/<id>/results/<sid>`, still loads
      (not redirected).
- [ ] "Open a role" is the only create entry point visible in the UI.

Then flip `unified_ia` off (localStorage override or workspace flag) and
confirm:

- [ ] The legacy nav (Dashboard, Interviews group, standalone Practicals,
      standalone Skill-matcher, Programs) returns.
- [ ] Each legacy page renders its own content again instead of redirecting.

## Follow-up deletion checklist (after N days green)

Once the backend flag has been on and stable for N days, open a follow-up PR
to physically remove the now-unreachable legacy code. Nothing here should be
deleted before that — this task only hides + redirects.

**Frontend — legacy components/routes to remove:**

- `src/pages/Dashboard.tsx`
- `src/pages/CreateInterview.tsx`
- `src/pages/JourneyBuilder.tsx`
- `src/pages/Practicals.tsx` (standalone practicals page)
- `src/pages/SkillMatcher.tsx`
- `src/pages/ManageInterviewsEnhanced.tsx`
- Legacy `ListsPage` (the flag-gated branch in `src/pages/Lists/index.tsx`
  that renders the old list view instead of `ShortlistsView`)
- The corresponding route entries and `UnifiedRedirect` wrappers in
  `src/App.tsx` for all of the above, once the redirect itself is no longer
  needed.

**Backend — standalone routers/handlers guarded in Task 8:**

- `create_interview` (`funnelhq_api/routers/interview.py`)
- `create_practical` (`funnelhq_api/routers/practicals.py`)
- `create_fitment_interview` and `start_fitment_interview`
  (`funnelhq_api/routers/fitment_interview.py`)
- The `block_standalone_when_unified` guard itself and its import in the
  three routers above become dead code once the handlers are deleted
  outright (rather than gated).

**Not yet covered — needs a separate decision:** the standalone interview
and practical **invite** endpoints live in `candidate_invitations` and
`practical_invitations` respectively, and were deliberately left unguarded
in Task 8 because they're reached by other flows too. If full server-side
retirement of the standalone invite path is wanted, that needs its own
review to confirm those handlers aren't on a journey-shared path before
guarding or deleting them.
