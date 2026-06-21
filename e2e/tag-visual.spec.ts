import { test, expect } from "@playwright/test";

/**
 * Visual regression for the Talent Analysis Graph — the marquee artifact. A
 * silent SVG render change is a brand risk, so snapshot it across the score
 * bands (strong / developing / gap) plus the empty and error states.
 *
 * Marked test.fixme: it needs a deterministic route that mounts the TAG with
 * fixed data (no live interview). Recommended: a dev-only route, e.g.
 * /__fixtures/tag?case=mixed, that feeds a static graph_data payload through
 * tagFromResult() so positions/scores are stable. Then per case:
 *   await page.goto(`/__fixtures/tag?case=${case}`);
 *   await expect(page.locator("[data-testid=tag-graph]")).toHaveScreenshot(`tag-${case}.png`);
 *
 * Disable animations before snapshotting to avoid flake (the TAG uses CSS
 * fade/pulse): add `reducedMotion: "reduce"` or inject a style that sets
 * transition/animation duration to 0.
 */
const CASES = ["mixed", "all-strong", "all-gap", "empty", "error"] as const;

for (const tagCase of CASES) {
  test.fixme(`TAG visual — ${tagCase}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/__fixtures/tag?case=${tagCase}`);
    const graph = page.locator("[data-testid=tag-graph]");
    await expect(graph).toBeVisible();
    await expect(graph).toHaveScreenshot(`tag-${tagCase}.png`);
  });
}
