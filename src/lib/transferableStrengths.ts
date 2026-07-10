/**
 * P4-5 — transferable-strength normaliser (pure).
 *
 * DATA-SHAPE REALITY (verified against live code, not assumed):
 *   The synthesiser-sourced top-level `transferable_skills[]` DOES reach the
 *   frontend — it is declared on `InterviewResultsData.transferable_skills`
 *   (`src/types/interviewResults.ts`) and arrives on the raw results doc from
 *   GET /api/results/session/{sid}. The stale-premise claim "computed but never
 *   rendered" is TRUE for this array: a repo-wide grep finds only the type
 *   declaration + an unused `any[]` field on CandidateResults — no surface
 *   renders it. (The node-level `transferable_from` string IS already rendered
 *   in TagSidePanel; that is a different, node-attached representation.)
 *
 * ENGINE DEPENDENCE (documented gap):
 *   - v1 (the default reviewer engine) PRODUCES this array.
 *   - v2 sets it to `[]`. So under v2 the band renders nothing — which is the
 *     intended honest behaviour, not a bug.
 *
 * WITHIN-FINANCE CONSTRAINT:
 *   The product's domain mandate is finance-only (Accounting / Taxation /
 *   Management consulting). The v1 reviewer prompt is known to leak non-finance
 *   hobbies (chess, sports) into transferable skills — flagged to backend owners.
 *   This normaliser is the CLIENT-SIDE SAFETY NET, not the authoritative fix: it
 *   drops rows whose source OR target names a clearly non-finance domain so the
 *   band can never surface a cross-domain claim. The real fix belongs in the
 *   reviewer prompt / a backend domain classifier.
 *
 * SCORE HANDLING (evidence contract):
 *   Each row carries an optional `score`, but the frontend type drops `evidence`
 *   and the array carries no confidence / provenance — there is no grounding on
 *   a transferable strength. Per "evidence on every score", the band therefore
 *   NEVER renders the number; the score is used ONLY to order strongest-first.
 *
 * Pure module: no React, no I/O.
 */
import type { TransferableSkill } from "@/types/interviewResults";

/**
 * A normalised, within-finance transferable strength ready for sober display.
 * `score` is retained for ordering only and is never shown as a confident number.
 */
export interface TransferableStrength {
  /** The finance area the candidate already demonstrated strength in. */
  source: string;
  /** The role-relevant finance area that strength likely transfers to. */
  target: string;
  /** Sober relevance note (why it matters for the role); absent when blank. */
  relevance?: string;
  /** Ordering signal only — never rendered as a grounded number. */
  score?: number | null;
}

/**
 * Tokens that mark a source/target as outside the finance mandate. Kept
 * deliberately narrow (hobby / personal-interest leakage the v1 prompt is known
 * to emit) so we do not over-drop legitimate finance terms not on any allow-list.
 * This is a safety net; the authoritative within-finance constraint belongs in
 * the backend.
 */
const NON_FINANCE_TOKENS: readonly string[] = [
  "chess",
  "cricket",
  "football",
  "soccer",
  "basketball",
  "tennis",
  "badminton",
  "hockey",
  "sport",
  "sports",
  "athletics",
  "marathon",
  "running",
  "swimming",
  "cycling",
  "hiking",
  "trekking",
  "gaming",
  "video game",
  "esports",
  "music",
  "guitar",
  "piano",
  "violin",
  "singing",
  "dance",
  "dancing",
  "painting",
  "sketching",
  "photography",
  "cooking",
  "baking",
  "gardening",
  "travel",
  "travelling",
  "traveling",
  "poetry",
  "blogging",
  "vlog",
  "youtube",
  "gym",
  "fitness",
  "yoga",
  "theatre",
  "theater",
  "drama",
];

/** Does a term name a clearly non-finance (hobby / personal) domain? */
function isNonFinance(term: string): boolean {
  const t = term.toLowerCase();
  return NON_FINANCE_TOKENS.some((token) => {
    // Word-boundary-ish match so "gaming" ≠ "engaging" and "sport" ≠ "transport".
    const re = new RegExp(`(^|[^a-z])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
    return re.test(t);
  });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalise the raw synthesiser array into sober, within-finance strengths,
 * strongest-first. Rows that are blank, half-missing, or leak a non-finance
 * domain are dropped. Returns `[]` when there is nothing safe to show, so the
 * band can render nothing (never an empty box).
 */
export function toTransferableStrengths(
  raw: TransferableSkill[] | null | undefined,
): TransferableStrength[] {
  if (!Array.isArray(raw)) return [];

  const normalised: TransferableStrength[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const source = clean(row.source);
    const target = clean(row.skill_demonstrated);
    if (!source || !target) continue;
    if (isNonFinance(source) || isNonFinance(target)) continue;

    const relevance = clean(row.relevance_to_role);
    const score = typeof row.score === "number" ? row.score : null;
    normalised.push({
      source,
      target,
      relevance: relevance || undefined,
      score,
    });
  }

  // Strongest-first; unscored rows sort last. Stable within equal scores.
  return normalised
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const sa = a.s.score ?? -Infinity;
      const sb = b.s.score ?? -Infinity;
      if (sb !== sa) return sb - sa;
      return a.i - b.i;
    })
    .map(({ s }) => s);
}
