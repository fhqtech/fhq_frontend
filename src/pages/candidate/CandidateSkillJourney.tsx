/**
 * CandidateSkillJourney (P4) — the candidate's home. One fused profile across
 * interview + every assessment mode: the TAG, strengths/gaps, and an
 * improvement plan ("how to catch up"). The emotional payoff of the unified
 * platform. Per CR-04 the candidate sees their own profile (this IS theirs).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import { EmptyState } from "@/components/ui/empty-state";
import { ImprovementPlan } from "@/components/candidate/ImprovementPlan";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { assessmentsApi, type SkillJourney } from "@/services/assessmentsApi";

function SkillRow({ name, value }: { name: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-ink">{name}</span>
      <span className="font-mono tabular-nums text-xs text-muted">{value}</span>
    </div>
  );
}

export default function CandidateSkillJourney() {
  const { account } = useCandidateAuth();
  const [journey, setJourney] = useState<SkillJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    assessmentsApi
      .getSkillJourney()
      .then((j) => !cancelled && setJourney(j))
      .catch((e) => !cancelled && setError(e?.message || "Could not load your skill journey."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const empty = journey && journey.skill_count === 0;

  return (
    <div className="min-h-[100dvh] bg-paper-2">
      <header className="bg-paper border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-primary tracking-tight">FlowDot AI</h1>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Skill journey
            </span>
          </div>
          <Link to="/candidate/dashboard" className="text-sm text-muted hover:text-primary flex items-center gap-1">
            Your assignments <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            {account?.name ? `${account.name.split(" ")[0]}, here's where you stand` : "Your skill journey"}
          </h2>
          <p className="text-sm text-muted mt-1">
            Built from everything you've done — interviews and assessments — fused into one picture.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted py-12 text-center" aria-busy="true">Loading your skill journey…</p>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm text-ink">{error}</p>
          </div>
        ) : empty ? (
          <EmptyState
            title="Your skill journey starts soon"
            description="Once you complete an interview or assessment, your skill profile and a personalised catch-up plan appear here."
          />
        ) : journey ? (
          <div className="space-y-8">
            {/* Fused TAG — the marquee */}
            <section className="bg-paper rounded-xl border border-border shadow-1 p-4">
              <TalentAnalysisGraph nodes={journey.fused_tag.nodes} roleTitle="Your skills" mode="result" />
            </section>

            {/* Strengths + gaps */}
            <section className="grid md:grid-cols-2 gap-6">
              <div className="bg-paper rounded-xl border border-border shadow-1 p-5">
                <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">Strengths</p>
                {journey.strengths.length ? (
                  <div className="divide-y divide-rule">
                    {journey.strengths.map((s) => (
                      <SkillRow key={s.canonical_id || s.skill_name} name={s.skill_name} value={s.value} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No strong skills demonstrated yet — the plan below is how you get there.</p>
                )}
              </div>
              <div className="bg-paper rounded-xl border border-border shadow-1 p-5">
                <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">Focus areas</p>
                {journey.gaps.length ? (
                  <div className="divide-y divide-rule">
                    {journey.gaps.map((g) => (
                      <SkillRow key={g.canonical_id || g.skill_name} name={g.skill_name} value={g.value} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Nothing pressing — keep your strengths sharp.</p>
                )}
              </div>
            </section>

            {/* Improvement plan — the payoff */}
            <section className="bg-paper rounded-xl border border-border shadow-1 p-5">
              <h3 className="text-base font-semibold text-ink">Your catch-up plan</h3>
              <p className="text-sm text-muted mt-0.5 mb-1">
                Close these to keep pace as the field moves. Start with the biggest opportunity.
              </p>
              <ImprovementPlan items={journey.improvement_plan} candidateId={journey.practice_candidate_id} />
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
