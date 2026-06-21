# Engine flip smoke test (S0.3)

Manual verification for the default-engine flip in
[`src/pages/interview/InterviewPreCheckPage.tsx`](../src/pages/interview/InterviewPreCheckPage.tsx)
(line 111: `?? "v1"` -> `?? "v2"`).

The selection logic is:

```ts
const urlEngine = new URLSearchParams(window.location.search).get("engine"); // wins if present
const envEngine = (import.meta.env.VITE_INTERVIEW_ENGINE as string | undefined) ?? "v2";
const engine = (urlEngine ?? envEngine).toLowerCase();
const sessionPath = engine === "v2" ? "session-v2" : "session";
```

Precedence: **URL `?engine=` > `VITE_INTERVIEW_ENGINE` env > built-in default (`v2`)**.

## Pre-reqs

- Backend running on `http://localhost:8082` (`uvicorn funnelhq_api.main:app --port 8082 --reload`).
- Frontend dev server on `http://localhost:8080` (`npm run dev`).
- A registered candidate token that gets you to `/candidate-portal/:token`, then to `/interview/:interviewId/pre-check`.
- Browser devtools "Network" tab open to watch the post-`Start interview` navigation.

## Scenario 1 — Unset env var (the new default path)

This is the case that was silently broken in prod before this ticket.

1. In `.env.local`, ensure there is **no** `VITE_INTERVIEW_ENGINE=` line (or comment it out).
2. Stop the dev server. Restart `npm run dev` (Vite reads env at boot — must restart).
3. Walk a candidate from `/candidate/login` -> `/candidate-portal/:token` -> `/interview/:interviewId/pre-check`.
4. Click **Start interview**.
5. **Expected**: URL becomes `/interview/{interviewId}/session-v2`. The v2 WebSocket page mounts (look for `flowdot.v2.sessionId` in sessionStorage; voice WebSocket connects to backend).
6. **Fail**: URL becomes `/interview/{interviewId}/session` (legacy v1). If this happens, the build is still picking up an old `.env` or the edit did not land — verify the file at line 111 reads `?? "v2"`.

## Scenario 2 — Env var forces v1 (emergency rollback)

Use this if v2 is broken in prod and you need every candidate back on v1 immediately.

1. In `.env.local`, set:
   ```
   VITE_INTERVIEW_ENGINE=v1
   ```
2. Restart the dev server (`npm run dev`).
3. Click **Start interview** from the pre-check page.
4. **Expected**: URL becomes `/interview/{interviewId}/session` (legacy v1).
5. **Fail**: URL becomes `/interview/{interviewId}/session-v2`. The env var is not being read — check the `.env.local` file path and that Vite restarted.

## Scenario 3 — URL param overrides env (per-session opt-out)

The URL param wins over both env and default, in either direction.

1. Set `VITE_INTERVIEW_ENGINE=v2` (or leave it unset — both default to v2 now).
2. Restart the dev server.
3. Manually visit the pre-check page with `?engine=v1` appended:
   `http://localhost:8080/interview/{interviewId}/pre-check?engine=v1`
4. Click **Start interview**.
5. **Expected**: URL becomes `/interview/{interviewId}/session` (legacy v1, despite env saying v2).
6. Repeat with `?engine=v2` while `VITE_INTERVIEW_ENGINE=v1` is set — expect `/session-v2`.

## Rollback procedure

If v2 misbehaves in prod after the flip:

- **Per-candidate (no deploy)**: send them a pre-check link with `?engine=v1` appended.
- **Site-wide (no code change, redeploy required)**: in the Vercel project env vars, set `VITE_INTERVIEW_ENGINE=v1` for the Production environment and trigger a new build. All new sessions land on `/session` until the env var is unset or flipped back to `v2`.
- **Code revert**: change line 111 back to `?? "v1"` and redeploy. Last resort — prefer the env-var path so we can flip back to v2 without another deploy.

## Deploy-config audit (recorded 2026-05-23)

Before this ticket, `VITE_INTERVIEW_ENGINE` was **not set in any deploy config** in this repo:

- Not in `.env.example` or `.env.local`.
- Not in `vercel.json` (only API rewrites are configured there; Vercel deploy env vars live in the project dashboard — verify there too before relying on this audit).
- Not in `.github/workflows/ci.yml` (CI build sets only `VITE_API_BASE_URL` / `VITE_FRONTEND_BASE_URL`).
- Not referenced in any `docs/*.md`.

Source-code references are limited to:
- `src/pages/interview/InterviewPreCheckPage.tsx:111` (the read site).
- `src/pages/interview/InterviewSessionV2Page.tsx:9` (a comment in the header docstring).

Implication: until this ticket, every candidate with no URL param landed on v1 by default — which is the silent-P0 cause documented in the architecture review. After the flip, the same "unset" state lands them on v2.

**Action**: confirm the Vercel project dashboard does not currently set `VITE_INTERVIEW_ENGINE=v1`. If it does, unset it (or set it to `v2`) before the next prod deploy — otherwise the prod build will still route candidates to v1.
