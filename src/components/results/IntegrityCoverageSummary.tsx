/**
 * P8 — post-interview integrity & coverage summary.
 *
 * For a recruiter who did NOT watch the defense interview live: a single,
 * post-hoc panel that surfaces
 *   1. coverage — which skills were defended / left hollow / never probed,
 *   2. expected vs submitted — the model-answer-vs-submitted diff,
 *   3. advisory signal — a hedged, contestable authenticity read plus turn-cited
 *      integrity notes (the existing IntegrityNote), each contestable via
 *      "mark as fair".
 *
 * Everything here is ADVISORY. Nothing on this surface rejects, gates, or
 * decides — the recruiter has the final call. Copy stays calm, hedged, and never
 * accusatory; under reviewer v1 it never claims a score is "verified" or
 * "grounded".
 *
 * Default-OFF: self-gated on the `integrity` flag (mirrors IntegrityNote), so the
 * running pilot never sees it until a workspace opts in. Coverage/diff come from
 * the interview_monitor doc and exist only for a grounded practical defense; when
 * absent the coverage block renders an honest empty state rather than fabricating
 * zero counts.
 */
import { FileSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { IntegrityNote } from "@/components/trust/IntegrityNote";
import { integrityApi } from "@/services/integrityApi";
import { useFlag } from "@/lib/flags/FlagProvider";
import { useIntegritySummary } from "@/queries/resultsQueries";
import type { IntegrityFlag } from "@/lib/integrity";
import type { IntegritySummaryFlag } from "@/services/integritySummaryApi";

export interface IntegrityCoverageSummaryProps {
  sessionId: string;
}

/** Mono editorial kicker — the only uppercase copy allowed on this surface. */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-ink">{children}</p>
  );
}

/** Map the snake_case API flag onto the camelCase shape IntegrityNote renders. */
function toIntegrityFlag(f: IntegritySummaryFlag): IntegrityFlag {
  return {
    turn: f.turn,
    quote: f.quote,
    skillName: f.skill_name ?? undefined,
    canonicalId: f.canonical_id ?? undefined,
    note: f.note,
  };
}

export function IntegrityCoverageSummary({ sessionId }: IntegrityCoverageSummaryProps) {
  const enabled = useFlag("integrity");
  // Keep the query dark while the flag is off so the pilot never fetches this.
  const { data } = useIntegritySummary(enabled ? sessionId : undefined);

  if (!enabled) return null;
  if (!data) return null;

  const cov = data.coverage;
  const diff = data.expected_vs_submitted_diff;
  const flags = data.integrity_flags ?? [];

  return (
    <section className="mt-6 rounded-md border border-rule bg-paper p-4 animate-in fade-in duration-300">
      <Kicker>integrity & coverage</Kicker>
      <p className="mt-1 text-xs text-muted">
        A post-hoc read for anyone who didn't watch the interview live. Advisory — never an
        automatic decision.
      </p>

      {/* Coverage — reused defended / hollow / unprobed markup, honest-empty when null. */}
      <div className="mt-4">
        <Kicker>coverage</Kicker>
        {cov ? (
          <ul className="mt-2 space-y-1 text-xs">
            <li>
              <span className="text-success">Defended:</span> {(cov.defended || []).join(", ") || "—"}
            </li>
            <li>
              <span className="text-danger">Hollow:</span> {(cov.hollow || []).join(", ") || "—"}
            </li>
            <li>
              <span className="text-muted">Unprobed:</span> {(cov.unprobed || []).join(", ") || "—"}
            </li>
          </ul>
        ) : (
          <EmptyState
            icon={FileSearch}
            title="No coverage summary"
            description="Coverage summary is available only for interviews that included a practical defense."
            className="mt-2"
          />
        )}
      </div>

      {/* Expected vs submitted — reused diff markup; hidden entirely when null. */}
      {diff && (
        <div className="mt-4 border-t border-rule pt-4">
          <Kicker>expected vs submitted</Kicker>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {typeof diff.target_level === "number" && (
              <span className="rounded-sm bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-soft">
                target L{diff.target_level}
              </span>
            )}
            {typeof diff.grounding_ratio === "number" && (
              <span
                className={
                  "font-mono text-xs tabular-nums " +
                  (diff.flag ? "text-danger" : "text-success")
                }
              >
                grounding {(diff.grounding_ratio * 100).toFixed(0)}%
              </span>
            )}
            {diff.flag && (
              <span className="text-xs text-danger">sounds hollow vs the model answer</span>
            )}
          </div>
          {diff.model_answer && (
            <p className="mt-2 text-xs text-ink-soft">
              <span className="text-muted">Model:</span> {diff.model_answer}
            </p>
          )}
          {diff.submitted && (
            <p className="mt-1 text-xs text-ink-soft">
              <span className="text-muted">Said:</span> {diff.submitted}
            </p>
          )}
        </div>
      )}

      {/* Advisory signal — hedged line + a tabular score, then the turn-cited notes. */}
      <div className="mt-4 border-t border-rule pt-4">
        <Kicker>advisory signal</Kicker>
        <p className="mt-2 text-sm text-ink">
          Advisory signal, never an automatic decision.
          <span className="ml-2 font-mono text-xs tabular-nums text-muted">
            {data.advisory_suspicion.toFixed(2)}
          </span>
        </p>

        {flags.length > 0 && (
          <div className="mt-3 space-y-3">
            {flags.map((f) => (
              <IntegrityNote
                key={`${f.canonical_id ?? f.skill_name ?? "turn"}-${f.turn}`}
                flag={toIntegrityFlag(f)}
                onMarkFair={(flag) => {
                  // Fire-and-forget: IntegrityNote keeps its optimistic state; the
                  // endpoint is idempotent, so a failure just retries on the next mark.
                  integrityApi.markFair(sessionId, flag).catch(() => {
                    /* best-effort; optimistic UI already reflects the mark */
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default IntegrityCoverageSummary;
