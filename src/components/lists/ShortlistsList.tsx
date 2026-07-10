/**
 * P3-2 — ShortlistsList. The presentational half of the Lists+Qualified merge:
 * given already-built shortlist rows, render kind chips (all / named / curated)
 * plus a search box, and a divided row list (VISUAL_DENSITY 6 — rows, not
 * cards). Curated rows carry a small gold marker (kept well under the 10% gold
 * budget). No context, no network — the container feeds it rows.
 *
 * A row opens the existing list-detail surface; curated rows append
 * `?isQualified=true` so ListDetail takes its qualified fast path.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { filterShortlists, type ShortlistFilter, type ShortlistRow } from "@/lib/buildShortlists";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Bookmark, Search, Sparkles } from "lucide-react";

const FILTERS: Array<{ key: ShortlistFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "named", label: "Named" },
  { key: "curated", label: "Curated" },
];

export function ShortlistsList({ rows }: { rows: ShortlistRow[] }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ShortlistFilter>("all");
  const [query, setQuery] = useState("");

  const byKind = useMemo(() => filterShortlists(rows, filter), [rows, filter]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return byKind;
    return byKind.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [byKind, query]);

  const openRow = (row: ShortlistRow) =>
    navigate(`/lists/${row.id}${row.kind === "curated" ? "?isQualified=true" : ""}`);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No shortlists yet"
        description="Create a shortlist to group candidates you're tracking."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group" aria-label="Filter shortlists by kind">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors active:translate-y-[1px]",
                filter === f.key
                  ? "bg-ink text-paper"
                  : "border border-rule bg-paper text-ink-soft hover:bg-paper-2",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortlists"
            className="pl-9"
            aria-label="Search shortlists"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No shortlists match"
          description="Try a different name, or clear the filter."
        />
      ) : (
        <div className="divide-y divide-rule rounded-md border border-rule bg-paper">
          {visible.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => openRow(row)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-paper-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink">{row.name}</p>
                  {row.kind === "curated" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-gold-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-gold-ink">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Curated
                    </span>
                  )}
                </div>
                {row.description && <p className="truncate text-xs text-muted">{row.description}</p>}
              </div>
              <div className="w-24 shrink-0 text-right">
                <span className="font-mono tabular-nums text-sm text-ink">{row.totalCandidates}</span>
                <span className="ml-1 text-[10px] text-muted">
                  {row.totalCandidates === 1 ? "candidate" : "candidates"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ShortlistsList;
