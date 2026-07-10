/**
 * P4-2 — the node-tap grounding panel (a TAG leaf).
 *
 * When a recruiter taps an L4 skill node, this shows *why* the score can be
 * trusted: the grounding quote, the source stage (which verification step
 * produced it), and the grounding rate. It renders that confident detail ONLY
 * for a node the evidence verifier actually grounded — reusing the P4-1
 * `isGrounded` classifier for the verified/unverified split.
 *
 * ENGINE / BACKEND REALITY (documented, not invented): grounding fields
 * (`confidence`, `provenance`) reach the frontend only under REVIEWER_ENGINE=v2.
 * Under the default v1 engine they are absent, so most live nodes are ungrounded
 * today; this panel then falls back to the calm P4-1 `UnverifiedMark` and shows
 * NO number. Evidence items are also not transcript-anchored (the verifier
 * discards the matched turn index), so there is no per-quote line citation to
 * render — only the free-text finding.
 *
 * Behind the `tag_evidence` flag (default-off): off, or outside any provider, it
 * renders nothing, so node tap behaves exactly as today. This is a NEW leaf and
 * does not touch the sacred graph or side panel — mounting is reported as wiring.
 */
import { ShieldCheck } from "lucide-react";
import { useFlag } from "@/lib/flags/FlagProvider";
import { isGrounded, type EvidenceNode } from "@/lib/nodeEvidence";
import {
  groundingQuote,
  groundingRatePercent,
  sourceStageLabel,
  verifiedCountLabel,
} from "@/lib/nodeProvenance";
import { TAG_PALETTE, TAG_RADII, TAG_TYPE } from "./constants";
import { UnverifiedMark } from "./UnverifiedMark";

/** The trust-bearing subset a tapped node carries, plus its display label. */
export interface ProvenanceNode extends EvidenceNode {
  label?: string | null;
}

export interface NodeProvenancePanelProps {
  node: ProvenanceNode | null | undefined;
  className?: string;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4
      style={{
        margin: 0,
        marginBottom: 8,
        fontFamily: TAG_TYPE.mono,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: TAG_PALETTE.muted2,
      }}
    >
      {children}
    </h4>
  );
}

function MetaRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
      <dt
        style={{
          fontFamily: TAG_TYPE.mono,
          fontSize: 11,
          color: TAG_PALETTE.muted2,
          minWidth: 96,
        }}
      >
        {term}
      </dt>
      <dd style={{ margin: 0, fontFamily: TAG_TYPE.sans, fontSize: 13, color: TAG_PALETTE.ink }}>
        {children}
      </dd>
    </div>
  );
}

export function NodeProvenancePanel({ node, className }: NodeProvenancePanelProps) {
  const on = useFlag("tag_evidence");
  if (!on || !node) return null;

  // Ungrounded (v1 default, or a node the verifier could not match) → the calm
  // P4-1 marker, never a confident number.
  if (!isGrounded(node)) {
    return (
      <section className={className} aria-label="Grounding">
        <SectionTitle>Grounding</SectionTitle>
        <UnverifiedMark reason="This score is a model assessment. It was not checked against the interview transcript." />
      </section>
    );
  }

  const quote = groundingQuote(node);
  const stage = sourceStageLabel(node);
  const rate = groundingRatePercent(node);
  const count = verifiedCountLabel(node);

  return (
    <section
      className={className}
      role="group"
      aria-label="Grounding"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <SectionTitle>Grounding</SectionTitle>

      {quote && (
        <blockquote
          style={{
            margin: 0,
            padding: "10px 14px",
            borderLeft: `2px solid ${TAG_PALETTE.gold}`,
            borderRadius: TAG_RADII.sm,
            background: TAG_PALETTE.paper3,
            fontFamily: TAG_TYPE.serif,
            fontSize: 14,
            lineHeight: 1.5,
            color: TAG_PALETTE.ink,
          }}
        >
          {quote}
        </blockquote>
      )}

      <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {stage && <MetaRow term="Source">{stage}</MetaRow>}
        {rate !== null && (
          <MetaRow term="Grounding rate">
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 6,
                fontFamily: TAG_TYPE.mono,
                fontVariantNumeric: "tabular-nums",
                color: TAG_PALETTE.green,
                fontWeight: 500,
              }}
            >
              <ShieldCheck
                size={14}
                aria-hidden="true"
                style={{ alignSelf: "center", color: TAG_PALETTE.green }}
              />
              {rate}%
            </span>
            {count && (
              <span style={{ color: TAG_PALETTE.muted, marginLeft: 8 }}>· {count}</span>
            )}
          </MetaRow>
        )}
      </dl>
    </section>
  );
}

export default NodeProvenancePanel;
