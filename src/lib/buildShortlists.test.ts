/**
 * P3-2 — Shortlists merge. Named candidate lists and curated (qualified) lists
 * are one concept — "shortlists" — where curated is a filter, not a separate
 * type. This pure helper collapses both API shapes into one row list, curated
 * first (mirroring the legacy YourListsTab order), and filters by kind. The
 * surface layer adds chips + navigation on top of it.
 */
import { describe, it, expect } from "vitest";
import { buildShortlists, filterShortlists, type ShortlistRow } from "./buildShortlists";
import type { CandidateList } from "@/services/listsApi";
import type { QualifiedList } from "@/services/qualifiedListsApi";

const named = (over: Partial<CandidateList>): CandidateList => ({
  id: "l1",
  name: "Bengaluru audit associates",
  description: "",
  totalCandidates: 12,
  sourcesCount: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-02-01T00:00:00Z",
  usedInInterviews: [],
  sourceIds: [],
  ...over,
});

const curated = (over: Partial<QualifiedList>): QualifiedList => ({
  id: "q1",
  name: "Management consulting bench",
  description: "",
  isQualified: true,
  totalCandidates: 5,
  sourcesCount: 1,
  createdAt: "2026-01-05T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
  createdBy: "u1",
  ...over,
});

describe("buildShortlists", () => {
  it("tags named lists 'named' and qualified lists 'curated'", () => {
    const rows = buildShortlists(
      [named({ id: "l1", name: "Bengaluru audit associates", totalCandidates: 12 })],
      [curated({ id: "q1", name: "Management consulting bench", totalCandidates: 5 })],
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.l1.kind).toBe("named");
    expect(byId.q1.kind).toBe("curated");
  });

  it("puts curated rows before named rows (matching the legacy order)", () => {
    const rows = buildShortlists(
      [
        named({ id: "l1", name: "Bengaluru audit associates" }),
        named({ id: "l2", name: "Q3 tax reviewers" }),
      ],
      [curated({ id: "q1", name: "Management consulting bench" })],
    );
    expect(rows.map((r) => r.id)).toEqual(["q1", "l1", "l2"]);
  });

  it("preserves candidate counts and names from each source", () => {
    const rows = buildShortlists(
      [named({ id: "l2", name: "Q3 tax reviewers", totalCandidates: 8 })],
      [curated({ id: "q1", name: "Management consulting bench", totalCandidates: 5 })],
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.l2).toMatchObject({ name: "Q3 tax reviewers", totalCandidates: 8 });
    expect(byId.q1).toMatchObject({ name: "Management consulting bench", totalCandidates: 5 });
  });

  it("returns an empty array when there are no lists of either kind", () => {
    expect(buildShortlists([], [])).toEqual([]);
  });

  it("defaults a missing totalCandidates to 0", () => {
    const rows = buildShortlists([named({ id: "l1", totalCandidates: undefined as unknown as number })], []);
    expect(rows[0].totalCandidates).toBe(0);
  });
});

describe("filterShortlists", () => {
  const rows: ShortlistRow[] = buildShortlists(
    [
      named({ id: "l1", name: "Bengaluru audit associates", totalCandidates: 12 }),
      named({ id: "l2", name: "Q3 tax reviewers", totalCandidates: 8 }),
    ],
    [curated({ id: "q1", name: "Management consulting bench", totalCandidates: 5 })],
  );

  it("returns every row for 'all'", () => {
    expect(filterShortlists(rows, "all").map((r) => r.id)).toEqual(["q1", "l1", "l2"]);
  });

  it("returns only curated rows for 'curated'", () => {
    expect(filterShortlists(rows, "curated").map((r) => r.id)).toEqual(["q1"]);
  });

  it("returns only named rows for 'named'", () => {
    expect(filterShortlists(rows, "named").map((r) => r.id)).toEqual(["l1", "l2"]);
  });
});
