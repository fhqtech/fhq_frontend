/**
 * P1-1 — ETA phrasing for long operations (blueprint, practical, reviewer).
 * Takes a seconds estimate (server p50, or a static fallback) and returns a
 * hedged, sentence-case phrase. Never a false-precision live countdown.
 */
export function etaPhrase(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "shortly";
  if (seconds < 60) {
    const rounded = Math.max(10, Math.round(seconds / 10) * 10);
    return `about ${rounded} seconds`;
  }
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "about 1 minute" : `about ${minutes} minutes`;
}
