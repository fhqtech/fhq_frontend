/**
 * P1-5 — public sample-analysis page. Shows the marquee Talent Analysis Graph
 * on real-shaped (but illustrative) data, so a visitor sees the payoff before
 * signing up, and a new recruiter can reach a real graph in one click. No auth,
 * no workspace; the graph renders from a static fixture.
 */
import { Link } from "react-router-dom";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import { Button } from "@/components/ui/button";
import { SAMPLE_ROLE_TAG } from "@/lib/sampleRoleTag";

export default function SampleTag() {
  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-ink">
            FlowDot
          </Link>
          <Button asChild variant="gold" size="sm">
            <Link to="/start">Start screening</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-2xl">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
            Sample analysis
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            What a screening produces
          </h1>
          <p className="mt-3 text-base text-ink-soft leading-relaxed max-w-[65ch]">
            This is a Talent Analysis Graph for a senior tax associate, scored against a role
            blueprint. Every node carries the evidence behind its score, so a decision rests on
            depth, not a resume skim. The data here is illustrative.
          </p>
        </div>

        <div className="mt-10 rounded-md border border-rule bg-paper shadow-1">
          <TalentAnalysisGraph data={SAMPLE_ROLE_TAG} mode="result" />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-sm text-ink-soft">
            Run this on your own candidates in a few minutes.
          </p>
          <Button asChild variant="gold">
            <Link to="/start">Start screening</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
