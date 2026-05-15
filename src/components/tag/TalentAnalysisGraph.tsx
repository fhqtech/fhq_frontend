/**
 * Talent Analysis Graph (TAG) — top-level component.
 *
 * Faithful port of funnelhq.co/tag.html into the recruiter app. Composes:
 *   - TagStatsStrip (above the card, results mode only)
 *   - Card frame with: legend, SVG graph, zoom controls, hint, side panel
 *   - TagInsightsCards (below the card, results mode only)
 *
 * Two API shapes are accepted:
 *   - NEW (preferred):  <TalentAnalysisGraph data={tagData} mode="result" />
 *   - LEGACY:           <TalentAnalysisGraph nodes={[...]} roleTitle="..." />
 * The legacy shape exists so the existing call sites (InterviewResults.tsx,
 * CandidateResults.tsx) keep working without a coordinated change. They get
 * the new look automatically; Phase 4 wires them to use the new `data` prop.
 */
import { useMemo, useRef, useState } from "react";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TagSvgGraph } from "./TagSvgGraph";
import { TagSidePanel } from "./TagSidePanel";
import { TagStatsStrip } from "./TagStatsStrip";
import { TagInsightsCards } from "./TagInsightsCards";
import { TagContextRail } from "./TagContextRail";
import { TagProficiencyLegend } from "./TagProficiencyLegend";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  TAG_PALETTE,
  TAG_TYPE,
  type TagStatus,
} from "./constants";
import type { TagData, TagMode, TagNode } from "./types";
import { computeStats, nodeStatus } from "./adapters";
import "./styles.css";

// --- Legacy node shape kept for back-compat with old call sites ---
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
  /** New API: pre-built TagData (preferred) */
  data?: TagData;
  mode?: TagMode;

  /** Legacy API: raw graph_data.nodes + role title (auto-converted) */
  roleTitle?: string;
  nodes?: TagGraphNode[];

  className?: string;
}

const LEGEND_ROWS: { status: Exclude<TagStatus, "role_center">; dashed?: boolean }[] = [
  { status: "strong" },
  { status: "developing" },
  { status: "gap", dashed: true },
  { status: "transferable" },
];

/** Convert the legacy shape to TagData. Used when caller provides only `nodes`. */
function legacyToTagData(nodes: TagGraphNode[], roleTitle?: string): TagData {
  const hasCenter = nodes.some((n) => n.type === "role_center" || n.type === "role");
  const tagNodes: TagNode[] = nodes.map((n) => ({
    id: n.id,
    type: (n.type === "role" ? "role_center" : n.type) as TagNode["type"],
    label: n.label,
    score: n.score,
    is_core: !!n.is_core,
    required_proficiency: n.required_proficiency,
    demonstrated_proficiency: n.demonstrated_proficiency,
    proficiency_label: n.proficiency_label,
    evidence: n.evidence ?? [],
    transferable_from: n.transferable_from,
  }));
  if (!hasCenter) {
    tagNodes.unshift({
      id: "_role_center",
      type: "role_center",
      label: roleTitle || "Role",
      is_core: false,
    });
  }
  return {
    roleTitle: roleTitle || tagNodes.find((n) => n.type === "role_center")?.label || "Role",
    nodes: tagNodes,
    edges: [],
    annotations: [],
  };
}

export function TalentAnalysisGraph({
  data,
  mode = "result",
  roleTitle,
  nodes,
  className = "",
}: TalentAnalysisGraphProps) {
  const tagData: TagData = useMemo(() => {
    if (data) return data;
    if (nodes) return legacyToTagData(nodes, roleTitle);
    return { roleTitle: roleTitle || "Role", nodes: [], edges: [], annotations: [] };
  }, [data, nodes, roleTitle]);

  const [selected, setSelected] = useState<TagNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });

  const stats = tagData.stats ?? computeStats(tagData.nodes);

  const handleWheel = (e: React.WheelEvent) => {
    // Only intercept wheel when Cmd (mac) or Ctrl (win/linux) is held.
    // Without a modifier, the wheel scrolls the page normally — important
    // since the graph card is taller than the viewport in our layout.
    if (!e.metaKey && !e.ctrlKey) return;
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
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const viewportTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  const showStats = mode === "result";
  const showInsights = mode === "result" && (tagData.insights?.length ?? 0) > 0;
  const hasContext =
    (tagData.certifications?.length ?? 0) > 0 ||
    (tagData.tools?.length ?? 0) > 0 ||
    !!(tagData.ideal_candidate_profile && tagData.ideal_candidate_profile.trim());
  const showProficiencyLegend = mode === "result";

  return (
    <div className={`tag-frame ${className}`}>
      {showStats && <TagStatsStrip stats={stats} />}

      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {hasContext && (
          <TagContextRail
            certifications={tagData.certifications}
            tools={tagData.tools}
            idealCandidateProfile={tagData.ideal_candidate_profile}
          />
        )}

        <div className="flex-1 min-w-0"><div className="tag-card">
        <div
          className="tag-main"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Legend */}
          <div className="tag-legend">
            <div className="tag-legend-title">Status</div>
            {LEGEND_ROWS.map((row) => (
              <div
                key={row.status}
                className="tag-legend-row"
                style={{ color: STATUS_STYLES[row.status].stroke }}
              >
                <span className={`tag-swatch ${row.dashed ? "dashed" : ""}`} />
                <span style={{ color: TAG_PALETTE.ink }}>{STATUS_LABELS[row.status]}</span>
              </div>
            ))}
          </div>

          <TagSvgGraph
            nodes={tagData.nodes}
            edges={tagData.edges}
            annotations={tagData.annotations}
            selectedNodeId={selected?.id ?? null}
            onSelectNode={setSelected}
            mode={mode}
            viewportTransform={viewportTransform}
          />

          {/* Zoom controls */}
          <div className="tag-zoom">
            <button
              className="tag-zbtn"
              onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              className="tag-zbtn"
              onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button className="tag-zbtn" onClick={reset} aria-label="Reset view">
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="tag-hint">
            Click any node for evidence · Drag to pan · ⌘/Ctrl + scroll to zoom
          </div>
        </div>
        </div></div>

        {showProficiencyLegend && (
          <TagProficiencyLegend legend={tagData.proficiency_legend} />
        )}
      </div>

      {/* Evidence modal — opens when a node is selected */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-hidden p-0 border-0"
          style={{ background: TAG_PALETTE.paper2 }}
        >
          <TagSidePanel node={selected} mode={mode} onClose={() => setSelected(null)} />
        </DialogContent>
      </Dialog>

      {showInsights && <TagInsightsCards insights={tagData.insights} />}
    </div>
  );
}

export default TalentAnalysisGraph;
