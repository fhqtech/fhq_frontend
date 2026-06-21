import { test, expect } from "@playwright/test";

/**
 * App-boots smoke test. No backend required — just proves the SPA mounts,
 * the document title is intact, and the React tree renders into #root. This
 * is the cheap tripwire that catches a white-screen / broken-bundle regression
 * before the heavier flow specs.
 */
test("landing page mounts and renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FlowDot AI/);
  const root = page.locator("#root");
  await expect(root).toBeAttached();
  // React mounted something into the root node (not a white screen).
  await expect(root).not.toBeEmpty();
});
