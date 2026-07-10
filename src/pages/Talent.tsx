/**
 * P3-1 — Talent. The cross-role human index (behind the `talent` flag): every
 * candidate this recruiter has assessed, collapsed to one row each, searchable,
 * sorted by best demonstrated score. Consumes the existing /api/scores/all spine
 * (scoreAnalyticsApi.getAllScores) — no new backend — and folds a candidate's
 * screen + fitment + practical rows into a single person via buildTalentIndex.
 *
 * A row opens the candidate's profile TAG (the closest cross-role surface today);
 * candidate-360 (Phase 5) becomes the richer target later.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { scoreAnalyticsApi } from "@/services/scoreAnalyticsApi";
import { buildTalentIndex, filterTalent, type TalentRow } from "@/lib/buildTalentIndex";
import { useSelection } from "@/lib/useSelection";
import { resolveTriageAction, TRIAGE_SHORTCUTS } from "@/lib/triageKeys";
import { useFlag } from "@/lib/flags/FlagProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageSkeleton } from "@/components/ui/shimmer";
import { BulkActionBar } from "@/components/talent/BulkActionBar";
import { CompareTray } from "@/components/talent/CompareTray";
import { SkillMatchEntry } from "@/components/talent/SkillMatchEntry";
import { cn } from "@/lib/utils";
import { Users, Search, Keyboard } from "lucide-react";

const PAGE_SIZE = 25;
/** Compare reads cleanly for two to four graphs. */
const COMPARE_MIN = 2;
const COMPARE_MAX = 4;

function relativeDay(iso: string): string {
  if (!iso) return "—";
  const label = iso.slice(0, 10);
  return label || "—";
}

function TalentRowItem({
  row,
  onOpen,
  selected,
  onToggle,
  focused,
}: {
  row: TalentRow;
  onOpen: (r: TalentRow) => void;
  selected: boolean;
  onToggle: (id: string) => void;
  focused?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-paper-2",
        focused && "bg-paper-2 ring-1 ring-inset ring-gold",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(row.candidateId)}
        aria-label={`Select ${row.name || row.candidateId}`}
      />
      <button
        onClick={() => onOpen(row)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{row.name || row.candidateId}</p>
        <p className="truncate text-xs text-muted">{row.email || "no email on file"}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {row.types.map((t) => (
          <span
            key={t}
            className="rounded-sm bg-paper-3 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
          >
            {t === "preliminary" ? "screen" : t}
          </span>
        ))}
      </div>
      <div className="w-16 shrink-0 text-right">
        <span className="font-mono tabular-nums text-xs text-ink-soft">{row.interviewCount}</span>
        <span className="ml-1 text-[10px] text-muted">
          {row.interviewCount === 1 ? "role" : "roles"}
        </span>
      </div>
      <div className="hidden w-24 shrink-0 text-right md:block">
        <span className="font-mono tabular-nums text-xs text-muted">{relativeDay(row.latestActivity)}</span>
      </div>
      <div className="w-14 shrink-0 text-right">
        {row.bestScore === null ? (
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted">unscored</span>
        ) : (
          <span className="font-mono tabular-nums text-base font-semibold text-ink">
            {Math.round(row.bestScore)}
          </span>
        )}
      </div>
      </button>
    </div>
  );
}

export default function Talent() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const selection = useSelection();
  const [comparing, setComparing] = useState(false);
  const keyboardOn = useFlag("keyboard");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);

  const scoresQuery = useQuery({
    queryKey: ["talent", "all-scores"],
    queryFn: () => scoreAnalyticsApi.getAllScores(),
    staleTime: 30_000,
  });

  const rows = useMemo(
    () => buildTalentIndex(scoresQuery.data ?? []),
    [scoresQuery.data],
  );
  const filtered = useMemo(() => filterTalent(rows, query), [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const onOpen = (r: TalentRow) => navigate(`/candidates/${r.candidateId}/profile-tag`);

  // Compare works over the picked rows, in the order they were selected.
  const compareRows = useMemo(
    () => selection.ids.map((id) => rows.find((r) => r.candidateId === id)).filter((r): r is TalentRow => !!r),
    [selection.ids, rows],
  );
  const canCompare = selection.count >= COMPARE_MIN && selection.count <= COMPARE_MAX;

  // Keep the keyboard focus inside the visible page.
  useEffect(() => {
    setFocusedIndex((i) => (i >= visible.length ? visible.length - 1 : i));
  }, [visible.length]);

  // P3-6 — keyboard triage (behind the `keyboard` flag). Nothing here is required;
  // the mouse path is untouched, and typing in the search box is never hijacked.
  useEffect(() => {
    if (!keyboardOn) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const action = resolveTriageAction(e.key);
      if (!action) return;
      if (action !== "help" || e.key === "?") e.preventDefault();
      const focused = focusedIndex >= 0 ? visible[focusedIndex] : undefined;
      switch (action) {
        case "next":
          setFocusedIndex((i) => Math.min(visible.length - 1, i + 1));
          break;
        case "prev":
          setFocusedIndex((i) => Math.max(0, i - 1));
          break;
        case "toggle":
          if (focused) selection.toggle(focused.candidateId);
          break;
        case "open":
          if (focused) onOpen(focused);
          break;
        case "compare":
          if (canCompare) setComparing(true);
          break;
        case "help":
          setShowHelp((h) => !h);
          break;
        case "clear":
          if (showHelp) setShowHelp(false);
          else if (comparing) setComparing(false);
          else selection.clear();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardOn, visible, focusedIndex, canCompare, showHelp, comparing]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Talent</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Everyone you've assessed</h1>
          <p className="mt-2 max-w-[65ch] text-base text-ink-soft">
            Every candidate across your roles, in one place. Search by name or email; the strongest
            demonstrated score sorts to the top.
          </p>
        </div>
        <SkillMatchEntry />
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search talent by name or email"
          className="pl-9"
          aria-label="Search talent"
        />
      </div>

      {scoresQuery.isPending ? (
        <PageSkeleton header={false} cards={0} rows={6} cols={2} message="Loading your talent…" />
      ) : scoresQuery.error ? (
        <ErrorBanner
          tone="danger"
          title="Couldn't load talent"
          description={scoresQuery.error instanceof Error ? scoresQuery.error.message : "Please retry."}
          retryLabel="Retry"
          onRetry={() => scoresQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "No one matches that search" : "No assessed candidates yet"}
          description={
            query
              ? "Try a different name or email."
              : "Once candidates complete an interview, they show up here across every role."
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              <span className="font-mono tabular-nums">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "candidate" : "candidates"}
            </p>
            {keyboardOn && (
              <button
                onClick={() => setShowHelp((h) => !h)}
                className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Press <kbd className="rounded-sm border border-rule bg-paper-2 px-1 font-mono text-[10px]">?</kbd> for shortcuts
              </button>
            )}
          </div>
          <div className="divide-y divide-rule rounded-md border border-rule bg-paper">
            {visible.map((row, idx) => (
              <TalentRowItem
                key={row.candidateId}
                row={row}
                onOpen={onOpen}
                selected={selection.isSelected(row.candidateId)}
                onToggle={selection.toggle}
                focused={keyboardOn && idx === focusedIndex}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <p className="font-mono tabular-nums text-xs text-muted">
                {safePage + 1} / {pageCount}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <BulkActionBar
        count={selection.count}
        canCompare={canCompare}
        onCompare={() => setComparing(true)}
        onClear={selection.clear}
      />
      <CompareTray open={comparing} rows={compareRows} onClose={() => setComparing(false)} />

      {keyboardOn && showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="w-full max-w-sm rounded-xl border border-rule bg-paper p-5 shadow-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-ink">Keyboard shortcuts</h2>
            <dl className="mt-3 space-y-2">
              {TRIAGE_SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-4 text-xs">
                  <dt className="text-ink-soft">{s.label}</dt>
                  <dd>
                    <kbd className="rounded-sm border border-rule bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] text-ink">
                      {s.keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
