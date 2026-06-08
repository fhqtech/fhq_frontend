/**
 * ImprovementPlan (P4) — the candidate's "how to catch up" roadmap. One row per
 * gap: a current→target bar, why it matters, and expandable catch-up steps.
 * Dense divided rows (no card grid), sentence case, no superlatives.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, BookOpen, Dumbbell, ClipboardCheck, ArrowRight } from "lucide-react";
import type { ImprovementItem, PracticeRef } from "@/services/assessmentsApi";

const STEP_ICON: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  practice: Dumbbell,
  assessment: ClipboardCheck,
};

const PRACTICE_CTA: Record<string, string> = {
  scenario: "Take a scenario to prove this",
  case: "Take a case study to prove this",
  work_sample: "Take a work sample to prove this",
  defense: "Defend this skill",
};

function practiceRoute(p: PracticeRef, candidateId: string): string {
  const qs = new URLSearchParams({ candidateId, domain: p.domain, practice: "1" }).toString();
  if (p.mode === "scenario") return `/candidate/assessment/${encodeURIComponent(p.item_id)}?${qs}`;
  if (p.mode === "defense") return `/candidate/assessment/defense/${encodeURIComponent(p.item_id)}?${qs}`;
  return `/candidate/assessment/artifact/${encodeURIComponent(p.item_id)}?${qs}`;
}

function GapRow({ item, candidateId }: { item: ImprovementItem; candidateId?: string | null }) {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(100, item.current_value));
  const targetPct = Math.max(0, Math.min(100, item.target_value));

  return (
    <div className="border-t border-rule py-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted shrink-0" />}
        <span className="flex-1 text-sm font-medium text-ink">{item.skill_name}</span>
        <span className="font-mono tabular-nums text-xs text-muted">
          {item.current_value} <span className="text-muted2">/ {item.target_value}</span>
        </span>
      </button>

      {/* current -> target bar (transform only) */}
      <div className="mt-2 ml-7 h-1.5 rounded-full bg-paper-3 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary origin-left transition-transform"
          style={{ transform: `scaleX(${pct / 100})`, width: "100%" }}
        />
        <div
          className="absolute inset-y-0 w-px bg-gold-ink"
          style={{ left: `${targetPct}%` }}
          aria-hidden
        />
      </div>

      {open && (
        <div className="mt-3 ml-7 space-y-3">
          <p className="text-xs text-muted">{item.rationale}</p>
          <ul className="space-y-2">
            {item.steps.map((s, i) => {
              const Icon = STEP_ICON[s.type] || BookOpen;
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-gold-ink mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-ink">{s.title}</p>
                    <p className="text-xs text-muted">{s.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {item.practice && candidateId ? (
            <Link
              to={practiceRoute(item.practice, candidateId)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-paper text-sm font-medium hover:bg-primary/90 transition-colors active:translate-y-px"
            >
              {PRACTICE_CTA[item.practice.mode] || "Take a targeted assessment"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="text-xs text-muted2 italic">
              No live assessment for this skill yet — check back as the library grows.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ImprovementPlan({ items, candidateId }: { items: ImprovementItem[]; candidateId?: string | null }) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted py-4 border-t border-rule">
        No gaps right now — your demonstrated skills are all at a strong level. Keep them sharp.
      </p>
    );
  }
  return (
    <div>
      {items.map((it) => (
        <GapRow key={it.skill_canonical_id || it.skill_name} item={it} candidateId={candidateId} />
      ))}
    </div>
  );
}
