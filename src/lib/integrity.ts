/**
 * P4-4 — integrity-note shape + copy guardrails (pure, no React, no I/O).
 *
 * The product's integrity surface is calm, evidence-backed and contestable. It
 * flags an answer that "needs a closer look", cites the exact transcript turn,
 * and lets the recruiter mark it as fair. It is NEVER a verdict and NEVER
 * accusatory — hence the `isAccusatory` guardrail that both the component and
 * its tests hold the copy to.
 *
 * DATA-SHAPE GAP (documented, NOT invented — verified against the reviewer scout):
 *   No reviewer engine persists a per-turn integrity flag today.
 *     - v1 (the DEFAULT engine) has no integrity concept at all.
 *     - v2's meta-analyzer emits cross-answer findings
 *       (repeated_narrative_arc / paste_suspected / fabrication_suspected /
 *       flagged_skill_names, see reviewer_v2/meta_analyzer.py) but the
 *       tag_synthesiser FOLDS them into free-text `gaps[]` and the top-level
 *       `summary` string — it never persists a structured, turn-cited flag. The
 *       cheat-penalty path caps a score and drops the turn index entirely
 *       (`cheat_flags_by_skill` is skill_id -> max_score, no turn).
 *   The nearest structured shape in the system is the assessment artifact's
 *   `Evidence.integrity_flags` item
 *   ({canonical_id, skill_name, artifact_value, defense_value, note}) — but it
 *   too carries NO turn reference and lives on a different surface.
 *
 * So `IntegrityFlag` below is the typed shape this component renders AGAINST; it
 * does not yet flow from the results payload. `turn` is required by the product
 * copy mandate ("cite the specific turn") even though no engine emits it, which
 * means IntegrityNote should only be mounted once a backend actually supplies
 * turn-cited flags. Until then the surface is dark by construction (see the
 * component's flag gate and the wiring note).
 */

/**
 * A single turn-cited integrity observation. Mirrors the reusable fields of the
 * backend artifact `integrity_flags` item, plus the `turn` + `quote` the copy
 * mandate requires (both a documented gap in the current payload).
 */
export interface IntegrityFlag {
  /**
   * 1-indexed transcript turn the observation points at.
   * HARD GAP: no reviewer engine persists this today — supply it only when the
   * backend can cite a real turn.
   */
  turn: number;
  /** The candidate's exact words from that turn — the cited evidence. */
  quote: string;
  /** Skill/topic the observation touches (nearest reusable field from the artifact shape). */
  skillName?: string;
  /** Canonical skill id, when known. */
  canonicalId?: string;
  /** Calm, factual reason this turn warrants review. Never a verdict, never accusatory. */
  note?: string;
}

/**
 * Words this surface must NEVER use. The framing is "needs a closer look", not
 * an accusation. The component holds its own copy to this list, and the tests
 * assert the rendered chrome contains none of these terms. Kept as substrings so
 * inflections ("cheating", "fabricated") are caught too.
 */
export const ACCUSATORY_TERMS = [
  "cheat",
  "fraud",
  "fake",
  "lied",
  "lying",
  "dishonest",
  "guilty",
  "plagiar",
  "stole",
  "fabricat",
  "suspect",
] as const;

/** True if `text` contains any banned accusatory term (case-insensitive). */
export function isAccusatory(text: string): boolean {
  const t = text.toLowerCase();
  return ACCUSATORY_TERMS.some((term) => t.includes(term));
}

/** Human, sentence-case reference to the cited turn, e.g. "Turn 7". */
export function citeTurn(flag: Pick<IntegrityFlag, "turn">): string {
  return `Turn ${flag.turn}`;
}
