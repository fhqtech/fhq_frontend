# PRODUCT — FlowDot AI

register: product

## Product purpose

FlowDot AI is a finance-hiring decision platform for India. Workspace operators set up Roles, run AI-driven Screening + Fitment interviews against finance domains (Accounting, Taxation, Management Consulting), then read the **Talent Analysis Graph (TAG)** — a radial skill graph with proficiency tiers (L1–L5) — to make hire decisions with depth, not vibes.

Replaces the resume + spreadsheet + 30-minute screening call loop.

## Users

**Workspace operators** (primary): finance hiring managers at CA firms, mid-sized consulting practices, and BFSI in-house talent teams. Bengaluru / Mumbai / NCR. Senior — 8–20 years experience hiring Tax Assistants, CA Inters, MBA Finance, Audit Associates. Spreadsheet-fluent. Read PDF résumés. Distrust generic SaaS that doesn't speak finance.

**Applicants** (secondary): CA Inter / CA Final candidates, MBA Finance grads, Tax Assistants, articleship completers. 22–32 years old. India. Mobile-first when checking invitations, desktop for taking interviews. Anxious about AI scoring. Need clarity on what's being evaluated and why.

## Tone

Confident, sober, **finance-trust**. Razorpay / Zerodha tier — explains its work, doesn't perform. Indian English. Sentence case. No marketing slang ("seamless", "next-gen", "unleash", "elevate", "revolutionary"). No emoji in product UI. Numbers carry weight; show the methodology.

## Anti-references

- LinkedIn Recruiter — bloated, generic, every screen identical
- Naukri — heavy noise, ad-driven, low signal density
- Workday-tier enterprise HR — opaque, slow, designed for procurement not for the actual hiring manager
- Generic AI hiring tools that paste GPT prose into a "candidate summary"

## Strategic principles

1. **The Talent Analysis Graph is the marquee artifact.** Every other surface exists to produce or consume it. Name + visual identity are fixed; never rename.
2. **Three domains only**: Accounting, Taxation, Management Consulting. We're deep, not wide.
3. **Region: asia-south1 (Mumbai)** for data residency. DPDP-compliant by construction (consent, retention, right-of-erasure in-app).
4. **Workspace and applicant are separate worlds.** Their auth, surfaces, and language never bleed into each other.
5. **Sentence case everywhere user-facing.** The only uppercase pattern allowed is the mono editorial kicker (`font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink`) used as a section eyebrow.
6. **Backend symbols are stable.** Field names, Firestore collection IDs, code identifiers don't change for visual reasons. Only user-visible strings shift.
7. **No dark mode.** Single light theme, finance-trust palette.
8. **Restraint over flourish.** Information density is high; visual noise is low. Numbers in `font-mono tabular-nums`. Status pills, not freeform color.

## What we don't do

- Generic ATS / pipeline mgmt — we're decision support, not workflow.
- Domain expansion outside finance.
- Mobile-app-first design (responsive, but desktop-primary for workspace).
- Scoring opacity — every TAG node shows evidence + proficiency rationale.

---

> Everything above this line is the fixed strategic core — slow-moving constraints. Everything below is a mutable snapshot and an open brainstorm surface. Any new feature idea must pass the constraints above; the material below is context to riff against, not commitments. See `RECRUITER_FLOW.md` for source detail.

## Current state (snapshot 2026-06)

Pilot-ready on flowdot.in. Target load is ~10 concurrent peak (about 1000 interviews/week over working hours), quality-first — per-interview reliability is the moat, not raw throughput. Backend is a FastAPI gateway (~70% migrated) running the strangler pattern over legacy Flask via `a2wsgi`; native FastAPI routes win, Flask serves the rest, frontend URLs are unchanged. Data in Firestore (`asia-south1`). AI stack: Vertex / Gemini for the interview and reviewer agents, AssemblyAI for streaming STT, Cartesia for TTS. These are facts of the moment and will change — unlike the principles above.

## How it works today (the two journeys)

The product collapses into three mental models the rest of the UI serves: **interview status** (recruiter-owned state), **per-candidate status** (where each candidate sits in that interview's funnel), and the **recruiter next-best-action** (NBA, computed from the two).

**Recruiter** — sign in (Google OAuth) → create an interview (Screening or Fitment, two-step wizard; AI auto-fills the description) → AI generates the blueprint as a background task (~10–20s) → start the interview and invite candidates (invitation rows fan out at create, emails go out at start) → monitor live (pause / resume / stop; NBA refreshes over SSE) → review the Talent Analysis Graph (TAG), transcript, and score → shortlist or reject.

**Candidate** — receive invite email → accept invitation → register or log in (resume is parsed and the profile pre-filled) → open the candidate portal → mic + speaker pre-check (audio-only; no camera) → take the ~10–25 min live AI interview (each turn persisted immediately, so a browser crash mid-interview survives) → submit or time out → see a limited results view. Mobile-first when checking invitations, desktop for the interview itself.

## What's solid vs what's weak (as of the launch-readiness review)

A snapshot of reliability, not a fix list — use it so brainstormed features don't assume broken things already work.

**Solid:** voice pipeline architecture (idle watchdog, barge-in handling, pause tolerance); the TAG artifact and its radial visual; workspace-isolation gating on every handler; per-turn conversation persistence to Firestore; DPDP rights surfaces and consent capture.

**Weak / known gaps:** WebSocket disconnect can orphan a session with no TAG; the evidence-verified reviewer v2 (the "evidence on every score" pitch) is off by default in production; STT has no Indian-finance vocabulary boost, so lakh / crore / GSTR-2B / section 194Q mishear; resume prompt-injection is undefended; there is no bulk invite, no result filtering or CSV export, no AI-service outage alerts, and no reviewer regression / eval suite.

## Feature whitespace (brainstorm surface)

Directions to riff against, grouped — not a committed roadmap. Both axes: deepen the moat, and unblock the daily loop.

- **Deepen the TAG (core moat).** Evidence drill-downs per node, proficiency-tier (L1–L5) calibration views, candidate-to-candidate comparison across one role, longitudinal skill growth across a candidate's interviews, deeper domain coverage *within* the three finance domains.
- **Unblock the recruiter daily loop (consolidation).** Bulk invite (CSV paste / upload), score and recommendation filtering, CSV / export of results, shortlist workflows, service-status and alerting surfaces.
- **Trust and methodology.** "Show the methodology" explainers, cheat-signal transparency, evidence provenance (what the candidate actually said vs. paraphrase), rubric and calibration explainers.
- **Candidate-side experience.** Clarity on what is being evaluated and why, anxiety reduction before and during the interview, resume-to-interview continuity, more transparency in the allowed results view.
- **Greenfield bets (test against the strategic principles first).** Async / take-home interview modes, panel or multi-interviewer setups, benchmark cohorts, recruiter collaboration. Each must hold the line on: three finance domains only, finance-trust tone, workspace and applicant kept as separate worlds, decision support rather than ATS / pipeline management.

## How to use this doc for brainstorming

The sections above the first horizontal rule are fixed constraints — any idea has to pass them. The sections below it are a mutable snapshot plus open surface. When proposing a feature, name which strategic principle(s) it respects or strains, and whether it deepens the TAG, unblocks the daily loop, or is a greenfield bet.
