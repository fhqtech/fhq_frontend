/**
 * Unified TAG payload — shared between blueprint preview and result views.
 *
 * Mirror of the backend `GraphData` / `GraphNode` schema after the Phase 1
 * enrichment step. All result-only fields are optional so blueprint mode
 * can use the same shape with just the core skill metadata populated.
 */
import type { TagStatus } from "./constants";

export type TagMode = "blueprint" | "result";

export interface TagPosition {
  x: number;
  y: number;
}

export interface TagProficiencyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
}

export interface TagNode {
  id: string;
  type: "core" | "regular" | "transferable" | "role_center";
  label: string;
  /** Always provided in result mode; absent in blueprint mode. */
  score?: number;
  is_core: boolean;
  /** Display fields populated by the reviewer/blueprint */
  short_name?: string | null;
  description?: string | null;
  sublabel?: string | null;
  level_text?: string | null;
  icon_id?: string | null;
  /** Quadrant-based pixel position from backend layout pre-computer */
  position?: TagPosition | null;
  /** Result mode */
  required_proficiency?: string | null;
  demonstrated_proficiency?: string | null;
  proficiency_label?: string | null;
  evidence?: string[];
  transferable_from?: string | null;
  /** Blueprint mode (also stamped in result mode by enricher) */
  expected_proficiency?: 1 | 2 | 3 | 4 | 5 | null;
  proficiency_levels?: TagProficiencyLevel[] | null;
  parent_skill_id?: string | null;
}

export type TagEdgeStyle = "solid" | "dashed" | "dashed-thin";

export interface TagEdge {
  source: string;
  target: string;
  type: "integration" | "derives_from" | "gap" | "transferable" | "missing";
  style?: TagEdgeStyle;
  label?: string;
}

export interface TagAnnotation {
  type: "strength_cluster" | "gap_highlight" | "transferable_cluster";
  node_ids: string[];
  note: string;
  position?: TagPosition | null;
  curve_to?: TagPosition | null;
}

export interface TagStats {
  strong: number;
  developing: number;
  gap: number;
  transferable: number;
}

export interface TagInsight {
  status: Exclude<TagStatus, "role_center">;
  headline: string;
  body: string;
}

export interface TagTool {
  name: string;
  category?: string | null;
}

export interface TagData {
  /** Role title shown in the center hub (line-broken on render) */
  roleTitle: string;
  nodes: TagNode[];
  edges: TagEdge[];
  annotations: TagAnnotation[];
  stats?: TagStats;
  insights?: TagInsight[];
  core_skill_ids?: string[];
  /** F21: top-level context mirrored from blueprint */
  certifications?: string[];
  tools?: TagTool[];
  ideal_candidate_profile?: string | null;
  proficiency_legend?: TagProficiencyLevel[];
}

// --- raw-shape interfaces (what the API returns) ---

export interface RawBlueprint {
  role_title?: string;
  title?: string;
  skills: Array<{
    skill_id: string;
    name: string;
    short_name?: string;
    description?: string;
    expected_proficiency?: number;
    proficiency_levels?: TagProficiencyLevel[];
    icon_id?: string;
  }>;
  skill_layout?: {
    core_skills?: string[];
    derived_skills?: Array<{ skill_id: string; derives_from: string }>;
  };
}

export interface RawInterviewResults {
  overall_score?: number;
  recommendation?: string;
  summary?: string;
  graph_data: {
    nodes: TagNode[];
    edges?: TagEdge[];
    annotations?: TagAnnotation[];
    stats?: TagStats;
    insights?: TagInsight[];
    core_skill_ids?: string[];
    certifications?: string[];
    tools?: TagTool[];
    ideal_candidate_profile?: string | null;
    proficiency_legend?: TagProficiencyLevel[];
  };
}
