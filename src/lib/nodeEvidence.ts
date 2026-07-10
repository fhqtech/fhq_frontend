/**
 * P4-1 — the TAG evidence contract (pure classifier).
 *
 * Product pitch: "evidence on every score". A TAG node's score may render as a
 * confident number ONLY when it is *grounded* — the reviewer emitted a machine
 * grounding signal (confidence / provenance) AND at least one non-blank piece
 * of evidence to show. Anything else is `unverified`, and the UI must render a
 * muted "unverified" label instead of the number (see UnverifiedMark).
 *
 * Engine reality (authoritative, from the reviewer scout):
 *   - The default reviewer engine (REVIEWER_ENGINE=v1) emits neither `confidence`
 *     nor `provenance`; it only produces free-text findings. So a v1 node is
 *     `unverified` even when it carries evidence text — its score is a model
 *     assertion, not verified evidence.
 *   - The v2 engine runs an evidence_verifier and stamps `confidence`
 *     (== grounding_rate) and `provenance` onto each node. Those verifier-checked
 *     nodes, when they also carry evidence, are `verified`.
 *
 * These fields are OPTIONAL on the wire and ABSENT under the default engine, so
 * every accessor here is defensive. This module is pure: no React, no I/O.
 *
 * NOTE ON TYPING: `TagNode` (components/tag/types.ts) does not yet declare
 * `confidence` / `provenance`; they ride through the result adapter as untyped
 * extra keys at runtime. `EvidenceNode` below is the minimal structural shape the
 * contract reads, and `TagNode` is structurally assignable to it, so callers can
 * pass a `TagNode` directly. When the tag_evidence panel (P4-2) needs to render
 * grounding, extend `TagNode` with these optional fields — see sharedWiring.
 */

/** Mirror of the backend `GraphNode.provenance` dict (v2 only). */
export interface NodeGrounding {
  /** Fraction of evidence items verified against the transcript, [0,1]. */
  grounding_rate?: number | null;
  /** Count of evidence items matched to the transcript. */
  evidence_verified?: number | null;
  /** Total evidence items considered. */
  evidence_total?: number | null;
  /** e.g. "evidence_verifier:substring+fuzzy@0.85". */
  method?: string | null;
  /** True when the skill was re-scored after a low-grounding retry. */
  retried?: boolean;
}

/**
 * The trust-bearing subset of a TAG node the evidence contract reads. All
 * fields optional — under the default v1 engine `confidence` and `provenance`
 * are absent entirely.
 */
export interface EvidenceNode {
  score?: number | null;
  evidence?: string[] | null;
  /** v2 only; == grounding_rate. Absent under the default engine. */
  confidence?: number | null;
  /** v2 only. Absent under the default engine. */
  provenance?: NodeGrounding | null;
}

export type NodeEvidenceState = "verified" | "unverified";

/** True when the node carries at least one non-blank evidence quote to show. */
function hasEvidenceQuotes(node: EvidenceNode): boolean {
  const ev = node.evidence;
  return Array.isArray(ev) && ev.some((q) => typeof q === "string" && q.trim().length > 0);
}

/**
 * True when a node's score is backed by verified grounding evidence.
 *
 * Requires BOTH:
 *   1. a machine grounding signal (`confidence` or `provenance`) that is not an
 *      explicit zero — this is absent under the default v1 engine, so v1 nodes
 *      are never grounded; and
 *   2. at least one non-blank evidence quote to display.
 */
export function isGrounded(node: EvidenceNode | null | undefined): boolean {
  if (!node) return false;

  const conf = node.confidence ?? null;
  const prov = node.provenance ?? null;

  // No machine grounding signal at all → ungrounded (the default v1 engine).
  if (conf === null && prov === null) return false;

  // A provenance signal that explicitly verified zero items → ungrounded, even
  // if free-text evidence is present (the verifier rejected it).
  if (prov && typeof prov.evidence_verified === "number" && prov.evidence_verified <= 0) {
    return false;
  }

  // Confidence is the only signal and it is zero → ungrounded.
  if (prov === null && conf !== null && conf <= 0) return false;

  // Grounded only if there is actual evidence to show under the score.
  return hasEvidenceQuotes(node);
}

/**
 * Classify a node/skill purely on evidence grounding, independent of whether a
 * score is present. `verified` = has grounding evidence; `unverified` = not.
 */
export function classifyNodeEvidence(node: EvidenceNode | null | undefined): NodeEvidenceState {
  return isGrounded(node) ? "verified" : "unverified";
}

/**
 * The predicate the TAG uses to decide whether to swap a confident number for a
 * muted `unverified` label: true when a numeric score exists but is ungrounded.
 * When there is no numeric score there is nothing to intercept, so this is false.
 */
export function isUnverifiedScore(node: EvidenceNode | null | undefined): boolean {
  return typeof node?.score === "number" && !isGrounded(node);
}
