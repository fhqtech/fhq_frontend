/**
 * gapCsv — turn a skill GapResult (per-skill target vs demonstrated) into a
 * CSV a recruiter can hand a hiring manager. Thin domain layer over src/lib/csv
 * (which owns RFC-4180 escaping + the Blob download) — this only builds the rows.
 *
 * Header stays neutral ("Demonstrated", not "Verified"): under reviewer v1 the
 * demonstrated values are model assessments, so the export must not imply
 * grounding it doesn't have.
 */
import { downloadCsv } from "@/lib/csv";
import type { GapResult } from "@/services/recruiterJourneysApi";

export function gapResultToCsvRows(gap: GapResult): (string | number)[][] {
  const header = ["Skill", "Target", "Demonstrated", "Points short", "Meets bar"];
  const body = gap.gaps.map((g) => [
    g.skill_name,
    g.target,
    g.demonstrated,
    g.gap,
    g.met ? "yes" : "no",
  ]);
  const blank = ["", "", "", "", ""];
  const summary = [
    ["Skills meeting the bar", `${gap.summary.met_count} of ${gap.summary.total}`, "", "", ""],
    ["Average points short", Math.round(gap.summary.avg_gap), "", "", ""],
  ];
  return [header, ...body, blank, ...summary];
}

export function downloadGapCsv(filename: string, gap: GapResult): void {
  downloadCsv(filename, gapResultToCsvRows(gap));
}
