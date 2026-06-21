# F-2c — Stale sessionStorage TTL guard

## Bug

The v2 interview page (`InterviewSessionV2Page.tsx`) restores `sessionId` and `candidateToken` from `sessionStorage` on mount so a hard refresh recovers the same session. But the keys live forever — if the backend restarts, or the candidate pauses 30+ min between pre-check and start, the page happily resumes a session the backend no longer knows about. The WS reconnect then fails in a confusing loop. Hit live twice in a single interview test.

## Fix

A 4th sessionStorage key `flowdot.v2.sessionStartedAt` is stamped with `Date.now()` every time the existing 3 session keys are written. On mount, a `useState` initializer reads the timestamp; if it's older than `STALE_SESSION_TTL_MS` (30 min), it wipes all 4 keys synchronously. A follow-up `useEffect` fires a muted "Session expired" toast and navigates back to `/interview/:interviewId/pre-check`. The keys are also cleared on `onInterviewEnded` and `handleEndEarly` alongside the existing cleanups.

## Why 30 min

Matches the maximum interview budget defined in the Sprint 0 blueprint schema. Any session older than that is structurally impossible to resume — the backend won't have state for it.

## Manual test

1. Start an interview and let `flowdot.v2.sessionStartedAt` populate.
2. Open DevTools → Application → Session Storage.
3. Edit `flowdot.v2.sessionStartedAt` to `Date.now() - 31*60*1000` (paste the literal computed number).
4. Reload `/interview/:interviewId/session-v2`.
5. Expect: immediate redirect to `/interview/:interviewId/pre-check` + "Session expired" toast. No WS reconnect attempted.
