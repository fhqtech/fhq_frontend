/**
 * Spec 2 — the practical-defense authenticity verdict.
 *
 * When an interview follows a practical, the defense reviewer scores the
 * candidate's ability to defend their submission and derives a recruiter-facing
 * authenticity verdict plus integrity flags. This surfaces both, gated behind
 * the `defense_authenticity` flag (default-off). Non-accusatory, sentence case.
 */
import { useFlag } from "@/lib/flags/FlagProvider";

export type DefenseAuthenticity = "consistent" | "some_concerns" | "likely_not_own_work";

export interface DefenseReportView {
  authenticity: DefenseAuthenticity;
  integrity_flags?: string[];
}

const VERDICT_COPY: Record<DefenseAuthenticity, { label: string; tone: string }> = {
  consistent: { label: "Defense consistent with the submission", tone: "text-success" },
  some_concerns: { label: "Some concerns in the defense", tone: "text-gold-ink" },
  likely_not_own_work: { label: "Likely not their own work", tone: "text-danger" },
};

export function AuthenticityVerdict({ report }: { report?: DefenseReportView | null }) {
  const on = useFlag("defense_authenticity");
  if (!on || !report?.authenticity) return null;

  const copy = VERDICT_COPY[report.authenticity];
  const flags = report.integrity_flags ?? [];

  return (
    <section className="border-t border-rule pt-4">
      <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
        Defense authenticity
      </span>
      <p className={`mt-1 text-sm font-medium ${copy.tone}`}>{copy.label}</p>
      {flags.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {flags.map((flag, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>·</span>
              <span>{flag}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
