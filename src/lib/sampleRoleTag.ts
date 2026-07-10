/**
 * P1-5 — a grounded sample Talent Analysis Graph, so a recruiter (or a visitor
 * on the marketing page) sees the marquee artifact in one click, before
 * creating a role or waiting for a real interview to score.
 *
 * Finance-realistic by construction: a senior tax associate role, Indian-finance
 * skills (GST, TDS, income tax, 3CD audit), Indian-finance evidence, and a mix
 * of strong / developing / gap / transferable so every status reads. Built from
 * the same RawInterviewResults shape the reviewer emits and converted with the
 * same tagFromResult adapter the live results page uses. Nodes carry explicit
 * [0,1] positions because result-mode TAGs are pre-positioned by the backend.
 */
import { tagFromResult } from "@/components/tag/adapters";
import type { RawInterviewResults, TagPosition } from "@/components/tag/types";

// Six skills evenly around the centre (start at top, clockwise), radius 0.34.
const ring: TagPosition[] = [
  { x: 0.5, y: 0.16 },
  { x: 0.206, y: 0.33 },
  { x: 0.206, y: 0.67 },
  { x: 0.5, y: 0.84 },
  { x: 0.794, y: 0.67 },
  { x: 0.794, y: 0.33 },
];

const SAMPLE_RAW: RawInterviewResults = {
  overall_score: 76,
  recommendation: "advance_with_concerns",
  summary:
    "Strong on indirect tax and computation, grounded with real examples. Tax-audit depth and reporting need a closer look before a decision.",
  graph_data: {
    nodes: [
      { id: "_role_center", type: "role_center", label: "Senior tax associate", is_core: false, position: { x: 0.5, y: 0.5 } },
      {
        id: "gst", type: "core", label: "GST compliance", is_core: true, score: 88,
        demonstrated_proficiency: "L4", required_proficiency: "L3", position: ring[0],
        evidence: ["Walked through a GSTR-2B reconciliation and explained an ITC reversal under rule 42."],
      },
      {
        id: "tds", type: "core", label: "TDS and withholding", is_core: true, score: 71,
        demonstrated_proficiency: "L3", required_proficiency: "L3", position: ring[1],
        evidence: ["Reasoned through the 194Q and 206C(1H) interplay on a goods purchase."],
      },
      {
        id: "itr", type: "core", label: "Income tax computation", is_core: true, score: 82,
        demonstrated_proficiency: "L4", required_proficiency: "L3", position: ring[2],
        evidence: ["Derived taxable income with a MAT credit set-off and referenced 115JB."],
      },
      {
        id: "audit", type: "regular", label: "Tax audit (3CD)", is_core: false, score: 58,
        demonstrated_proficiency: "L2", required_proficiency: "L3", position: ring[3],
        evidence: ["Knew the 3CD clauses but hesitated on clause 44 GST reporting."],
      },
      {
        id: "report", type: "regular", label: "Financial reporting", is_core: false, score: 44,
        demonstrated_proficiency: "L1", required_proficiency: "L3", position: ring[4],
        evidence: ["Comfortable with Ind AS basics; limited on deferred tax."],
      },
      {
        id: "advisory", type: "transferable", label: "Client advisory", is_core: false, score: 72,
        demonstrated_proficiency: "L3", transferable_from: "Articleship", position: ring[5],
        evidence: ["Framed a withholding question as a client recommendation with trade-offs."],
      },
    ],
    edges: [
      { source: "_role_center", target: "gst", type: "integration" },
      { source: "_role_center", target: "tds", type: "integration" },
      { source: "_role_center", target: "itr", type: "integration" },
      { source: "gst", target: "audit", type: "derives_from" },
      { source: "itr", target: "report", type: "derives_from" },
      { source: "_role_center", target: "advisory", type: "transferable" },
    ],
    insights: [
      { status: "strong", headline: "Indirect tax is a clear strength", body: "GST compliance and income-tax computation both read at L4, each grounded in a worked example." },
      { status: "gap", headline: "Reporting depth is thin", body: "Financial reporting sat at L1 against an L3 ask; deferred tax was a visible gap." },
      { status: "transferable", headline: "Advises like a consultant", body: "Framed a tax question as a client recommendation, a signal that carries beyond the role." },
    ],
    proficiency_legend: [
      { level: 1, name: "L1", description: "Aware" },
      { level: 2, name: "L2", description: "Assisted" },
      { level: 3, name: "L3", description: "Independent" },
      { level: 4, name: "L4", description: "Reviews others" },
      { level: 5, name: "L5", description: "Sets the standard" },
    ],
  },
};

export const SAMPLE_ROLE_TAG = tagFromResult(SAMPLE_RAW, "Senior tax associate");
