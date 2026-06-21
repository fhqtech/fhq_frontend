import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config. Specs live in e2e/ (Vitest unit/component tests in
 * src/ are excluded there). The dev server is auto-started unless one is
 * already running. Interview-flow and TAG-visual specs that need a seeded
 * backend are marked test.fixme until a deterministic fixture/seed exists —
 * see e2e/README.md.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Visual-regression tolerance: small AA/subpixel diffs shouldn't fail a run.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Don't auto-start a server when pointed at a remote/preview URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
