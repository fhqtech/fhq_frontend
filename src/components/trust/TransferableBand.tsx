/**
 * P4-5 — the transferable-strength band (recruiter results).
 *
 * Surfaces the synthesiser's top-level `transferable_skills[]` — which reaches
 * the frontend typed but is rendered nowhere today — as a sober, WITHIN-finance
 * set of "this strength likely carries into the role" leads. See
 * `lib/transferableStrengths.ts` for the data-shape reality, engine dependence
 * (v1 produces the array, v2 empties it), and the within-finance safety net.
 *
 * Default-off by construction: gated on the `transferable` flag, so the running
 * pilot renders nothing until a workspace opts in. When the flag is off, when
 * there are no strengths, or when every row is filtered out as non-finance, the
 * band renders NOTHING — never an empty box.
 *
 * Honesty rules baked in:
 *   - These strengths carry no grounding evidence, so the band never renders a
 *     confident score — it frames each as a hedged lead ("likely transfers to")
 *     and states plainly that they are leads to probe, not scored evidence.
 *   - Copy is calm and non-accusatory; it never claims certainty or hype.
 */
import { ArrowRight, Route } from "lucide-react";
import { useFlag } from "@/lib/flags/FlagProvider";
import type { TransferableSkill } from "@/types/interviewResults";
import { toTransferableStrengths } from "@/lib/transferableStrengths";

export interface TransferableBandProps {
  /**
   * The raw synthesiser array off the results doc
   * (`InterviewResultsData.transferable_skills`). Optional / possibly empty —
   * empty under the v2 reviewer engine.
   */
  skills?: TransferableSkill[] | null;
  className?: string;
}

export function TransferableBand({ skills, className }: TransferableBandProps) {
  const enabled = useFlag("transferable");
  const strengths = toTransferableStrengths(skills ?? null);

  // Off, or nothing safe to show → render nothing (not an empty box).
  if (!enabled || strengths.length === 0) return null;

  return (
    <section
      aria-labelledby="transferable-band-heading"
      className={`rounded-md border border-rule bg-paper-2 p-6 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <Route className="h-3.5 w-3.5 text-gold-ink" aria-hidden />
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
          Transferable strength
        </span>
      </div>

      <h3
        id="transferable-band-heading"
        className="mt-2 text-sm font-semibold tracking-tight text-ink"
      >
        Transferable strengths
      </h3>
      <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted">
        Strength shown in one finance area that likely carries into this role. Treat these as leads
        to probe in the next round, not as scored evidence.
      </p>

      <ul className="mt-4 divide-y divide-rule border-t border-rule">
        {strengths.map((s, i) => (
          <li key={`${s.source}->${s.target}-${i}`} className="py-3 first:pt-4">
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <span className="text-ink">Strength in</span>
              <span className="font-medium text-ink">{s.source}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-2" aria-hidden />
              <span className="text-muted">likely transfers to</span>
              <span className="font-medium text-ink">{s.target}</span>
            </p>
            {s.relevance && (
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted">{s.relevance}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TransferableBand;
