/**
 * P3-5 — compare tray. A slide-up panel that aligns 2–4 candidates side by side
 * on their demonstrated scores (best + per-type breakdown), so a recruiter reads
 * the field at a glance. Motion is CSS-only (translate-y + opacity) per the
 * design constraints — no animation library. Full radial TAG-vs-TAG lives on the
 * role board where a single blueprint pins the axes; this cross-role tray compares
 * the scores the Talent index already holds.
 */
import { useEffect } from "react";
import type { TalentRow } from "@/lib/buildTalentIndex";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface CompareTrayProps {
  open: boolean;
  rows: TalentRow[];
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = { preliminary: "Screen", fitment: "Fitment" };

/** Best displayable score for one interview type across a candidate's rows. */
function scoreForType(row: TalentRow, type: string): number | null {
  const vals = row.scores
    .filter((s) => s.interview_type === type)
    .map((s) => s.human_score ?? s.ai_interview_score ?? s.ats_score ?? null)
    .filter((v): v is number => v !== null);
  return vals.length ? Math.max(...vals) : null;
}

export function CompareTray({ open, rows, onClose }: CompareTrayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const allTypes = Array.from(new Set(rows.flatMap((r) => r.types)));

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <section
        role="region"
        aria-label="Compare candidates"
        className="w-full max-w-5xl rounded-t-xl border border-rule bg-paper shadow-3 transition-transform duration-200 ease-[cubic-bezier(.2,.72,.28,1)]"
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-3">
          <div>
            <p className="font-mono uppercase tracking-[0.18em] text-[10px] text-gold-ink">Compare</p>
            <h2 className="text-sm font-semibold text-ink">
              {rows.length} candidates, side by side
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close compare"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid gap-px overflow-x-auto bg-rule p-px" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((r) => (
            <div key={r.candidateId} className="bg-paper px-4 py-4">
              <p className="truncate text-sm font-medium text-ink">{r.name || r.candidateId}</p>
              <p className="truncate text-xs text-muted">{r.email || "no email"}</p>
              <div className="mt-3">
                {r.bestScore === null ? (
                  <span className="font-mono text-[11px] uppercase tracking-wide text-muted">unscored</span>
                ) : (
                  <span className="font-mono tabular-nums text-3xl font-semibold text-ink">
                    {Math.round(r.bestScore)}
                  </span>
                )}
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">best score</p>
              </div>
              <dl className="mt-4 space-y-1.5 border-t border-rule pt-3">
                {allTypes.map((t) => {
                  const v = scoreForType(r, t);
                  return (
                    <div key={t} className="flex items-center justify-between text-xs">
                      <dt className="text-ink-soft">{TYPE_LABEL[t] ?? t}</dt>
                      <dd className="font-mono tabular-nums text-ink">
                        {v === null ? <span className="text-muted">—</span> : Math.round(v)}
                      </dd>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between text-xs">
                  <dt className="text-ink-soft">Roles</dt>
                  <dd className="font-mono tabular-nums text-ink">{r.interviewCount}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
