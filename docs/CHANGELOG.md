# Frontend changelog

Shipped/completed work, newest-first. Each entry links to the preserved original in [archive/](archive/). Living source-of-truth docs (PRODUCT, DESIGN, RECRUITER_FLOW) stay at the [docs/](.) top level — see [README.md](README.md).

### S3.1 — Bulk invite
CSV/TSV paste + file-upload tab in AddCandidatesModal (P0-5). Hand-rolled parser (no new deps), per-row validation, caps at 512 KB / 2000 rows; single POST to the existing invite endpoint.
→ [archive/S3_1_BULK_INVITE.md](archive/S3_1_BULK_INVITE.md)

### F2C — Stale session TTL
sessionStorage TTL guard for the v2 interview page; wipes stale session after 30 min and shows a "session expired" toast instead of failing the WS reconnect.
→ [archive/F2C_STALE_SESSION_TTL.md](archive/F2C_STALE_SESSION_TTL.md)

### Engine flip smoke
Manual verification for the default interview-engine flip from v1 → v2 (URL ?engine > VITE_INTERVIEW_ENGINE > default v2), incl. rollback and deploy-config audit.
→ [archive/ENGINE_FLIP_SMOKE.md](archive/ENGINE_FLIP_SMOKE.md)

### Analytics
Analytics module shipped: lists dashboard + list-detail views, routes, navigation, chart styling. Backed by backend analytics routes (Phase 5).
→ [archive/ANALYTICS_IMPLEMENTATION.md](archive/ANALYTICS_IMPLEMENTATION.md)

### Step navigation
Direct step navigation via URL params (`?step=N`, `?source=TYPE`) with validation, error handling, and auto-source selection.
→ [archive/STEP_NAVIGATION_FEATURE.md](archive/STEP_NAVIGATION_FEATURE.md)

### Phase 1 — conversation history + video timing
Conversation history with video timing: VideoTiming types, VideoTimingManager utility. Fully implemented and tested (Sep 2025).
→ [archive/PHASE_1_IMPLEMENTATION.md](archive/PHASE_1_IMPLEMENTATION.md)
