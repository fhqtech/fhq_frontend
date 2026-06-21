import { test, expect } from "@playwright/test";

/**
 * Candidate interview happy-path E2E. Encodes the flow the
 * `.claude/agents/interview-flow-tester.md` agent already drives manually:
 *
 *   invitation link → consent → mic pre-check → interview session → TAG render
 *
 * Guards the known regressions: S126 page-bounce, consent bypass, API-key
 * leakage into the page, and a broken TAG renderer on the results view.
 *
 * Marked test.fixme: it needs a seeded interview invitation + a way to stub
 * mic input and the voice WebSocket. Wire these before enabling:
 *   1. Seed an invitation via the backend (or a test-only fixture endpoint)
 *      and inject the token, e.g. process.env.E2E_INVITE_URL.
 *   2. Grant mic permission: context.grantPermissions(["microphone"]).
 *   3. Use a fake media stream (Chromium flags
 *      --use-fake-device-for-media-stream --use-fake-ui-for-media-stream)
 *      and/or mock the /api/voice/ws WebSocket so the FSM advances
 *      deterministically without live STT/TTS.
 */
test.fixme("candidate completes interview and sees the TAG", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);

  const inviteUrl = process.env.E2E_INVITE_URL ?? "/";
  await page.goto(inviteUrl);

  // Consent gate.
  await page.getByRole("button", { name: /agree|consent|continue/i }).click();

  // Mic pre-check (InterviewPreCheck) → start session.
  await page.getByRole("button", { name: /start|begin|join/i }).click();

  // Session reaches an active state (ParticleSphere listening/speaking).
  await expect(page.getByText(/listening|speaking|thinking/i)).toBeVisible({ timeout: 30_000 });

  // After the flow completes, the Talent Analysis Graph renders.
  await expect(page.locator("svg").first()).toBeVisible();

  // Negative guard: no raw API keys leaked into the DOM.
  const html = await page.content();
  expect(html).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
});
