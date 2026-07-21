/**
 * Rank a shortlist by fit.
 *
 * Shortlist rows now carry an evaluation score (overall_score from the
 * interview result, added backend-side in B05.1). Surface it and order the
 * list best-first so the shortlist reads as a ranked decision artifact rather
 * than an arbitrary bag of contacts.
 */
export interface RankableCandidate {
  scores?: { overall?: number };
  overall_score?: number;
}

/** The fit score for a shortlist row: nested scores.overall, else the flat
 * overall_score carried on enriched shortlist rows, else 0. */
export function shortlistScore(c: RankableCandidate): number {
  const nested = c?.scores?.overall;
  if (typeof nested === "number" && nested > 0) return nested;
  if (typeof c?.overall_score === "number") return c.overall_score;
  return 0;
}

/** Return a fit-ordered (best first) copy — never mutates the input. */
export function rankByFit<T extends RankableCandidate>(items: T[]): T[] {
  return [...items].sort((a, b) => shortlistScore(b) - shortlistScore(a));
}
