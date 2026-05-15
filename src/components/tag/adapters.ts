/**
 * Adapters: convert raw API payloads → unified TagData consumed by the renderer.
 *
 * Why two: blueprint-mode surfaces (interview-create preview, candidate
 * pre-interview) only have the blueprint document; result-mode surfaces
 * (recruiter result, candidate result) have a Phase-1-enriched
 * InterviewResults document that already merges blueprint metadata onto
 * each node. Both produce the same TagData shape.
 */
import { STATUS_OF_SCORE, type TagStatus } from "./constants";
import type {
  RawBlueprint,
  RawInterviewResults,
  TagData,
  TagEdge,
  TagNode,
} from "./types";

// Lightweight "preview" shape used by BlueprintPreviewRail. Skill_type is the
// only signal we have at preview time — no scores, no positions, no edges.
export interface PreviewSkillLite {
  shortName: string;
  name: string;
  skill_type?: "technical" | "behavioral" | "cultural";
}

// --- blueprint mode ---

export function tagFromBlueprint(bp: RawBlueprint): TagData {
  const roleTitle = bp.role_title || bp.title || "Role";
  const coreSkillIds = new Set(bp.skill_layout?.core_skills ?? []);
  const derivedMap = new Map<string, string>(
    (bp.skill_layout?.derived_skills ?? []).map((d) => [d.skill_id, d.derives_from]),
  );

  const nodes: TagNode[] = [
    {
      id: "_role_center",
      type: "role_center",
      label: roleTitle,
      is_core: false,
    },
    ...bp.skills.map((s) => ({
      id: s.skill_id,
      type: (coreSkillIds.has(s.skill_id) ? "core" : "regular") as TagNode["type"],
      label: s.name,
      short_name: s.short_name ?? s.name.split(" ")[0],
      description: s.description,
      icon_id: s.icon_id ?? s.skill_id,
      expected_proficiency: (s.expected_proficiency ?? 3) as 1 | 2 | 3 | 4 | 5,
      proficiency_levels: s.proficiency_levels,
      parent_skill_id: derivedMap.get(s.skill_id) ?? null,
      is_core: coreSkillIds.has(s.skill_id),
    })),
  ];

  // Blueprint mode synthesizes minimal edges (every non-center → center).
  const edges: TagEdge[] = nodes
    .filter((n) => n.type !== "role_center")
    .map((n) => ({
      source: "_role_center",
      target: n.id,
      type: "integration",
      style: "solid",
    }));

  return {
    roleTitle,
    nodes,
    edges,
    annotations: [],
    core_skill_ids: bp.skill_layout?.core_skills ?? [],
  };
}

// --- lightweight preview mode (no scores, no expected_proficiency) ---

export function tagFromPreview(
  roleTitle: string,
  skills: PreviewSkillLite[],
): TagData {
  // Position skills evenly around the role center using the same normalized
  // [0..1] coords the SVG renderer expects.
  const n = Math.max(1, skills.length);
  const radius = 0.34;
  const cx = 0.5;
  const cy = 0.513;

  const nodes: TagNode[] = [
    {
      id: "_role_center",
      type: "role_center",
      label: roleTitle,
      is_core: false,
    },
    ...skills.map((s, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const skillId = (s.name || s.shortName).toLowerCase().replace(/\s+/g, "-");
      return {
        id: skillId,
        type: "core" as TagNode["type"],
        label: s.name,
        short_name: s.shortName,
        is_core: s.skill_type === "technical",
        icon_id: skillId,
        position: { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) },
      };
    }),
  ];

  const edges: TagEdge[] = nodes
    .filter((nn) => nn.type !== "role_center")
    .map((nn) => ({
      source: "_role_center",
      target: nn.id,
      type: "integration",
      style: "solid",
    }));

  return {
    roleTitle,
    nodes,
    edges,
    annotations: [],
  };
}

// --- result mode ---

export function tagFromResult(
  results: RawInterviewResults,
  fallbackRoleTitle: string,
): TagData {
  const gd = results.graph_data;
  const roleNode = gd.nodes.find((n) => n.type === "role_center");
  const roleTitle = roleNode?.label || fallbackRoleTitle || "Role";

  // Backend already enriched + positioned. Pass through.
  return {
    roleTitle,
    nodes: gd.nodes,
    edges: gd.edges ?? [],
    annotations: gd.annotations ?? [],
    stats: gd.stats,
    insights: gd.insights ?? [],
    core_skill_ids: gd.core_skill_ids ?? [],
    certifications: gd.certifications ?? [],
    tools: gd.tools ?? [],
    ideal_candidate_profile: gd.ideal_candidate_profile ?? null,
    proficiency_legend: gd.proficiency_legend ?? [],
  };
}

// --- helpers ---

/** Infer status from a node, falling back to score bucketing. */
export function nodeStatus(node: TagNode): TagStatus {
  if (node.type === "role_center") return "role_center";
  if (node.type === "transferable") return "transferable";
  return STATUS_OF_SCORE(node.score ?? null);
}

/** Compute stats locally if backend didn't provide them (defensive). */
export function computeStats(nodes: TagNode[]) {
  const counts = { strong: 0, developing: 0, gap: 0, transferable: 0 };
  for (const n of nodes) {
    const s = nodeStatus(n);
    if (s === "role_center") continue;
    counts[s] += 1;
  }
  return counts;
}
