# Unified role model + front door — design (Spec 1)

**Date:** 2026-07-15
**Status:** Approved (design) — ready for implementation planning
**Scope:** Cross-cutting — `recruiter-assist-frontend` (bulk) + `recruiter-assist-backend` (retire standalone front-doors)
**Author:** brainstormed with the team; grounded in a 3-scout codebase survey

---

## 1. Problem

The recruiter app runs **two parallel "worlds" at once**, both reachable under current flags:

- **Legacy interview-world** (`interviewApi`): you create standalone `interview` and `practical` objects; screening / fitment / skill-analysis are *global lists filtered by type*, not tied to a role.
- **Redesign role-world** (`recruiterJourneysApi`): you create a `role` (`programs` doc) and screening → practical → interview → fitment → decision are *stages inside that one role*, with one fused TAG per candidate.

The redesign world **is** the simplification, but it was layered *on top of* the legacy world instead of replacing it. Result (the redundancy the user feels):

- **5 create-flows** a recruiter reads as "set up a role" (Open role, Build a program, Create interview, Create practical, Add stage), hitting **2 different backends** (`programs` vs `interviews`).
- **Interview and practical each exist twice** — as a standalone object and as a role stage.
- **Fitment is a whole duplicate entity family** just to mean "round 2."
- Manual `lists`/`qualified_lists` copying is the only connective tissue between stages.
- **~12 concrete duplicated surfaces** (Dashboard vs Home, two per-role pipelines, standalone Skill-matcher vs embedded, dead redirects, broken nav links).

**Key finding:** the connected pipeline the user wants already exists and is tested on the backend — the **journeys engine** (`CandidateJourney` + `JourneyTemplate` + stage adapters + auto-advance + one-TAG fusion). It is bypassed by the legacy UI. So this is **consolidation + adoption, not a greenfield build.**

## 2. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| Scope | How far to simplify | **One model, retire the silos** |
| Defense flow | "Interview on top of the submission" depth | **Full vision** (adaptive, artifact-grounded, cheat-scored) — **deferred to Spec 2** |
| Structure | How to sequence | **Foundation first** (this spec), then defense flow |
| Approach | How aggressively to tear out legacy | **Adopt-and-redirect** — hide + redirect now, delete after a green cutover; keep classic engines as stage executors; retire the duplicate fitment/lists entity families; defer the invitation/session merge |

## 3. Target model — one object, one pipeline, one profile

Everything hangs off a single object: **the Role** (backed by the existing `programs` doc). Standalone `interview` / `practical` / `fitment` objects stop being things you *create* — they become **stages inside a role**.

| Concept | Today | Target |
|---|---|---|
| "A role" | 2 backends (`programs` **and** `interviews`) | **One** — `programs` (`purpose: hiring \| skill_analysis`) |
| Screening / interview / practical / fitment | Standalone objects **and** stages | **Stages only** — `screen · assignment · interview · fitment · decision` in the role's `JourneyTemplate` |
| A candidate in a role | No spanning entity; re-identified per stage | **One `CandidateJourney`** — per-candidate state machine across all stages |
| The candidate's result | A TAG per interview/session, scattered | **One fused TAG per candidate per role** (`candidate_role_tags`), accumulating across stages |

Conventions preserved: sentence case, TAG name sacred, finance domains only, existing URLs + Firestore collection IDs stable.

## 4. Target IA (what a recruiter sees)

Sidebar collapses from ~8 items (with a nested Interviews group) to **5**:

```
Home · Roles · Talent · Shortlists · Settings
```

| Surface | What it is | Replaces |
|---|---|---|
| **Home** | Workspace pulse + next-best-action queue | Dashboard (removed) |
| **Roles** | Role list → **Role hub** (`/roles/:id`, pipeline board) → **Candidate-360** | Programs list, Interviews group, standalone Practicals, per-interview detail pages |
| **Talent** | Cross-role index of every assessed candidate; skill-matcher folded in as a filter | Standalone Skill-matcher |
| **Shortlists** | Saved candidate views | Talent pools / Lists |
| **Settings** | Workspace + billing | (unchanged) |

**One create flow:** "Open a role" (`OpenRoleFlow`, `/roles/new`) → the role board. "Draft with AI" (`RoleCuratorModal`) stays as the assist inside it. The other four create-flows are retired (redirected).

## 5. Connected stage flow + "move candidates between stages"

Inside a role, each stage is a board column. A candidate enrolls **once** and advances:

```
enroll → [screen] → gate → [practical] → gate → [interview] → gate → [fitment] → [decision]
                      │              │                │
              recommend+confirm  recommend+confirm  recommend+confirm
```

The explicit ask — *"from practicals we move/select profiles for interview"* — **is the gate**: when a stage completes, the engine **recommends** who advances (score vs the bar) and the recruiter **confirms the selection** in one action. This is the existing `gating.recommend_transitions` → `apply_decision` (built + tested; recommends only, never auto-mutates). Stages may auto-advance where configured. One fused TAG grows as the candidate clears stages. **Fitment stops being a separate entity** — it's an interview-type stage scored against the role ("round 2").

## 6. Retirement map (concrete)

**Now (this spec): hide + redirect. Nothing deleted yet.**

| Retired surface | Becomes | Mechanism |
|---|---|---|
| `Dashboard` (`/dashboard`) | Home | redirect → `/home`, drop from nav |
| Interviews group — Setup/Screening/Fitment/Skill-analysis (`/interviews/*`) | Stages inside a role | redirect → role flow, remove nav group |
| Standalone Practicals (`/practicals`) | `assignment` stage in a role | redirect → `/roles`, drop from nav |
| Standalone Skill-matcher (`/skill-matcher`) | Filter inside Talent | redirect → `/talent`, drop from nav |
| `CreateInterview`, `JourneyBuilder`, standalone practical/fitment create | "Open a role" | 5 create-flows → **1**; retire entry points |
| `Programs` naming/route | Roles | `/programs`→`/roles`, `/programs/:id`→`/roles/:id` |

**Entity families retired (high-value slice of deep-unify):**
- **Fitment** stops being a separate family (`fitment_interviews` / `fitment_interview_blueprint` / `fitment_candidate_invitations`) — it's an interview-type stage.
- **`lists` / `qualified_lists`** stop being inter-stage connective tissue (gating does that); **Shortlists** become a saved view over Talent.
- Backend: remove standalone **create/invite entry points** on classic interview/practical/fitment routers. **Keep the engines** — journeys calls them as stage executors via adapters.

**Deep links stay alive:** existing result URLs (`/interview/:id/results/:sessionId`) keep resolving — URL-stability rule respected; redirects are additive.

**Later (follow-up PR, after green):** physically delete the now-unreachable legacy components, routes, and standalone routers.

## 7. Cutover safety + verification

- **Kill-switch:** the nav-collapse + redirects sit behind one `unified_ia` flag → instant revert to legacy if needed.
- **Data stance (assumption):** legacy standalone interviews/practicals are **dev/throwaway** ("no one's using it still"), so Spec 1 ships **without a data migration**. If real standalone data must survive, add a small optional backfill (map each into a program + journey).
- **Verification:**
  - E2E: open-a-role → add stages → enroll candidate → run stage → gate/confirm → decision → **one fused TAG**.
  - E2E: every retired route redirects to its unified home; result deep-links still resolve.
  - Two-worlds seam test stays green; existing 349 frontend + backend tests green; add redirect + nav tests.
  - Manual click-through on a prod preview.

## 8. Non-goals (Spec 1)

- Full artifact-grounded **defense interview** → Spec 2.
- **Invitation/session** system merge (interview vs practical) → later cleanup.
- **Reviewer v1→v2** migration → separate track.
- No agent changes — classic engines untouched; only their standalone front-doors retire.

## 9. Key file references (for the implementation plan)

**Frontend (`recruiter-assist-frontend`):**
- Routes: `src/App.tsx` (all route defs, incl. redirect wrappers `OneBuilderRedirect`, `LegacyFitmentRedirect`)
- Nav: `src/components/layout/Sidebar.tsx` (`menuItems` ~L47-65; flag mutations ~L79-98)
- Survivor create-flow: `src/components/role/OpenRoleFlow.tsx`; assist `src/components/role-curator/RoleCuratorModal.tsx`
- Role hub: `src/pages/RoleContainer.tsx` (`PipelineBoard`), `src/pages/Candidate360.tsx` / `components/candidate/Candidate360Content.tsx`
- Retire (UI): `src/pages/CreateInterview.tsx`, `src/pages/JourneyBuilder.tsx`, `src/pages/Practicals.tsx`, `src/pages/SkillMatcher.tsx`, `src/pages/Dashboard.tsx`, `src/pages/InterviewDetails.tsx`, `src/pages/ManageInterviewsEnhanced.tsx`
- Talent/Shortlists: `src/pages/Talent.tsx`, `src/pages/Lists/index.tsx` (flag-gated `ListsPage` vs `ShortlistsView`)
- APIs: `src/services/recruiterJourneysApi.ts` (survivor), `src/services/interviewApi.ts` / `practicalsApi.ts` (retire front-doors)
- Flags: `src/lib/flags/FlagProvider.tsx` (`REDESIGN_BASELINE`), `registry.ts` (add `unified_ia`)
- Command palette dead links: `src/components/CommandPalette.tsx` (`/interviews/screening` bug)

**Backend (`recruiter-assist-backend`):**
- Journeys engine (keep, adopt): `funnelhq_api/journeys/{models,orchestrator,gating,fusion,gap_analysis}.py`, `journeys/adapters/*`, `services/journeys_service/journeys_service.py`, routers `funnelhq_api/routers/{role_journeys,journey_tags}.py`
- Auto-advance hooks (keep): `services/interview_reviewer_service/interview_reviewer_service.py:177-206,512-532`; `services/practicals_service/downstream_dispatch.py`
- Retire standalone front-doors (keep engines): `funnelhq_api/routers/{interview,fitment_interview,results,qualified_lists,lists,practicals}.py`; `services/fitment_interview_service/*`
- Stage executors (keep): `agents/{prelims,assignment_architect,reviewer,reviewer_v2}`

## 10. Open items to confirm

1. **Data stance** — confirm legacy standalone interview/practical data is dev/throwaway (no migration). If not, add the optional backfill task.
2. **Quick tour** — keep as a nav item, fold into onboarding, or drop? (minor; default: fold into Home onboarding.)
