/**
 * Pure SVG TAG renderer — annotations + edges + center + skill nodes.
 *
 * Faithful port of the funnelhq.co/tag.html SVG structure. State is owned
 * by the parent (TalentAnalysisGraph) — this component is presentational.
 */
import { useMemo } from "react";
import {
  STATUS_STYLES,
  TAG_CANVAS,
  TAG_PALETTE,
  TAG_TYPE,
  TAG_NODE_R,
  TAG_ROLE_R,
  scalePos,
  type TagStatus,
} from "./constants";
import { getIcon, ROLE_CENTER_ICON } from "./icons/FinanceIconRegistry";
import type { TagAnnotation, TagEdge, TagMode, TagNode, TagPosition } from "./types";
import { nodeStatus } from "./adapters";

interface TagSvgGraphProps {
  nodes: TagNode[];
  edges: TagEdge[];
  annotations: TagAnnotation[];
  selectedNodeId: string | null;
  onSelectNode: (node: TagNode) => void;
  mode: TagMode;
  /** Pan/zoom transform applied to the inner viewport group */
  viewportTransform?: string;
}

const splitRoleTitle = (title: string): string[] => {
  const words = (title || "Role").trim().split(/\s+/);
  if (words.length === 1) return words;
  // Split roughly in half by word count.
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
};

/**
 * Split a skill label into 1–2 lines for SVG rendering.
 * Strategy:
 *  - Short labels (≤ 22 chars) → single line
 *  - Has parenthetical, e.g. "Direct Tax Fundamentals (Income Tax Act 1961)"
 *    → split BEFORE the "(", paren block goes on line 2
 *  - Otherwise → split on the word boundary closest to the midpoint
 */
const splitNodeLabel = (label: string, max = 22): string[] => {
  const clean = label.trim();
  if (clean.length <= max) return [clean];

  const parenIdx = clean.indexOf("(");
  if (parenIdx > 4 && parenIdx < clean.length - 1) {
    const head = clean.slice(0, parenIdx).trim();
    const tail = clean.slice(parenIdx).trim();
    return [head, tail];
  }

  const words = clean.split(/\s+/);
  if (words.length < 2) return [clean];

  // Choose the split point that minimises max line length.
  let best = { idx: 1, maxLen: Infinity };
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const m = Math.max(left.length, right.length);
    if (m < best.maxLen) best = { idx: i, maxLen: m };
  }
  return [words.slice(0, best.idx).join(" "), words.slice(best.idx).join(" ")];
};

const lookupNode = (nodes: TagNode[], id: string): TagNode | undefined =>
  nodes.find((n) => n.id === id);

const ensurePosition = (n: TagNode | undefined, fallback: TagPosition): TagPosition =>
  n?.position ? scalePos(n.position) : fallback;

const midpoint = (a: TagPosition, b: TagPosition): TagPosition => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export function TagSvgGraph({
  nodes,
  edges,
  annotations,
  selectedNodeId,
  onSelectNode,
  mode,
  viewportTransform,
}: TagSvgGraphProps) {
  const center = useMemo<TagPosition>(() => {
    const role = nodes.find((n) => n.type === "role_center");
    return role?.position
      ? scalePos(role.position)
      : { x: TAG_CANVAS.width / 2, y: TAG_CANVAS.height / 2 };
  }, [nodes]);

  const roleNode = nodes.find((n) => n.type === "role_center");
  const roleLines = splitRoleTitle(roleNode?.label || "Role");

  return (
    <svg
      viewBox={`-120 -40 ${TAG_CANVAS.width + 240} ${TAG_CANVAS.height + 80}`}
      preserveAspectRatio="xMidYMid meet"
      className="tag-svg"
      role="img"
      aria-label="Talent Analysis Graph"
    >
      <g id="viewport" style={{ transform: viewportTransform, transition: "transform 320ms cubic-bezier(.2,.72,.28,1)" }}>
        {/* ANNOTATIONS layer (results mode only) */}
        {mode === "result" && (
          <g aria-hidden="true">
            {annotations.map((a, i) => {
              if (!a.position) return null;
              const pos = scalePos(a.position);
              const curveTo = a.curve_to ? scalePos(a.curve_to) : null;
              const lines = a.note.split(/(?<=[.!?])\s+/).slice(0, 2);
              return (
                <g key={`anno-${i}`}>
                  <text
                    x={pos.x}
                    y={pos.y}
                    fontFamily={TAG_TYPE.serif}
                    fontSize={15}
                    fontStyle="italic"
                    fill={TAG_PALETTE.muted}
                  >
                    {lines.map((ln, li) => (
                      <tspan key={li} x={pos.x} dy={li === 0 ? 0 : 20}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                  {curveTo && (
                    <>
                      <path
                        d={`M ${pos.x + 220} ${pos.y + 22} Q ${
                          (pos.x + curveTo.x) / 2
                        } ${(pos.y + curveTo.y) / 2 - 30} ${curveTo.x} ${curveTo.y}`}
                        stroke={TAG_PALETTE.ruleStrong}
                        strokeWidth={0.8}
                        fill="none"
                      />
                      <circle cx={curveTo.x} cy={curveTo.y} r={2.5} fill={TAG_PALETTE.ruleStrong} />
                    </>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* EDGES layer */}
        <g>
          {edges.map((e, i) => {
            // Defensive: if source/target doesn't resolve to a node, treat
            // it as the role center (backend used to emit interview_id as
            // edge.source; legacy docs survive this way).
            const src = lookupNode(nodes, e.source) ?? roleNode;
            const tgt = lookupNode(nodes, e.target) ?? roleNode;
            if (!src || !tgt) return null;
            const a = ensurePosition(src, center);
            const b = ensurePosition(tgt, center);
            const skillEnd = src.type === "role_center" ? tgt : src;
            const status = nodeStatus(skillEnd);
            const color = STATUS_STYLES[status].stroke;
            const dasharray =
              e.style === "dashed" ? "6 6" : e.style === "dashed-thin" ? "3 4" : undefined;
            const opacity = e.style === "dashed-thin" ? 0.6 : 1;
            const width = e.style === "dashed-thin" ? 1.2 : 1.8;
            return (
              <g key={`edge-${i}`}>
                <path
                  d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                  stroke={color}
                  strokeWidth={width}
                  strokeDasharray={dasharray}
                  fill="none"
                  opacity={opacity}
                />
                {e.label && (
                  <text
                    x={midpoint(a, b).x}
                    y={midpoint(a, b).y - 4}
                    fontFamily={TAG_TYPE.mono}
                    fontSize={10.5}
                    fontWeight={500}
                    letterSpacing="0.2em"
                    fill={color}
                    textAnchor="middle"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* CENTER role hub */}
        {roleNode && (
          <g
            className="tag-role-node"
            transform={`translate(${center.x}, ${center.y})`}
          >
            <circle
              r={TAG_ROLE_R}
              fill={TAG_PALETTE.ink}
              stroke="#FFFFFF"
              strokeWidth={1}
              strokeOpacity={0.25}
            />
            {ROLE_CENTER_ICON("#FFFFFF")}
            {roleLines.map((ln, i) => (
              <text
                key={i}
                y={i === 0 ? (roleLines.length === 2 ? 10 : 6) : 26}
                textAnchor="middle"
                fontFamily={TAG_TYPE.sans}
                fontSize={12.5}
                fontWeight={600}
                fill={TAG_PALETTE.paper2}
                style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
              >
                {ln.toUpperCase()}
              </text>
            ))}
            <text
              y={44}
              textAnchor="middle"
              fontFamily={TAG_TYPE.mono}
              fontSize={10}
              fill="rgba(255,255,255,0.72)"
              style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}
            >
              Role
            </text>
          </g>
        )}

        {/* SKILL nodes */}
        {nodes
          .filter((n) => n.type !== "role_center")
          .map((n) => {
            const pos = n.position ? scalePos(n.position) : center;
            const status: TagStatus = nodeStatus(n);
            const styleSet = STATUS_STYLES[status];
            const isSelected = selectedNodeId === n.id;
            const isSource = (n.id || "").startsWith("source_");

            const labelParts = splitNodeLabel(n.label).map((s) => s.toUpperCase());
            const labelExtraDy = (labelParts.length - 1) * 13; // px offset when label wraps
            const labelLines: {
              text: string | string[];
              cls: "label" | "sublabel" | "level";
              dy: number;
            }[] = [];
            labelLines.push({ text: labelParts, cls: "label", dy: 50 });
            if (n.sublabel)
              labelLines.push({ text: n.sublabel, cls: "sublabel", dy: 64 + labelExtraDy });
            if (mode === "result" && n.level_text) {
              labelLines.push({
                text: n.level_text,
                cls: "level",
                dy: (n.sublabel ? 80 : 68) + labelExtraDy,
              });
            }

            return (
              <g
                key={n.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectNode(n)}
                aria-label={`${status}: ${n.label}${n.level_text ? `, ${n.level_text}` : ""}`}
              >
                {isSource ? (
                  <rect
                    x={-26}
                    y={-26}
                    width={52}
                    height={52}
                    rx={6}
                    fill={TAG_PALETTE.purple}
                    stroke={TAG_PALETTE.purple}
                    strokeWidth={isSelected ? 3.5 : 2}
                    style={{
                      filter: isSelected
                        ? "drop-shadow(0 8px 22px rgba(10,18,32,0.22))"
                        : undefined,
                    }}
                  />
                ) : (
                  <circle
                    r={TAG_NODE_R}
                    fill={styleSet.fill}
                    stroke={styleSet.stroke}
                    strokeWidth={isSelected ? 3.5 : 2}
                    style={{
                      filter: isSelected
                        ? "drop-shadow(0 8px 22px rgba(10,18,32,0.22))"
                        : undefined,
                      transition: "stroke-width 140ms ease, filter 180ms ease",
                    }}
                  />
                )}
                {getIcon(n.icon_id ?? n.id, n.label)(isSource ? "#FFFFFF" : styleSet.stroke)}
                {labelLines.map((ln, i) => {
                  if (ln.cls === "label") {
                    const parts = Array.isArray(ln.text) ? ln.text : [ln.text];
                    return (
                      <text
                        key={`label-${i}`}
                        y={ln.dy}
                        textAnchor="middle"
                        fontFamily={TAG_TYPE.sans}
                        fontSize={11.5}
                        fontWeight={500}
                        fill={TAG_PALETTE.ink}
                        style={{ letterSpacing: "0.02em" }}
                      >
                        {parts.map((part, idx) => (
                          <tspan key={idx} x={0} dy={idx === 0 ? 0 : 13}>
                            {part}
                          </tspan>
                        ))}
                      </text>
                    );
                  }
                  const text = Array.isArray(ln.text) ? ln.text.join(" ") : ln.text;
                  if (ln.cls === "sublabel") {
                    return (
                      <text
                        key={`sub-${i}`}
                        y={ln.dy}
                        textAnchor="middle"
                        fontFamily={TAG_TYPE.sans}
                        fontSize={10.5}
                        fill={TAG_PALETTE.muted}
                      >
                        {text}
                      </text>
                    );
                  }
                  return (
                    <text
                      key={`level-${i}`}
                      y={ln.dy}
                      textAnchor="middle"
                      fontFamily={TAG_TYPE.mono}
                      fontSize={10}
                      fill={isSource ? TAG_PALETTE.purple : TAG_PALETTE.muted2}
                      style={{ letterSpacing: "0.06em" }}
                    >
                      {text}
                    </text>
                  );
                })}
              </g>
            );
          })}
      </g>
    </svg>
  );
}
