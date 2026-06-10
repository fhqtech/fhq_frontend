import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  assessmentsRecruiterApi,
  type ProfileResponse,
} from "@/services/assessmentsRecruiterApi";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";

function band(value: number): { label: string; cls: string } {
  if (value >= 80) return { label: "Strong", cls: "text-success" };
  if (value >= 50) return { label: "Developing", cls: "text-gold-ink" };
  return { label: "Gap", cls: "text-danger" };
}

/** Recruiter-facing fused cross-mode skill profile (A6). Highlights skills
 * where modes disagree (conflict) for human review. */
export function FusedSkillProfile({ candidateId }: { candidateId: string }) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    assessmentsRecruiterApi
      .getFusedProfile(candidateId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || "Could not load skill profile"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (loading) return <p className="text-sm text-muted py-6">Loading skill profile…</p>;
  if (error) return <ErrorBanner tone="danger" title="Couldn't load skill profile" description={error} />;
  if (!data || data.claims.length === 0) {
    return (
      <EmptyState
        title="No assessment evidence yet"
        description="Once this candidate completes an assessment, their fused skill profile appears here."
      />
    );
  }

  return (
    <div className="border-t border-rule">
      <div className="flex items-center justify-between py-2 text-xs text-muted">
        <span>{data.claims.length} skill(s) · {data.evidence_count} evidence item(s)</span>
        <span>Human-in-the-loop — one input among several</span>
      </div>
      <div className="divide-y divide-rule">
        {data.claims.map((c) => {
          const b = band(c.value);
          return (
            <div key={c.canonical_id || c.skill_name} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-ink truncate flex items-center gap-1.5">
                  {c.skill_name}
                  {c.conflict && (
                    <span title="Modes disagree — review" className="inline-flex items-center text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted">
                  {c.modes.join(", ") || "—"} · confidence {Math.round(c.confidence * 100)}%
                </p>
              </div>
              <div className="text-right shrink-0 pl-3">
                <span className="font-mono tabular-nums text-sm text-ink">{c.value}</span>
                <span className={`block text-[11px] ${b.cls}`}>{b.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
