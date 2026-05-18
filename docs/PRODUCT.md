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
