/**
 * P5-2 — the candidate-360 presentational surface (behind the `candidate_360` flag).
 *
 * Renders one human's read-time fan-in: the resolved identity, the stage timeline
 * (screen / fitment / practical / decision), the fused role-TAG (REUSING the marquee
 * TalentAnalysisGraph — never forked), a trust panel, a gap read, and the next-best
 * action verb. Pure/presentational: it takes an already-composed Candidate360View,
 * so it has no network, workspace, or router dependency beyond <Link>.
 *
 * Trust: the fused claims reach the frontend WITHOUT per-skill grounding evidence,
 * so under the P4 evidence contract every claim is unverified. Rather than show a
 * confident, ungrounded number, the trust panel reuses the P4 `UnverifiedMark` to
 * say so plainly. Per-node grounding, once the backend supplies it, still surfaces
 * on node-tap inside the reused TAG (TagSidePanel → NodeProvenancePanel/TrustExpander,
 * self-gated on `tag_evidence`).
 *
 * Every absent field degrades to a calm empty state — never a blank box.
 */
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Target,
  Hammer,
  Flag,
  Circle,
  Users,
  ListChecks,
  Network,
  Download,
} from "lucide-react";
import {
  TalentAnalysisGraph,
} from "@/components/tag/TalentAnalysisGraph";
import { UnverifiedMark } from "@/components/tag/UnverifiedMark";
import { AuthenticityVerdict } from "@/components/trust/AuthenticityVerdict";
import { SkillGapSummary } from "@/components/tag/SkillGapSummary";
import { summarizeFromGapResult } from "@/lib/skillGap";
import { downloadGapCsv } from "@/lib/gapCsv";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageSkeleton } from "@/components/ui/shimmer";
import type { Candidate360TimelineKind, Candidate360View } from "@/lib/candidate360";

export interface Candidate360ContentProps {
  view: Candidate360View;
  /** Center-node label for the reused TAG. */
  roleTitle: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** The role board this candidate drilled in from — for the "manage" affordance. */
  roleHref?: string;
}

const KIND_META: Record<
  Candidate360TimelineKind,
  { label: string; icon: typeof ClipboardCheck }
> = {
  screen: { label: "Screen", icon: ClipboardCheck },
  fitment: { label: "Fitment", icon: Target },
  practical: { label: "Practical", icon: Hammer },
  decision: { label: "Decision", icon: Flag },
  stage: { label: "Stage", icon: Circle },
};

function formatDate(at: string | null): string {
  if (!at) return "—";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function Candidate360Content({
  view,
  roleTitle,
  loading,
  error,
  onRetry,
  roleHref,
}: Candidate360ContentProps) {
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageSkeleton header rows={4} cols={3} message="Loading this candidate…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
        <ErrorBanner tone="danger" title="Couldn't load this candidate" description={error} />
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (!view.found) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <EmptyState
          icon={Users}
          title="Candidate not found"
          description="This candidate isn't in your workspace, or the record has been removed. Open the role board and pick a candidate from the pipeline."
          primaryAction={roleHref ? { label: "Back to role board", href: roleHref } : undefined}
        />
      </div>
    );
  }

  const { identity, timeline, claims, graphNodes, gap, nextAction, verifiedClaimCount, missing } = view;
  const displayName = identity?.name || "Unnamed candidate";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {/* Identity header */}
      <header>
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
          Candidate
        </span>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{displayName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          {identity?.email && <span>{identity.email}</span>}
          {identity && (
            <span className="font-mono text-xs text-muted" title="Read-time canonical id (not persisted)">
              {identity.candidateIds.length} record
              {identity.candidateIds.length === 1 ? "" : "s"} fanned in
            </span>
          )}
        </div>
      </header>

      {/* Next-best-action bar */}
      {nextAction && (
        <section
          aria-label="Next best action"
          className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-rule bg-paper-2 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Next best action
            </p>
            <p className="mt-0.5 text-sm font-medium text-ink">{nextAction.label}</p>
          </div>
          {nextAction.terminal ? (
            <span className="rounded-sm border border-rule bg-paper px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted">
              {nextAction.label}
            </span>
          ) : (
            roleHref && (
              <Button asChild variant="default" size="sm">
                <Link to={roleHref}>Open role board</Link>
              </Button>
            )
          )}
        </section>
      )}

      {/* Stage timeline */}
      <section aria-labelledby="c360-timeline">
        <header className="mb-3 flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-muted" aria-hidden />
          <span
            id="c360-timeline"
            className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted"
          >
            Stage timeline
          </span>
        </header>
        {missing.timeline ? (
          <div className="rounded-md border border-rule bg-paper-2 px-4 py-8 text-center text-sm text-ink-soft">
            No stages yet — this candidate hasn't been through a screen, fitment, or practical.
          </div>
        ) : (
          <ul className="divide-y divide-rule border-t border-rule">
            {timeline.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[7rem_1fr_auto] items-center gap-4 py-3"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      {meta.label}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm text-ink">{item.title}</span>
                    {item.status && (
                      <span className="ml-2 font-mono text-[11px] text-muted">{item.status}</span>
                    )}
                    {item.at && (
                      <span className="ml-2 font-mono tabular-nums text-[11px] text-muted">
                        {formatDate(item.at)}
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-sm text-ink">
                    {item.score === null ? "—" : item.score}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Spec 2: practical-defense authenticity verdict (behind defense_authenticity;
          renders only when the interview followed a scored practical). */}
      <AuthenticityVerdict report={view.defense} />

      {/* Fused role-TAG (reused marquee graph) + trust panel */}
      <section aria-labelledby="c360-skills">
        <header className="mb-3 flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-gold-ink" aria-hidden />
          <span
            id="c360-skills"
            className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink"
          >
            Talent analysis graph
          </span>
        </header>

        {missing.claims ? (
          <div className="rounded-md border border-rule bg-paper-2 px-4 py-8 text-center text-sm text-ink-soft">
            No fused skill evidence yet. Once this candidate completes a scored stage, their fused
            skill graph appears here.
          </div>
        ) : (
          <div className="space-y-4">
            <TalentAnalysisGraph nodes={graphNodes} roleTitle={roleTitle} mode="result" />

            {/* Trust panel — honest about the provenance gap. */}
            {verifiedClaimCount === 0 ? (
              <UnverifiedMark reason="These skill scores are model assessments. The fused role-tag payload doesn't yet carry per-skill grounding evidence, so none is shown against the transcript." />
            ) : (
              <p className="text-sm text-muted">
                <span className="font-mono tabular-nums text-ink">{verifiedClaimCount}</span> of{" "}
                <span className="font-mono tabular-nums text-ink">{claims.length}</span> skills grounded
                against the transcript.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Gap-vs-target (optional) — B3 summary headline + the per-skill detail. */}
      {!missing.gap && gap && (
        <section aria-labelledby="c360-gap">
          <SkillGapSummary data={summarizeFromGapResult(gap)} className="mb-4" />
          <header className="mb-3 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-muted" aria-hidden />
            <span
              id="c360-gap"
              className="font-mono uppercase tracking-[0.18em] text-[11px] text-muted"
            >
              Gap vs target
            </span>
            <span className="font-mono tabular-nums text-[11px] text-muted">
              {gap.summary.met_count}/{gap.summary.total} met
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() =>
                downloadGapCsv(
                  `skill-gap-${displayName.toLowerCase().replace(/\s+/g, "-")}-${new Date()
                    .toISOString()
                    .slice(0, 10)}.csv`,
                  gap,
                )
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV
            </Button>
          </header>
          <ul className="divide-y divide-rule border-t border-rule">
            {gap.gaps.map((g) => (
              <li
                key={g.canonical_id || g.skill_name}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-2.5"
              >
                <span className="text-sm text-ink">{g.skill_name}</span>
                <span className="font-mono tabular-nums text-[11px] text-muted">target {g.target}</span>
                <span className="font-mono tabular-nums text-[11px] text-ink-soft">
                  have {g.demonstrated}
                </span>
                <span
                  className={`font-mono tabular-nums text-sm ${g.met ? "text-success" : "text-danger"}`}
                >
                  {g.met ? "met" : `−${g.gap}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {roleHref && (
        <footer className="border-t border-rule pt-6">
          <Link
            to={roleHref}
            className="font-mono text-xs uppercase tracking-wider text-gold-ink hover:underline"
          >
            ← Back to role board
          </Link>
        </footer>
      )}
    </div>
  );
}

export default Candidate360Content;
