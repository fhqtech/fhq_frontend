# E2E tests (Playwright)

Browser-level specs for the candidate-facing flows. Unit/component tests stay
in `src/**` under Vitest; these are the heavier, full-app checks.

## Run

```bash
npx playwright install chromium   # one-time, downloads the browser
npm run e2e                       # headless; auto-starts `npm run dev` on :8080
npm run e2e:ui                    # interactive UI mode
npm run e2e:update                # refresh visual snapshots after an intended change
```

Point at a deployed/preview build instead of the local dev server:

```bash
E2E_BASE_URL=https://<preview-url> npm run e2e
```

## Specs

| Spec | Status | Needs |
|---|---|---|
| `smoke.spec.ts` | **active** | nothing — app boot only |
| `interview-flow.spec.ts` | `test.fixme` | seeded invitation + faked mic/voice WS (see header) |
| `tag-visual.spec.ts` | `test.fixme` | a deterministic `/__fixtures/tag` route with static data |

## Enabling the fixme specs

1. **Interview flow** — add a test-only invitation seed (or `E2E_INVITE_URL`),
   grant mic permission, and run Chromium with fake-media flags or a mocked
   `/api/voice/ws` socket so the session FSM advances without live STT/TTS.
2. **TAG visual** — add a dev-only route that mounts the graph from a static
   `graph_data` payload (via `tagFromResult`) with `data-testid="tag-graph"`,
   disable motion, then drop `.fixme`.

The flow mirrors `.claude/agents/interview-flow-tester.md` — keep them in sync.
