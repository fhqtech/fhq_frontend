/**
 * TAG side panel — slides in from the right when a node is selected.
 *
 * Visual language ported from funnelhq.co/tag.html:
 *   - Status pill at top (color matches node status)
 *   - Serif 32px title
 *   - Level text muted, then a 100-pt progress bar (results mode)
 *   - Sectioned blocks: Evidence list, Quote with gold left-border,
 *     Required-vs-Demonstrated tier comparison (when blueprint data present)
 */
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TAG_PALETTE,
  TAG_TYPE,
  type TagStatus,
} from "./constants";
import { useState } from "react";
import type { TagMode, TagNode } from "./types";
import { nodeStatus } from "./adapters";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ScoreOverrideModal } from "./ScoreOverrideModal";
import { useFlag } from "@/lib/flags/FlagProvider";
import { isUnverifiedScore } from "@/lib/nodeEvidence";
import { UnverifiedMark } from "./UnverifiedMark";
import { NodeProvenancePanel } from "./NodeProvenancePanel";
import { TrustExpander } from "./TrustExpander";

interface TagSidePanelProps {
  node: TagNode | null;
  mode: TagMode;
  onClose?: () => void;
  /** A4: when present (recruiter result view), enables per-skill override. */
  sessionId?: string;
  onOverridden?: () => void;
}

const tierName = (level: number | undefined | null) => {
  if (!level) return null;
  return ["Foundational", "Working", "Solid", "Advanced", "Expert"][level - 1];
};

export function TagSidePanel({ node, mode, sessionId, onOverridden }: TagSidePanelProps) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  // P4-1 — the evidence contract (default-off). Hook stays above the early
  // return so hook order is stable.
  const evidenceContract = useFlag("evidence_contract");
  if (!node) {
    return (
      <div className="tag-panel-empty">
        <p
          style={{
            fontFamily: TAG_TYPE.mono,
            fontSize: 11,
            color: TAG_PALETTE.muted2,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Click any node for evidence
        </p>
      </div>
    );
  }

  const status: TagStatus = nodeStatus(node);
  const styleSet = STATUS_STYLES[status];
  const showScore = mode === "result" && typeof node.score === "number";
  // P4-1 — a score with no grounding evidence renders as unverified, never a number.
  const scoreUnverified = evidenceContract && isUnverifiedScore(node);
  const labelStatus =
    status === "role_center" ? "Role" : STATUS_LABELS[status];

  return (
    <div className="tag-panel-inner">
      <div className="tag-panel-head">
        <span
          className="tag-panel-tag"
          style={{
            background: styleSet.tint,
            color: styleSet.text,
            fontFamily: TAG_TYPE.mono,
          }}
        >
          {labelStatus}
        </span>
      </div>

      <div className="tag-panel-scroll">
        <p
          className="tag-panel-sub"
          style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
        >
          {node.is_core ? "Core skill" : node.type === "transferable" ? "Transferable" : "Skill"}
        </p>
        <h2
          className="tag-panel-title"
          style={{ fontFamily: TAG_TYPE.serif, color: TAG_PALETTE.ink }}
        >
          {node.label}
        </h2>
        {node.level_text && (
          <p
            className="tag-panel-level"
            style={{ color: TAG_PALETTE.muted, fontFamily: TAG_TYPE.sans }}
          >
            {node.level_text}
          </p>
        )}

        {showScore && scoreUnverified && <UnverifiedMark />}

        {showScore && !scoreUnverified && (
          <div
            className="tag-panel-score"
            style={{ background: TAG_PALETTE.paper3 }}
          >
            <div className="tag-score-track">
              <div
                className="tag-score-fill"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(100, node.score!)) / 100})`,
                  background: styleSet.stroke,
                }}
              />
            </div>
            <div className="tag-score-meta">
              <span
                className="tag-score-num"
                style={{ fontFamily: TAG_TYPE.serif, color: TAG_PALETTE.ink }}
              >
                {/* F24.4: count-up reveal so the score lands as a moment, not just text. */}
                <AnimatedCounter value={node.score!} duration={500} />
                <span
                  className="tag-score-max"
                  style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
                >
                  /100
                </span>
              </span>
              <span
                className="tag-score-caption"
                style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
              >
                relative to expected
              </span>
            </div>
          </div>
        )}

        {/* Evidence — results mode only */}
        {mode === "result" && (node.evidence?.length ?? 0) > 0 && (
          <section className="tag-panel-section">
            <h4
              className="tag-panel-section-title"
              style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
            >
              Evidence
            </h4>
            <ul className="tag-panel-list">
              {node.evidence!.map((e, i) => (
                <li key={i} style={{ color: TAG_PALETTE.ink }}>
                  {e}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quote highlight — first piece of evidence promoted */}
        {mode === "result" && node.evidence && node.evidence[0] && (
          <section className="tag-panel-section">
            <blockquote
              className="tag-panel-quote"
              style={{
                fontFamily: TAG_TYPE.serif,
                color: TAG_PALETTE.ink,
                background: TAG_PALETTE.paper3,
                borderLeftColor: TAG_PALETTE.gold,
              }}
            >
              {node.evidence[0]}
            </blockquote>
          </section>
        )}

        {/* P4-2 — provenance + "why you can trust this" (self-gated on tag_evidence;
            renders null when off, so node tap behaves as today by default). */}
        {mode === "result" && (
          <>
            <NodeProvenancePanel node={node} className="tag-panel-section" />
            <TrustExpander node={node} className="tag-panel-section" />
          </>
        )}

        {/* Required vs demonstrated — when blueprint metadata present */}
        {node.expected_proficiency && (
          <section className="tag-panel-section">
            <h4
              className="tag-panel-section-title"
              style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
            >
              Proficiency
            </h4>
            <p style={{ fontFamily: TAG_TYPE.sans, color: TAG_PALETTE.ink }}>
              <strong style={{ color: TAG_PALETTE.muted2, fontWeight: 500 }}>
                Required:
              </strong>{" "}
              {tierName(node.expected_proficiency)}
              {node.required_proficiency ? ` (${node.required_proficiency})` : ""}
              {node.demonstrated_proficiency && (
                <>
                  {" · "}
                  <strong style={{ color: TAG_PALETTE.muted2, fontWeight: 500 }}>
                    Demonstrated:
                  </strong>{" "}
                  {node.demonstrated_proficiency}
                </>
              )}
            </p>
          </section>
        )}

        {/* Tier descriptions — blueprint mode shows all 5; result mode shows demonstrated + expected */}
        {node.proficiency_levels && node.proficiency_levels.length > 0 && (
          <section className="tag-panel-section">
            <h4
              className="tag-panel-section-title"
              style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
            >
              What each tier means
            </h4>
            <ul className="tag-panel-list">
              {node.proficiency_levels.map((lvl) => {
                const isExpected = lvl.level === node.expected_proficiency;
                return (
                  <li
                    key={lvl.level}
                    style={{
                      color: isExpected ? TAG_PALETTE.ink : TAG_PALETTE.muted,
                      fontWeight: isExpected ? 500 : 400,
                    }}
                  >
                    <strong style={{ color: styleSet.stroke }}>
                      {tierName(lvl.level)}:
                    </strong>{" "}
                    {lvl.description || lvl.name}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Description — both modes */}
        {node.description && (
          <section className="tag-panel-section">
            <h4
              className="tag-panel-section-title"
              style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
            >
              About this skill
            </h4>
            <p
              className="tag-panel-text"
              style={{ color: TAG_PALETTE.muted, fontFamily: TAG_TYPE.sans }}
            >
              {node.description}
            </p>
          </section>
        )}

        {/* Transferable provenance */}
        {node.transferable_from && (
          <section className="tag-panel-section">
            <h4
              className="tag-panel-section-title"
              style={{ fontFamily: TAG_TYPE.mono, color: TAG_PALETTE.muted2 }}
            >
              Transferred from
            </h4>
            <p
              className="tag-panel-text"
              style={{ color: TAG_PALETTE.ink, fontFamily: TAG_TYPE.sans }}
            >
              {node.transferable_from}
            </p>
          </section>
        )}

        {/* A4: recruiter human-in-the-loop override (result view only) */}
        {mode === "result" && sessionId && node.type !== "role_center" &&
          node.type !== "transferable" && typeof node.score === "number" && (
          <section className="tag-panel-section">
            <button
              type="button"
              onClick={() => setOverrideOpen(true)}
              className="text-[11px] text-gold-ink hover:underline"
            >
              Override score
            </button>
          </section>
        )}
      </div>

      {mode === "result" && sessionId && typeof node.score === "number" && (
        <ScoreOverrideModal
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          sessionId={sessionId}
          skillId={node.id}
          skillLabel={node.label}
          currentScore={node.score}
          onOverridden={onOverridden}
        />
      )}
    </div>
  );
}
