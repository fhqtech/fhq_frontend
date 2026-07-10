/**
 * P4-2 — the "why you can trust this" disclosure (a TAG leaf).
 *
 * A calm, contestable explainer that sits under a tapped node and states, in
 * plain English, how the score was grounded: the evidence verifier matched each
 * finding back to the interview transcript, at a stated grounding rate. It reuses
 * the P4-1 `isGrounded` classifier for the verified/unverified split.
 *
 * BACKEND GAP (documented, not invented): the richer per-session "why trust this"
 * rationale (`GET /api/results/session/{sid}/rationale`, plus the meta-analyzer
 * integrity findings) is NOT wired into the frontend and is empty under the
 * default v1 engine. So this expander is scoped to what the tapped node actually
 * carries — the evidence-verifier provenance. Under v1 those fields are absent,
 * and it degrades to a graceful "evidence not available" state that names the gap
 * honestly (a model assessment, not verified against the transcript). It never
 * manufactures a grounding number and never accuses anyone.
 *
 * Behind the `tag_evidence` flag (default-off): off, or outside any provider, it
 * renders nothing so node tap behaves as today. NEW leaf — mounting is reported
 * as wiring, no sacred/shared file is touched.
 */
import { ChevronRight } from "lucide-react";
import { useFlag } from "@/lib/flags/FlagProvider";
import { isGrounded, type EvidenceNode } from "@/lib/nodeEvidence";
import { groundingRatePercent, sourceStageLabel, verifiedCountLabel } from "@/lib/nodeProvenance";
import { TAG_PALETTE, TAG_RADII, TAG_TYPE } from "./constants";

export interface TrustExpanderProps {
  node: EvidenceNode | null | undefined;
  className?: string;
}

export function TrustExpander({ node, className }: TrustExpanderProps) {
  const on = useFlag("tag_evidence");
  if (!on || !node) return null;

  const grounded = isGrounded(node);
  const stage = sourceStageLabel(node) ?? "evidence verifier";
  const rate = groundingRatePercent(node);
  const count = verifiedCountLabel(node);

  return (
    <details
      className={className}
      style={{
        borderRadius: TAG_RADII.md,
        border: `1px solid ${TAG_PALETTE.rule}`,
        background: TAG_PALETTE.paper3,
        padding: "10px 14px",
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          listStyle: "none",
          fontFamily: TAG_TYPE.sans,
          fontSize: 13,
          fontWeight: 500,
          color: TAG_PALETTE.ink,
        }}
      >
        <ChevronRight size={14} aria-hidden="true" style={{ color: TAG_PALETTE.muted }} />
        Why you can trust this
      </summary>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontFamily: TAG_TYPE.sans,
          fontSize: 13,
          lineHeight: 1.55,
          color: TAG_PALETTE.muted,
        }}
      >
        {grounded ? (
          <>
            <p style={{ margin: 0, color: TAG_PALETTE.ink }}>
              Each finding shown here was matched back to the interview transcript by the{" "}
              {stage}.{count ? ` ${count}.` : ""}
            </p>
            {rate !== null && (
              <p style={{ margin: 0 }}>
                Grounding rate:{" "}
                <span
                  style={{
                    fontFamily: TAG_TYPE.mono,
                    fontVariantNumeric: "tabular-nums",
                    color: TAG_PALETTE.green,
                    fontWeight: 500,
                  }}
                >
                  {rate}%
                </span>
                . You can open any finding to read the exact wording.
              </p>
            )}
          </>
        ) : (
          <>
            <p style={{ margin: 0, color: TAG_PALETTE.ink }}>
              This score is a model assessment. Its findings were not checked against the
              interview transcript, so there is no grounding to show here yet.
            </p>
            <p style={{ margin: 0, color: TAG_PALETTE.muted2, fontFamily: TAG_TYPE.mono, fontSize: 11 }}>
              Evidence not available — the reviewer did not run the evidence verifier on this
              interview.
            </p>
          </>
        )}
      </div>
    </details>
  );
}

export default TrustExpander;
