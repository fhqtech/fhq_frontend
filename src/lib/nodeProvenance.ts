/**
 * P4-2 — provenance formatters (pure).
 *
 * The node-tap grounding panel must show three things for a *grounded* skill:
 * the grounding quote, the source stage, and the grounding rate. These helpers
 * derive each from the backend `GraphNode.provenance` / `confidence` fields —
 * the evidence-verifier output that reaches the frontend only under
 * REVIEWER_ENGINE=v2 (see nodeEvidence.ts for the full engine reality).
 *
 * BACKEND GAP (documented, not invented): under the default v1 engine none of
 * these fields exist on the payload, so every helper here degrades to `null`.
 * The panel reads that null as "grounding not available" and falls back to the
 * P4-1 `unverified` state — it must never manufacture a number. The evidence
 * items are also NOT transcript-anchored (the verifier discards the matched turn
 * index), so there is no per-quote line citation to format here.
 *
 * Pure module: no React, no I/O. `EvidenceNode` is the minimal structural shape;
 * a `TagNode` is assignable to it, so callers can pass a node directly.
 */
import type { EvidenceNode } from "./nodeEvidence";

/**
 * The first non-blank evidence quote to surface under a grounded score, trimmed
 * for display. `null` when the node carries no usable quote.
 */
export function groundingQuote(node: EvidenceNode | null | undefined): string | null {
  const ev = node?.evidence;
  if (!Array.isArray(ev)) return null;
  const first = ev.find((q) => typeof q === "string" && q.trim().length > 0);
  return first ? first.trim() : null;
}

/**
 * Grounding rate as a whole-number percentage in [0,100], from
 * `provenance.grounding_rate` (preferred) or `confidence`. Both are [0,1] on the
 * wire. `null` when there is no machine grounding signal (the v1 default) — the
 * caller must then render `unverified`, never a fabricated number.
 */
export function groundingRatePercent(node: EvidenceNode | null | undefined): number | null {
  const rate = node?.provenance?.grounding_rate ?? node?.confidence ?? null;
  if (typeof rate !== "number" || Number.isNaN(rate)) return null;
  const clamped = Math.max(0, Math.min(1, rate));
  return Math.round(clamped * 100);
}

/**
 * "3 of 3 findings verified" — from the verifier's persisted counts. `null` when
 * the counts are absent (no provenance, or v1).
 */
export function verifiedCountLabel(node: EvidenceNode | null | undefined): string | null {
  const prov = node?.provenance;
  if (!prov) return null;
  const verified = prov.evidence_verified;
  const total = prov.evidence_total;
  if (typeof verified !== "number" || typeof total !== "number") return null;
  const noun = total === 1 ? "finding" : "findings";
  return `${verified} of ${total} ${noun} verified`;
}

/**
 * Plain-English, sentence-case label for the verification stage that produced
 * the grounding, from `provenance.method`. The known method shape is
 * "evidence_verifier:substring+fuzzy@0.85"; unrecognised methods are surfaced
 * verbatim rather than relabelled. `null` when no method is present (v1).
 */
export function sourceStageLabel(node: EvidenceNode | null | undefined): string | null {
  const method = node?.provenance?.method;
  if (typeof method !== "string" || method.trim().length === 0) return null;
  if (method.startsWith("evidence_verifier")) {
    return "Evidence verifier (transcript match)";
  }
  return method;
}
