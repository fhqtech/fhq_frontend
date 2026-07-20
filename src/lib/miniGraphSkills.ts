/**
 * Build the decision-card mini-graph skills from reviewer `graph_data` nodes.
 *
 * The reviewer emits node types core | regular | transferable | role_center.
 * The old inline transform in CandidateCard filtered on ['skill','gap',
 * 'transferable'] — types that never exist — so the mini-graph came out blank
 * for every scored candidate. Filter to the real skill types and derive the
 * render category from `nodeStatus`, so strong / developing / gap / not-assessed
 * all show, and un-probed skills read distinctly rather than as red gaps.
 */
import { nodeStatus } from "@/components/tag/adapters";
import type { TagNode } from "@/components/tag/types";
import type { GraphBlueprintSkill, SkillCategory } from "@/components/ui/ReviewerSkillsGraph";

const STATUS_TO_CATEGORY: Record<string, SkillCategory> = {
  strong: "strong_match",
  developing: "developing",
  gap: "gap",
  transferable: "transferable",
  not_assessed: "not_assessed",
};

export function graphSkillsFromNodes(nodes: any[]): GraphBlueprintSkill[] {
  return (nodes || [])
    .filter((n) => ["core", "regular", "transferable"].includes(n?.type))
    .map((node) => {
      const status = nodeStatus(node as TagNode);
      const category = STATUS_TO_CATEGORY[status] ?? "developing";
      return {
        skill_id: node.id,
        name: node.label,
        shortName: node.short_name || node.label,
        description: node.proficiency_label || "Skill evaluation based on interview performance",
        findings: node.evidence || [],
        category,
        expected_proficiency: node.expected_proficiency ?? 3,
        proficiency_levels: node.proficiency_levels || [],
      } as GraphBlueprintSkill;
    });
}
