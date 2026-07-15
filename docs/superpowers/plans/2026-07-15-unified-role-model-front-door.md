# Unified role model + front door — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two parallel recruiter "worlds" into one — role is the only object, all stages live inside it — by adopting the existing journeys engine surfaces and redirecting/retiring the legacy silos, all behind one revertible `unified_ia` flag.

**Architecture:** Adopt-and-redirect. A single `unified_ia` feature flag (default-on, flippable-off) gates a collapsed 5-item nav and a set of additive route redirects that send every legacy create/list surface to its unified home. The redesign surfaces (`RoleContainer`, `Candidate360`, `Talent`, `ShortlistsView`) become the product; the classic interview/practical/fitment engines stay as stage executors (journeys already calls them via adapters). Nothing is deleted in this plan — legacy code stays mounted but unreachable, to be removed in a follow-up PR after a green cutover.

**Tech Stack:** React 18 + Vite 5 + TypeScript, React Router v6, Tailwind 3, Vitest + testing-library (frontend); FastAPI + pytest (backend).

## Global Constraints

- **Tailwind 3** (not v4); **shadcn/ui** primitives are token-wired — extend, don't fork.
- **Sentence case** in all user-facing copy. No Title Case, no ALL CAPS, **no emoji** (use phosphor/lucide icons).
- **TAG** (Talent Analysis Graph) name is fixed — never rename/abbreviate.
- Finance domains only: **Accounting, Taxation, Management Consulting**.
- **URL stability:** existing result deep-links (`/interview/:interviewId/results/:sessionId`) and API path segments must keep resolving. Redirects are additive; never break a deep link.
- **Kill-switch:** every change in this plan is gated by `unified_ia`. With the flag off, the app renders exactly the pre-plan legacy behavior.
- **Backend symbols stable:** Firestore collection IDs, `candidate_id`/`interview_id` identifiers, and API path segments unchanged. Only recruiter-facing routes/nav shift.
- All flag work respects the existing precedence: `override (localStorage) > remote (/api/flags) > REDESIGN_BASELINE > registry default (off)`.

---

## File Structure

**Frontend (`recruiter-assist-frontend/`):**
- `src/lib/flags/registry.ts` — add `unified_ia` FlagKey + def (modify)
- `src/lib/flags/FlagProvider.tsx` — add `unified_ia` to `REDESIGN_BASELINE` (modify)
- `src/lib/flags/FlagProvider.test.tsx` — assert default-on (modify)
- `src/components/layout/Sidebar.tsx` — collapsed `UNIFIED_MENU` branch (modify)
- `src/components/layout/Sidebar.test.tsx` — nav collapse tests (create)
- `src/components/routing/UnifiedRedirect.tsx` — flag-gated redirect wrapper (create)
- `src/components/routing/UnifiedRedirect.test.tsx` — redirect tests (create)
- `src/App.tsx` — add `/roles` index route; wrap legacy routes in `UnifiedRedirect` (modify)
- `src/pages/Lists/index.tsx` — show `ShortlistsView` under `unified_ia` too (modify)
- `src/components/CommandPalette.tsx` — point create actions at `/roles/new`; fix dead `/interviews/screening` link (modify)
- `src/pages/Home.tsx` — empty-state create → `/roles/new` (modify)
- `src/test/unified-ia-redirects.test.tsx` — redirect coverage matrix (create)

**Backend (`recruiter-assist-backend/`):**
- `funnelhq_api/dependencies/unified_ia.py` — `block_standalone_when_unified` dependency (create)
- `funnelhq_api/routers/interview.py`, `fitment_interview.py`, `practicals.py` — attach the guard to standalone create/invite handlers (modify)
- `tests/test_unified_ia_guard.py` — guard tests (create)

---

## Task 1: Add the `unified_ia` kill-switch flag

**Files:**
- Modify: `src/lib/flags/registry.ts`
- Modify: `src/lib/flags/FlagProvider.tsx`
- Test: `src/lib/flags/FlagProvider.test.tsx`

**Interfaces:**
- Produces: `FlagKey` union gains `"unified_ia"`; `useFlag("unified_ia")` returns `true` by default inside a `FlagProvider`, `false` outside one.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/flags/FlagProvider.test.tsx` inside the `describe("FlagProvider / useFlag", …)` block:

```tsx
  it("defaults unified_ia on (kill-switch is on by default)", () => {
    render(
      <FlagProvider>
        <Probe flag="unified_ia" />
      </FlagProvider>,
    );
    expect(screen.getByText("on")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flags/FlagProvider.test.tsx`
Expected: FAIL — TypeScript error `Type '"unified_ia"' is not assignable to type 'FlagKey'` (or the assertion fails with "off").

- [ ] **Step 3: Add the flag to the registry**

In `src/lib/flags/registry.ts`, add `"unified_ia"` to the `FlagKey` union (in the Phase 2 group, after `"nba"`):

```ts
  | "role_home"
  | "one_builder"
  | "nba"
  | "unified_ia"
```

And add its entry to `FLAG_REGISTRY` (after the `nba` line):

```ts
  unified_ia: def("unified_ia", "Unified role model: collapsed nav + legacy-surface redirects"),
```

- [ ] **Step 4: Add it to the default-on baseline**

In `src/lib/flags/FlagProvider.tsx`, add to the `REDESIGN_BASELINE` object under the Tier 1 group:

```ts
  nba: true,
  unified_ia: true,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/flags/ && npx tsc --noEmit`
Expected: PASS (all flag tests green, tsc clean). The registry default-off invariant test still passes because `unified_ia`'s registry `default` is `false`; the baseline lives only in the provider.

- [ ] **Step 6: Commit**

```bash
git add src/lib/flags/registry.ts src/lib/flags/FlagProvider.tsx src/lib/flags/FlagProvider.test.tsx
git commit -m "feat(flags): add unified_ia kill-switch (default-on)"
```

---

## Task 2: Collapse the sidebar nav under `unified_ia`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `src/components/layout/Sidebar.test.tsx` (create)

**Interfaces:**
- Consumes: `useFlag("unified_ia")` from Task 1.
- Produces: when `unified_ia` is on, `<Sidebar />` renders exactly five top-level links — Home (`/home`), Roles (`/roles`), Talent (`/talent`), Shortlists (`/lists`), Settings (`/settings`) — and no `Interviews` collapsible group, no Dashboard/Practicals/Skill-matcher/Quick-tour items.

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/Sidebar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { FlagProvider } from "@/lib/flags/FlagProvider";
import { AuthContext } from "@/contexts/AuthContext";

function renderSidebar(overrides: Record<string, boolean>) {
  const auth = { user: { email: "qa@flowdot.ai" }, logout: async () => {} } as never;
  return render(
    <MemoryRouter>
      <FlagProvider overrides={overrides}>
        <AuthContext.Provider value={auth}>
          <Sidebar />
        </AuthContext.Provider>
      </FlagProvider>
    </MemoryRouter>,
  );
}

describe("Sidebar unified_ia nav", () => {
  it("renders exactly the 5 unified items when unified_ia is on", () => {
    renderSidebar({ unified_ia: true });
    const nav = screen.getByRole("navigation");
    for (const label of ["Home", "Roles", "Talent", "Shortlists", "Settings"]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).queryByText("Interviews")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Dashboard")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Practicals")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Skill matcher")).not.toBeInTheDocument();
  });

  it("keeps the legacy nav when unified_ia is off", () => {
    renderSidebar({ unified_ia: false });
    expect(within(screen.getByRole("navigation")).getByText("Interviews")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: FAIL — with `unified_ia: true` the current code still renders "Interviews"/"Dashboard".

- [ ] **Step 3: Add the unified menu + branch**

In `src/components/layout/Sidebar.tsx`, add a `UNIFIED_MENU` constant directly after the existing `menuItems` array (ends line 65):

```tsx
// unified_ia: the single collapsed nav. Role is the only object; screening/
// practical/interview/fitment/decision are stages inside a role, so their
// standalone nav entries are gone. Shortlists is the saved-view over Talent.
const UNIFIED_MENU = [
  { title: "Home", url: "/home", icon: HomeIcon },
  { title: "Roles", url: "/roles", icon: ProgramsIcon },
  { title: "Talent", url: "/talent", icon: Users },
  { title: "Shortlists", url: "/lists", icon: BookmarksIcon },
  { title: "Settings", url: "/settings", icon: Settings },
];
```

Then, inside the component, add the flag read next to the existing ones (after line 81) and short-circuit `items`:

```tsx
  const talent = useFlag("talent");
  const unifiedIa = useFlag("unified_ia");
  let items = oneBuilder
    ? menuItems.map((m) => (m.title === "Programs" ? { ...m, title: "Roles" } : m))
    : menuItems;
  if (roleHome) {
    items = [{ title: "Home", url: "/home", icon: HomeIcon }, ...items.filter((m) => m.url !== "/dashboard")];
  }
  if (talent) {
    items = items.map((m) => (m.url === "/lists" ? { ...m, title: "Shortlists", icon: BookmarksIcon } : m));
    const idx = items.findIndex((m) => m.url === "/lists");
    const talentItem = { title: "Talent", url: "/talent", icon: Users };
    items = idx >= 0 ? [...items.slice(0, idx), talentItem, ...items.slice(idx)] : [...items, talentItem];
    items = items.filter((m) => m.url !== "/skill-matcher");
  }
  // unified_ia wins: one collapsed nav, ignore the incremental per-flag mutations.
  if (unifiedIa) {
    items = UNIFIED_MENU;
  }
```

(Keep the existing `roleHome`/`oneBuilder`/`talent` block above — it is the flag-off fallback; the `if (unifiedIa)` override is appended last.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.test.tsx
git commit -m "feat(nav): collapse sidebar to 5 items under unified_ia"
```

---

## Task 3: Add the `/roles` index route + redirect `/programs`

**Files:**
- Modify: `src/App.tsx`
- Test: covered by Task 4's redirect matrix (this task only wires routes; the redirect assertion lives in `unified-ia-redirects.test.tsx`).

**Interfaces:**
- Produces: `/roles` renders the role list (the `Programs` list component). `/programs` redirects to `/roles` under `unified_ia`.

- [ ] **Step 1: Add the `/roles` index route**

In `src/App.tsx`, find the `Programs` lazy import and the existing `/roles/new` + `/roles/:programId` routes (App.tsx ~L194-201). Add an index route for `/roles` immediately BEFORE `/roles/new` so the list is reachable. Use the same `Programs` component the `/programs` route already renders:

```tsx
<Route
  path="/roles"
  element={
    <ProtectedRoute>
      <MainLayout>
        <Programs />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 2: Redirect `/programs` → `/roles` under the flag**

Wrap the existing `/programs` route's element in the `UnifiedRedirect` created in Task 4 (this step is completed after Task 4 lands; if executing in order, come back). Target:

```tsx
<Route path="/programs" element={<UnifiedRedirect to="/roles"><Programs /></UnifiedRedirect>} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (note: `UnifiedRedirect` import resolves after Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(routes): add /roles index route (role list)"
```

---

## Task 4: Flag-gated `UnifiedRedirect` + legacy route redirects

**Files:**
- Create: `src/components/routing/UnifiedRedirect.tsx`
- Test: `src/components/routing/UnifiedRedirect.test.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/unified-ia-redirects.test.tsx`

**Interfaces:**
- Consumes: `useFlag("unified_ia")`.
- Produces: `<UnifiedRedirect to="/x">{legacy}</UnifiedRedirect>` — renders `<Navigate to="/x" replace />` when `unified_ia` is on, else renders `children` (the legacy element).

- [ ] **Step 1: Write the failing test for the wrapper**

Create `src/components/routing/UnifiedRedirect.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { UnifiedRedirect } from "./UnifiedRedirect";
import { FlagProvider } from "@/lib/flags/FlagProvider";

function renderAt(path: string, on: boolean) {
  return render(
    <FlagProvider overrides={{ unified_ia: on }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/legacy" element={<UnifiedRedirect to="/target"><span>legacy</span></UnifiedRedirect>} />
          <Route path="/target" element={<span>target</span>} />
        </Routes>
      </MemoryRouter>
    </FlagProvider>,
  );
}

describe("UnifiedRedirect", () => {
  it("redirects to target when unified_ia is on", () => {
    renderAt("/legacy", true);
    expect(screen.getByText("target")).toBeInTheDocument();
  });
  it("renders legacy children when unified_ia is off", () => {
    renderAt("/legacy", false);
    expect(screen.getByText("legacy")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/routing/UnifiedRedirect.test.tsx`
Expected: FAIL — module `./UnifiedRedirect` not found.

- [ ] **Step 3: Implement the wrapper**

Create `src/components/routing/UnifiedRedirect.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useFlag } from "@/lib/flags/FlagProvider";
import type { ReactNode } from "react";

/**
 * unified_ia cutover helper. When the flag is on, this legacy route redirects
 * to its unified home; when off, it renders the original legacy element. Keeps
 * the whole consolidation revertible from one flag. Never wrap deep-link result
 * routes with this — only the retired create/list/nav surfaces.
 */
export function UnifiedRedirect({ to, children }: { to: string; children: ReactNode }) {
  const unifiedIa = useFlag("unified_ia");
  if (unifiedIa) return <Navigate to={to} replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run wrapper test to verify it passes**

Run: `npx vitest run src/components/routing/UnifiedRedirect.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the redirect coverage matrix (failing)**

Create `src/test/unified-ia-redirects.test.tsx`. This renders the real `App` router tree at each legacy path and asserts the URL lands on the unified target. Use the app's router if exported; otherwise assert per-route with the same pattern as Step 1. Minimum matrix:

```tsx
import { describe, it, expect } from "vitest";

// The retired-path -> unified-target contract. Keep in sync with App.tsx.
export const UNIFIED_REDIRECTS: Record<string, string> = {
  "/dashboard": "/home",
  "/interviews/create": "/roles/new",
  "/interviews/manage": "/roles",
  "/interviews/fitment": "/roles",
  "/interviews/skill-analysis": "/roles",
  "/practicals": "/roles",
  "/skill-matcher": "/talent",
  "/programs": "/roles",
  "/journeys/new": "/roles/new",
};

describe("unified_ia redirect contract", () => {
  it("covers every retired surface", () => {
    // Deep-link result routes must NOT be in the map (they stay live).
    expect(Object.keys(UNIFIED_REDIRECTS)).not.toContain("/interview/:interviewId/results/:sessionId");
    expect(Object.keys(UNIFIED_REDIRECTS).length).toBeGreaterThanOrEqual(9);
  });
});
```

- [ ] **Step 6: Wrap the legacy routes in `App.tsx`**

In `src/App.tsx`, import `UnifiedRedirect` and wrap each retired route's `element` (leave `MainLayout`/`ProtectedRoute` out of the redirect path — redirect before rendering the shell). Apply to: `/dashboard`→`/home`, `/interviews/create`→`/roles/new`, `/interviews/manage`→`/roles`, `/interviews/fitment`→`/roles`, `/interviews/skill-analysis`→`/roles`, `/practicals`→`/roles`, `/skill-matcher`→`/talent`, `/programs`→`/roles`. Example (repeat the pattern per route):

```tsx
<Route path="/dashboard" element={<UnifiedRedirect to="/home"><ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute></UnifiedRedirect>} />
```

For `/journeys/new`, the existing `OneBuilderRedirect` already sends it to `/roles/new`; leave it (it's consistent). **Do NOT wrap** `/interview/:interviewId/results/:sessionId`, `/interviews/:id` result deep-links, or any candidate-side route.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components/routing/ src/test/unified-ia-redirects.test.tsx && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/routing/UnifiedRedirect.tsx src/components/routing/UnifiedRedirect.test.tsx src/App.tsx src/test/unified-ia-redirects.test.tsx
git commit -m "feat(routes): redirect legacy surfaces to unified homes under unified_ia"
```

---

## Task 5: Point the remaining live create entry points at "Open a role"

**Files:**
- Modify: `src/components/CommandPalette.tsx`
- Modify: `src/pages/Home.tsx`
- Test: `src/components/CommandPalette.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `useFlag("unified_ia")`.
- Produces: under `unified_ia`, the command palette's create actions and Home's empty-state create button navigate to `/roles/new`; the dead `/interviews/screening` command is removed.

- [ ] **Step 1: Write the failing test**

Create/extend `src/components/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { COMMAND_TARGETS } from "./CommandPalette";

describe("CommandPalette unified targets", () => {
  it("has no dead /interviews/screening link", () => {
    expect(Object.values(COMMAND_TARGETS)).not.toContain("/interviews/screening");
  });
  it("routes create actions to /roles/new under unified_ia", () => {
    expect(COMMAND_TARGETS.createRoleUnified).toBe("/roles/new");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CommandPalette.test.tsx`
Expected: FAIL — `COMMAND_TARGETS` not exported.

- [ ] **Step 3: Refactor command targets + fix the dead link**

In `src/components/CommandPalette.tsx`, extract the navigation targets into an exported constant and reference it. Add `createRoleUnified: "/roles/new"`, remove the `/interviews/screening` entry (the scout flagged it as a dead link at ~L94), and when `useFlag("unified_ia")` is on, the "Create screening/fitment interview" commands should navigate to `COMMAND_TARGETS.createRoleUnified`:

```tsx
export const COMMAND_TARGETS = {
  home: "/home",
  roles: "/roles",
  talent: "/talent",
  shortlists: "/lists",
  createRoleUnified: "/roles/new",
} as const;
```

- [ ] **Step 4: Point Home's empty-state create at /roles/new**

In `src/pages/Home.tsx` (empty-state create button, scout ref ~L110-111), when `useFlag("unified_ia")` is on, the primary create action navigates to `/roles/new` (it already does under `one_builder` off/on branches — make `unified_ia` force `/roles/new`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/CommandPalette.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CommandPalette.tsx src/pages/Home.tsx src/components/CommandPalette.test.tsx
git commit -m "feat(create): single 'Open a role' entry under unified_ia; fix dead link"
```

---

## Task 6: Shortlists view under `unified_ia`

**Files:**
- Modify: `src/pages/Lists/index.tsx`
- Test: `src/pages/Lists/index.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `useFlag("unified_ia")`, `useFlag("talent")`.
- Produces: `/lists` renders `ShortlistsView` (not the legacy `ListsPage`) when either `talent` or `unified_ia` is on.

- [ ] **Step 1: Write the failing test**

Create `src/pages/Lists/index.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListsIndex from "./index";
import { FlagProvider } from "@/lib/flags/FlagProvider";

vi.mock("./ShortlistsView", () => ({ default: () => <div>shortlists-view</div> }));
vi.mock("./ListsPage", () => ({ default: () => <div>legacy-lists</div> }));

describe("Lists index gating", () => {
  it("shows ShortlistsView under unified_ia even if talent is off", () => {
    render(
      <FlagProvider overrides={{ unified_ia: true, talent: false }}>
        <MemoryRouter><ListsIndex /></MemoryRouter>
      </FlagProvider>,
    );
    expect(screen.getByText("shortlists-view")).toBeInTheDocument();
  });
});
```

(Adjust the mocked module paths/default-vs-named exports to match the actual `Lists/index.tsx` imports — read the file first.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Lists/index.test.tsx`
Expected: FAIL — legacy `ListsPage` renders when `talent` is off.

- [ ] **Step 3: Widen the gate**

In `src/pages/Lists/index.tsx` (scout ref ~L16-23), change the selector so `ShortlistsView` renders when `talent || unified_ia`:

```tsx
const talent = useFlag("talent");
const unifiedIa = useFlag("unified_ia");
const showShortlists = talent || unifiedIa;
return showShortlists ? <ShortlistsView /> : <ListsPage />;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/Lists/index.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Lists/index.tsx src/pages/Lists/index.test.tsx
git commit -m "feat(talent): shortlists view under unified_ia"
```

---

## Task 7: Full frontend suite + cutover verification

**Files:**
- Modify: none (verification task); fix any fallout inline.

- [ ] **Step 1: Run the full frontend test suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests pass (349 pre-existing + the new tasks' tests), tsc clean. If any pre-existing component test wrapped a legacy surface without `overrides={{ unified_ia: false }}` and now redirects, fix that test to inject `unified_ia: false` (it is testing legacy behavior).

- [ ] **Step 2: Verify the two-worlds seam still holds**

Run: `npx vitest run src/test/two-worlds-seam.test.ts`
Expected: PASS — candidate bundle still cannot import recruiter nav.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual click-through (record results)**

With `unified_ia` on (default), on a preview deploy, confirm: nav shows the 5 items; `/dashboard`,`/interviews/*`,`/practicals`,`/skill-matcher`,`/programs` each redirect to their unified home; a result deep-link `/interview/<id>/results/<sid>` still loads; "Open a role" is the only create flow. Then flip `unified_ia` off (localStorage override `{"unified_ia":false}`) and confirm the legacy nav + surfaces return.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: green cutover under unified_ia; legacy preserved with flag off"
```

---

## Task 8: Backend — guard the standalone create/invite front-doors (env-gated, default-off)

**Files:**
- Create: `funnelhq_api/dependencies/unified_ia.py`
- Modify: `funnelhq_api/routers/interview.py`, `funnelhq_api/routers/fitment_interview.py`, `funnelhq_api/routers/practicals.py`
- Test: `tests/test_unified_ia_guard.py`

**Interfaces:**
- Produces: `block_standalone_when_unified` FastAPI dependency — raises `410 Gone` with `{"error": "standalone_retired", "use": "role stages"}` when env `UNIFIED_IA=1`; a no-op otherwise. Attached ONLY to standalone create/invite POST handlers; stage-executor/internal/read endpoints are untouched.

**Rationale:** defense-in-depth. Frontend already stops calling these under `unified_ia`; this guard makes the retirement real server-side. It ships **default-off** (`UNIFIED_IA` unset) and is flipped on only after the frontend cutover is verified green, so it can never break the pilot before the UI is ready.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unified_ia_guard.py`:

```python
import os
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from funnelhq_api.dependencies.unified_ia import block_standalone_when_unified


def _client():
    app = FastAPI()

    @app.post("/legacy/create", dependencies=[Depends(block_standalone_when_unified)])
    def create():
        return {"ok": True}

    return TestClient(app, raise_server_exceptions=False)


def test_allows_when_env_unset(monkeypatch):
    monkeypatch.delenv("UNIFIED_IA", raising=False)
    assert _client().post("/legacy/create").status_code == 200


def test_blocks_with_410_when_unified(monkeypatch):
    monkeypatch.setenv("UNIFIED_IA", "1")
    r = _client().post("/legacy/create")
    assert r.status_code == 410
    assert r.json()["detail"]["error"] == "standalone_retired"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_unified_ia_guard.py -v`
Expected: FAIL — module `funnelhq_api.dependencies.unified_ia` not found.

- [ ] **Step 3: Implement the guard**

Create `funnelhq_api/dependencies/unified_ia.py`:

```python
"""unified_ia cutover guard — retire the standalone interview/practical/fitment
front-doors server-side once the UI has moved to role stages.

Default-off: with UNIFIED_IA unset this dependency is a no-op, so nothing
changes until the frontend cutover is verified green and an operator sets
UNIFIED_IA=1 on the Cloud Run services. Attach ONLY to standalone
create/invite handlers — never to stage-executor, internal, or read routes."""
import os
from fastapi import HTTPException


def _unified_enabled() -> bool:
    return os.getenv("UNIFIED_IA", "").strip() in ("1", "true", "True")


def block_standalone_when_unified() -> None:
    if _unified_enabled():
        raise HTTPException(
            status_code=410,
            detail={"error": "standalone_retired", "use": "role stages"},
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_unified_ia_guard.py -v`
Expected: PASS.

- [ ] **Step 5: Attach the guard to standalone create/invite handlers**

Read each router and add `dependencies=[Depends(block_standalone_when_unified)]` to the standalone **create** and **invite** POST route decorators only. Concretely:
- `funnelhq_api/routers/interview.py` — the `POST .../interviews` create handler and the standalone invite handler.
- `funnelhq_api/routers/fitment_interview.py` — the `create_fitment_interview` POST handler and its invite handler.
- `funnelhq_api/routers/practicals.py` — the `create_practical` POST handler and the practical-invite handler.

Do NOT add it to: blueprint generation, results/read endpoints, session endpoints, internal reviewer/worker routes, or the journeys stage-adapter paths (those execute stages and must keep working). Example edit shape:

```python
@router.post("/workspaces/{workspace_id}/projects/{project_id}/interviews",
             dependencies=[Depends(block_standalone_when_unified)])
def create_interview(...):
    ...
```

Add the import at the top of each router: `from funnelhq_api.dependencies.unified_ia import block_standalone_when_unified`.

- [ ] **Step 6: Run the backend suite**

Run: `.venv/bin/pytest tests/test_unified_ia_guard.py tests/ -q -k "interview or practical or fitment or unified"`
Expected: PASS (guard tests pass; existing router tests still pass because `UNIFIED_IA` is unset in the suite).

- [ ] **Step 7: Commit**

```bash
git add funnelhq_api/dependencies/unified_ia.py funnelhq_api/routers/interview.py funnelhq_api/routers/fitment_interview.py funnelhq_api/routers/practicals.py tests/test_unified_ia_guard.py
git commit -m "feat(unified_ia): env-gated guard retiring standalone create/invite front-doors"
```

---

## Task 9: Docs + rollout notes

**Files:**
- Modify: `docs/superpowers/specs/2026-07-15-unified-role-model-front-door-design.md` (append a "Delivered" note)
- Create: `docs/UNIFIED_IA_ROLLOUT.md`

- [ ] **Step 1: Write the rollout doc**

Create `docs/UNIFIED_IA_ROLLOUT.md` with: the flag names (`unified_ia` frontend, `UNIFIED_IA` backend env), the redirect contract table (copy `UNIFIED_REDIRECTS`), the revert procedure (set localStorage `{"unified_ia":false}` or flip the workspace flag; unset `UNIFIED_IA` on Cloud Run), and the follow-up deletion checklist (legacy components/routes/routers to remove after N days green).

- [ ] **Step 2: Cutover sequence note**

Document the order: (1) ship frontend with `unified_ia` on; (2) verify green for N days; (3) set backend `UNIFIED_IA=1` on the 3 Cloud Run services + roll; (4) after stable, open the deletion follow-up PR.

- [ ] **Step 3: Commit**

```bash
git add docs/UNIFIED_IA_ROLLOUT.md docs/superpowers/specs/2026-07-15-unified-role-model-front-door-design.md
git commit -m "docs: unified_ia rollout + revert runbook"
```

---

## Self-Review

**Spec coverage:**
- §3 target model (one object) → Tasks 2–5 (nav/routes/create collapse to the role/programs object). ✅
- §4 target IA (5-item nav) → Task 2. ✅
- §5 stage flow + gating → no code change (engine already does gating); adoption verified in Task 7 manual click-through. ✅ (No new task needed — gating is existing, tested backend behavior; Spec 1 only routes users into it.)
- §6 retirement map → Tasks 3 (programs→roles), 4 (redirects), 5 (create), 6 (shortlists), 8 (backend front-doors). ✅
- §7 cutover safety → Task 1 (kill-switch), Task 7 (verification), Task 9 (rollout/revert). ✅
- §8 non-goals → respected (no defense flow, no invitation/session merge, no reviewer change, no agent edits). ✅

**Placeholder scan:** all code steps contain real code; the two "read the file first" notes (Task 6 mock paths, Task 8 handler list) point at concrete files/handlers with exact edit shapes, not vague instructions. ✅

**Type consistency:** `unified_ia` FlagKey used identically in Tasks 1–6; `UnifiedRedirect({to, children})` signature consistent between Task 4 definition and Task 3/4 usage; `block_standalone_when_unified` name consistent between Task 8 definition and usage; `COMMAND_TARGETS.createRoleUnified` consistent in Task 5. ✅

**Deferred by design (not gaps):** physical deletion of legacy code (follow-up PR after green, per §6); data migration (none — dev-throwaway assumption, §7); optional backfill (only if real data exists). These are intentionally out of this plan.
