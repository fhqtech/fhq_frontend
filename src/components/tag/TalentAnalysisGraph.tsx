/**
 * Talent Analysis Graph (TAG) viewer — T2 of FunnelHQ repositioning.
 *
 * Renders the reviewer's `graph_data` as a radial SVG graph that mirrors
 * the visual language of funnelhq.co/tag.html:
 *
 *   - Central node: the role being hired for.
 *   - Radiating skill nodes, sized by score, colored by status:
 *       🟢 green   score ≥ 80   strong
 *       🟠 orange  50 ≤ s < 80  developing
 *       🔴 red     s < 50       gap
 *       🟣 purple  transferable (any score)
 *   - Click any node → opens <EvidencePanel> on the right.
 *
 * Self-contained: SVG only, no react-flow dependency. Uses framer-motion
 * for the entry animation. Supports pan + zoom via wheel + drag.
 */
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillNode, type SkillNodeData } from "./SkillNode";
import { EvidencePanel } from "./EvidencePanel";

export interface TagGraphNode {
  id: string;
  type: "core" | "regular" | "transferable" | "role_center" | "role" | "skill";
  label: string;
  score?: number;
  is_core?: boolean;
  required_proficiency?: string | null;
  demonstrated_proficiency?: string | null;
  proficiency_label?: string | null;
  evidence?: string[];
  transferable_from?: string | null;
}

export interface TalentAnalysisGraphProps {
  /** Role title — appears in the centre node when graph_data lacks role_center */
  roleTitle?: string;
  /** Raw graph data from interview_results.graph_data */
  nodes: TagGraphNode[];
  /** Optional class for outer container */
  className?: string;
}

// --- color + size helpers ---

type Status = "strong" | "developing" | "gap" | "transferable" | "role_center";

function scoreStatus(node: TagGraphNode): Status {
  if (node.type === "role_center" || node.type === "role") return "role_center";
  if (node.type === "transferable") return "transferable";
  const s = node.score ?? 0;
  if (s >= 80) return "strong";
  if (s >= 50) return "developing";
  return "gap";
}

const STATUS_COLORS: Record<Status, { fill: string; stroke: string; text: string }> = {
  strong: { fill: "#dcfce7", stroke: "#22c55e", text: "#14532d" },        // green-100 / 500 / 900
  developing: { fill: "#ffedd5", stroke: "#f97316", text: "#7c2d12" },    // orange
  gap: { fill: "#fee2e2", stroke: "#ef4444", text: "#7f1d1d" },           // red
  transferable: { fill: "#f3e8ff", stroke: "#a855f7", text: "#581c87" },  // purple
  role_center: { fill: "#1e293b", stroke: "#0f172a", text: "#f8fafc" },   // slate-900
};

// --- radial layout ---

interface LaidOutNode {
  node: TagGraphNode;
  x: number;
  y: number;
  radius: number;
  status: Status;
}

function radialLayout(
  nodes: TagGraphNode[],
  centerX: number,
  centerY: number,
  ringRadius: number,
): LaidOutNode[] {
  const center = nodes.find((n) => n.type === "role_center" || n.type === "role");
  const skillNodes = nodes.filter((n) => n.type !== "role_center" && n.type !== "role");
  const transferables = skillNodes.filter((n) => n.type === "transferable");
  const skills = skillNodes.filter((n) => n.type !== "transferable");

  const out: LaidOutNode[] = [];

  // Center node (role)
  if (center) {
    out.push({ node: center, x: centerX, y: centerY, radius: 56, status: "role_center" });
  }

  // Inner ring: skill nodes evenly distributed
  const innerCount = skills.length || 1;
  skills.forEach((node, i) => {
    const angle = (i / innerCount) * Math.PI * 2 - Math.PI / 2; // start at top
    const x = centerX + Math.cos(angle) * ringRadius;
    const y = centerY + Math.sin(angle) * ringRadius;
    const size = nodeRadius(node.score ?? 0);
    out.push({ node, x, y, radius: size, status: scoreStatus(node) });
  });

  // Outer ring: transferables (offset angles between skill nodes)
  if (transferables.length > 0) {
    const outerRadius = ringRadius * 1.55;
    transferables.forEach((node, i) => {
      const angle = (i / transferables.length) * Math.PI * 2 - Math.PI / 4;
      const x = centerX + Math.cos(angle) * outerRadius;
      const y = centerY + Math.sin(angle) * outerRadius;
      out.push({ node, x, y, radius: 32, status: "transferable" });
    });
  }

  return out;
}

function nodeRadius(score: number): number {
  // 28-48px depending on score. Bigger = higher.
  const clamped = Math.max(0, Math.min(100, score));
  return 28 + (clamped / 100) * 20;
}

// --- main component ---

export function TalentAnalysisGraph({ roleTitle, nodes, className = "" }: TalentAnalysisGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<TagGraphNode | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });

  // Inject a synthetic role_center if the data doesn't have one.
  const enriched = useMemo<TagGraphNode[]>(() => {
    const hasCenter = nodes.some((n) => n.type === "role_center" || n.type === "role");
    if (hasCenter) return nodes;
    return [
      { id: "_role_center", type: "role_center" as const, label: roleTitle || "Role" },
      ...nodes,
    ];
  }, [nodes, roleTitle]);

  const VIEW_W = 800;
  const VIEW_H = 600;
  const CENTER_X = VIEW_W / 2;
  const CENTER_Y = VIEW_H / 2;
  const RING_R = 220;

  const layout = useMemo(
    () => radialLayout(enriched, CENTER_X, CENTER_Y, RING_R),
    [enriched],
  );

  // Edges: connect every non-center node to the center.
  const center = layout.find((l) => l.status === "role_center");
  const edges = useMemo(() => {
    if (!center) return [];
    return layout
      .filter((l) => l !== center)
      .map((l) => ({
        x1: center.x,
        y1: center.y,
        x2: l.x,
        y2: l.y,
        stroke: STATUS_COLORS[l.status].stroke,
        opacity: l.status === "transferable" ? 0.4 : 0.25,
      }));
  }, [layout, center]);

  // Mouse handlers for pan + zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.5, Math.min(3, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOrigin.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: dragOrigin.current.x + (e.clientX - dragStart.current.x),
      y: dragOrigin.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className={`relative flex h-[600px] w-full overflow-hidden rounded-lg border bg-slate-50 ${className}`}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-white"
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-white"
          onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 bg-white"
          onClick={resetView}
          aria-label="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex gap-3 rounded bg-white/95 px-3 py-2 text-xs shadow-sm">
        <LegendDot color={STATUS_COLORS.strong.stroke} label="Strong (80+)" />
        <LegendDot color={STATUS_COLORS.developing.stroke} label="Developing (50-79)" />
        <LegendDot color={STATUS_COLORS.gap.stroke} label="Gap (<50)" />
        <LegendDot color={STATUS_COLORS.transferable.stroke} label="Transferable" />
      </div>

      {/* SVG graph */}
      <div
        className="flex-1 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* Edges first so they render under nodes */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.stroke}
              strokeWidth={1.5}
              opacity={e.opacity}
            />
          ))}

          {/* Nodes */}
          {layout.map((l, i) => {
            const colors = STATUS_COLORS[l.status];
            return (
              <motion.g
                key={l.node.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(l.node)}
              >
                <SkillNode
                  data={
                    {
                      x: l.x,
                      y: l.y,
                      radius: l.radius,
                      label: l.node.label,
                      score: l.node.score,
                      fill: colors.fill,
                      stroke: colors.stroke,
                      text: colors.text,
                      isCenter: l.status === "role_center",
                    } satisfies SkillNodeData
                  }
                />
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* Evidence panel — right side, slides in when a node is selected */}
      {selected && (
        <EvidencePanel
          node={selected}
          status={scoreStatus(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
