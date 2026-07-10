/**
 * P3-2 — merge named lists + curated (qualified) lists into one "shortlists"
 * concept. In the redesign, "qualified" is a filter, not a separate type: a
 * shortlist is either a `named` candidate list or a `curated` (qualified) one.
 *
 * This mirrors the legacy YourListsTab merge (curated rows spread first, then
 * named), lifted into a pure, unit-testable helper — the same pattern as
 * buildTalentIndex. The surface layer adds the filter chips and row navigation.
 *
 * Backend shapes (`CandidateList`, `QualifiedList`), collection ids, and API
 * paths are unchanged; only the presented vocabulary is unified.
 */
import type { CandidateList } from "@/services/listsApi";
import type { QualifiedList } from "@/services/qualifiedListsApi";

export type ShortlistKind = "named" | "curated";

export type ShortlistFilter = "all" | ShortlistKind;

export interface ShortlistRow {
  id: string;
  name: string;
  description?: string;
  kind: ShortlistKind;
  totalCandidates: number;
  updatedAt: string;
}

function curatedRow(list: QualifiedList): ShortlistRow {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    kind: "curated",
    totalCandidates: list.totalCandidates ?? 0,
    updatedAt: list.updatedAt || list.createdAt || "",
  };
}

function namedRow(list: CandidateList): ShortlistRow {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    kind: "named",
    totalCandidates: list.totalCandidates ?? 0,
    updatedAt: list.updatedAt || list.createdAt || "",
  };
}

/**
 * Collapse both list shapes into one row list. Curated rows come first —
 * matching the legacy `[...transformedQualifiedLists, ...transformedLists]`
 * order so the merged surface reads the same as the pool it replaces.
 */
export function buildShortlists(lists: CandidateList[], qualified: QualifiedList[]): ShortlistRow[] {
  return [...qualified.map(curatedRow), ...lists.map(namedRow)];
}

/** Kind is a filter, not a type: 'all' keeps everything, else keep one kind. */
export function filterShortlists(rows: ShortlistRow[], filter: ShortlistFilter): ShortlistRow[] {
  if (filter === "all") return rows;
  return rows.filter((r) => r.kind === filter);
}
