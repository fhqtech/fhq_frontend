/**
 * P4-1 — the evidence-contract token.
 *
 * When a TAG node's score is ungrounded (see lib/nodeEvidence.isUnverifiedScore),
 * the TAG renders this muted marker in place of the confident number. The whole
 * product promise is "evidence on every score" — so a score with no verified
 * grounding is shown honestly as `unverified`, never as a confident figure.
 *
 * Presentational only: it takes no score and can never render a number. Tone is
 * calm and factual (it states the absence of evidence, it does not accuse).
 * Tokens are the shared TAG palette/type so it sits inside the side panel with
 * no isolated colours.
 */
import { CircleDashed } from "lucide-react";
import { TAG_PALETTE, TAG_RADII, TAG_TYPE } from "./constants";

export interface UnverifiedMarkProps {
  /** Short, factual reason shown under the label. Sentence case. */
  reason?: string;
  className?: string;
}

export function UnverifiedMark({
  reason = "No grounding evidence for this score.",
  className,
}: UnverifiedMarkProps) {
  return (
    <div
      role="status"
      aria-label={`Unverified. ${reason}`}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 14px",
        borderRadius: TAG_RADII.md,
        background: TAG_PALETTE.paper3,
        border: `1px solid ${TAG_PALETTE.rule}`,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: TAG_PALETTE.muted,
          fontFamily: TAG_TYPE.sans,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <CircleDashed size={14} aria-hidden="true" />
        Unverified
      </span>
      <span
        style={{
          color: TAG_PALETTE.muted2,
          fontFamily: TAG_TYPE.mono,
          fontSize: 11,
          letterSpacing: "0.01em",
        }}
      >
        {reason}
      </span>
    </div>
  );
}

export default UnverifiedMark;
