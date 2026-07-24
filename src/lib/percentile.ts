/**
 * percentile — rank a candidate's score against a cohort, honestly.
 *
 * The only comparable, densely-populated signal we have workspace-side is the
 * AI interview score, and the only segment we can form from it is interview_type
 * (there is no role/level field). So the cohort is "your candidates of the same
 * round", not a role- or workspace-wide norm — callers must label it that way.
 * Below MIN_COHORT comparable scores we refuse to rank rather than invent a
 * percentile from a handful of people.
 *
 * Pure + framework-free so it unit-tests without React or any backend.
 */
export const MIN_COHORT = 8;

export type PercentileResult =
  | { status: "ok"; percentile: number; n: number }
  | { status: "insufficient"; n: number };

/**
 * Percentile rank of `value` within `cohort` using the mid-rank convention:
 * (below + 0.5*equal) / n * 100, rounded. Caller guarantees a non-empty cohort
 * (already cleaned of nulls and of the candidate's own row).
 */
export function percentileRank(value: number, cohort: number[]): number {
  const n = cohort.length;
  let below = 0;
  let equal = 0;
  for (const c of cohort) {
    if (c < value) below++;
    else if (c === value) equal++;
  }
  return Math.round(((below + 0.5 * equal) / n) * 100);
}

/**
 * Clean `cohort` (drop null/undefined/NaN) and rank `value` in it. Returns
 * `insufficient` when `value` is missing or fewer than `min` comparable scores
 * remain — never a fabricated percentile from a thin sample.
 */
export function cohortPercentile(
  value: number | null | undefined,
  cohort: Array<number | null | undefined>,
  min = MIN_COHORT,
): PercentileResult {
  const clean = cohort.filter((c): c is number => typeof c === "number" && !Number.isNaN(c));
  if (value == null || Number.isNaN(value) || clean.length < min) {
    return { status: "insufficient", n: clean.length };
  }
  return { status: "ok", percentile: percentileRank(value, clean), n: clean.length };
}

/** "72nd" / "1st" / "23rd" — ordinal suffix for display. */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
