import { test, expect } from "@playwright/test";

/**
 * Route-registration coverage for the redesign / re-homed routes.
 *
 * WHY THIS EXISTS (the genuine gap the unit suite can't close):
 * The redirect + flag-gate *logic* is already unit-tested with hand-built
 * MemoryRouter route tables — OneBuilderRedirect.test.tsx, Candidate360.test.tsx,
 * ProtectedRoute.test.tsx, resolve.test.ts, FlagProvider.test.tsx. But NONE of
 * them exercise the real `<Routes>` table in `src/App.tsx`. A path typo there
 * (e.g. `/role/:id` instead of `/roles/:id`) would pass every unit test yet 404
 * in the shipped app. This spec is the only check that the redesign paths are
 * actually registered in App.tsx.
 *
 * HOW IT WORKS WITHOUT A BACKEND (Spec A, active):
 * Runs unauthenticated. `AuthContext` skips the `/api/auth/me` fetch when there
 * is no `auth_token` in localStorage, so `isAuthenticated` resolves to false
 * immediately with no network. `ProtectedRoute` then renders
 * `<Navigate to="/" replace>`, so a REGISTERED protected path redirects to `/`
 * (MarketingLanding — a static, fetch-free page) and never shows NotFound. An
 * UNREGISTERED path falls through to the catch-all `*` → NotFound and renders
 * "Page Not Found". That observable difference is what proves registration.
 *
 * `/fitment-interviews/:id` is a bare `<LegacyFitmentRedirect>` (no
 * ProtectedRoute) that `<Navigate>`s to `/interviews/:id`, which IS protected —
 * so unauthenticated it chains through to `/`, still never NotFound.
 *
 * STRICT-TDD RITUAL (routes pre-exist, so RED had to be manufactured):
 * Before committing this spec I temporarily swapped one covered path to a bogus
 * value (`/roles/new` → `/rolez/new`) and ran it: the case went RED with the
 * detector reporting "Page Not Found" visible — i.e. it failed for the RIGHT
 * reason (the detector fires on a genuine 404), not a false green. Restoring the
 * real path returned the suite to GREEN. The negative-control case below keeps
 * that tooth permanently: `/__no_such_route_xyz__` and bare `/roles` MUST render
 * NotFound, proving the detector still fires.
 */

// Redesign / re-homed routes that MUST be registered in App.tsx. Each is
// asserted to never render NotFound when hit unauthenticated (it either lands on
// MarketingLanding via ProtectedRoute, or chains through a redirect to it).
const REGISTERED_ROUTES = [
  "/home", // P2-1 workspace-pulse Home
  "/roles/new", // P2-2 open-role flow
  "/roles/p1", // role-as-home pipeline board
  "/roles/p1/candidates/c1", // P5-2 candidate-360 fan-in
  "/talent", // P3-1 cross-role Talent index
  "/programs/p1", // legacy pipeline (OneBuilderRedirect wrapper)
  "/journeys/new", // legacy builder (OneBuilderRedirect wrapper)
  "/fitment-interviews/i1", // LegacyFitmentRedirect → /interviews/:id
];

// Paths that are NOT registered — they give the suite teeth by proving the
// NotFound detector actually fires.
const UNREGISTERED_ROUTES = [
  "/__no_such_route_xyz__",
  "/roles", // bare — only /roles/new and /roles/:programId exist
];

test.describe("redesign route registration (unauthenticated, no backend)", () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean slate so no stale auth_token/flag_overrides leaks in.
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  for (const path of REGISTERED_ROUTES) {
    test(`registered route resolves (no 404): ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Registered → redirected to MarketingLanding (or chained there). Never 404.
      await expect(page.getByText(/page not found/i)).toHaveCount(0);
    });
  }

  for (const path of UNREGISTERED_ROUTES) {
    test(`negative control — unregistered route 404s: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Unregistered → catch-all `*` → NotFound. This proves the detector fires.
      await expect(page.getByText(/page not found/i)).toBeVisible();
    });
  }
});

/**
 * Spec B — flag-gated redirect behavior UNDER AUTH (test.fixme).
 *
 * These assert the "flags-on re-home / flags-off legacy" behavior directly in
 * the real App.tsx route table, but they require passing `ProtectedRoute`, which
 * needs a validated session — so they need a running stack or request mocks and
 * stay `fixme` (following the interview-flow / tag-visual convention). Their
 * underlying logic is already unit-covered (OneBuilderRedirect.test.tsx,
 * Candidate360.test.tsx); this would add the real-route integration layer.
 *
 * To enable, EITHER:
 *   (a) Seed a session + mock the bootstrap fetches, e.g.:
 *         await page.addInitScript(() => {
 *           localStorage.setItem("auth_token", "e2e-test-token");
 *           localStorage.setItem("flag_overrides", JSON.stringify({ one_builder: true }));
 *         });
 *         await page.route("**\/api/auth/me", (r) => r.fulfill({ json: { ...user } }));
 *         await page.route("**\/api/workspaces/**", (r) => r.fulfill({ json: [ ...workspaces ] }));
 *       (WorkspaceContext bootstraps via workspaceApi.getUserWorkspaces()); OR
 *   (b) Point at a seeded running stack: `E2E_BASE_URL=<url> npm run e2e` and log
 *       in / inject a real token in beforeEach.
 */
test.describe("flag-gated redirects under auth", () => {
  test.fixme("one_builder ON: /programs/:id re-homes to /roles/:id", async ({ page }) => {
    // Seed auth + { one_builder: true } via addInitScript, mock /api/auth/me and
    // /api/workspaces/**, then:
    await page.goto("/programs/p1");
    await page.waitForURL("**/roles/p1");
  });

  test.fixme("one_builder ON: /journeys/new re-homes to /roles/new", async ({ page }) => {
    await page.goto("/journeys/new");
    await page.waitForURL("**/roles/new");
  });

  test.fixme("flags OFF: /programs/:id renders the legacy pipeline (unchanged)", async ({ page }) => {
    // Default flags → OneBuilderRedirect passes through to RolePipeline. Assert a
    // legacy-pipeline marker is visible and the URL stays /programs/p1.
    await page.goto("/programs/p1");
    await expect(page).toHaveURL(/\/programs\/p1$/);
  });

  test.fixme("flags OFF: /roles/:id/candidates/:cid 404s (candidate_360 gate)", async ({ page }) => {
    // Default candidate_360=off → Candidate360 renders NotFound (today's pilot
    // behavior — must stay unchanged).
    await page.goto("/roles/p1/candidates/c1");
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});
