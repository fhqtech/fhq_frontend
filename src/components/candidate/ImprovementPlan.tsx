/**
 * ImprovementPlan (P4) — the candidate's "how to catch up" roadmap. One row per
 * gap: a current→target bar, why it matters, and expandable catch-up steps.
 * Dense divided rows (no card grid), sentence case, no superlatives.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, Dumbbell, ClipboardCheck } from "lucide-react";
import type { ImprovementItem } from "@/services/assessmentsApi";

const STEP_ICON: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  practice: Dumbbell,
  assessment: ClipboardCheck,
};

function GapRow({ item }: { item: ImprovementItem }) {
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
        </div>
      )}
    </div>
  );
}

export function ImprovementPlan({ items }: { items: ImprovementItem[] }) {
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
        <GapRow key={it.skill_canonical_id || it.skill_name} item={it} />
      ))}
    </div>
  );
}
