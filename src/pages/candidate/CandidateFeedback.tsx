/**
 * CandidateFeedback — the applicant's own per-skill interview summary
 * (route /candidate/feedback/:programId), P12.
 *
 * Consent-first + honest by construction:
 *   - Nothing about the interview is shown until the candidate agrees to the
 *     draft DPDP consent copy (the "I agree" button records consent, then the
 *     report loads). No skill data is fetched or rendered before that.
 *   - The report is status-only ({skillName, status}); it deliberately does NOT
 *     reuse the recruiter SkillGapSummary (which frames a numeric hire bar).
 *   - An unverified mark is ALWAYS present — these are AI assessments, not a
 *     verified score.
 *   - Degrades honestly: feature off / no consent / no evidence each render a
 *     calm state, never an all-gaps list.
 *
 * Entry points to this route must be gated behind useFlag('candidate_feedback')
 * (default-off); the pilot surfaces no link, so the page stays reachable-but-dark.
 * Sentence case, lucide icons, design tokens only.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClipboardList, ShieldCheck, CheckCircle2, TrendingUp, CircleDot, Loader2, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { UnverifiedMark } from "@/components/tag/UnverifiedMark";
import {
  candidateFeedbackApi,
  type CandidateFeedback as Feedback,
  type ConsentState,
  type FeedbackStatus,
} from "@/services/candidateFeedbackApi";

const UNVERIFIED_REASON =
  "These are AI assessments from your interview, not a verified score.";

// Candidate-tone status vocabulary — sentence case, no hire-bar framing. Colours
// come from the existing semantic status tokens (no raw tailwind colours).
const STATUS_META: Record<FeedbackStatus, { label: string; icon: LucideIcon; pill: string }> = {
  strong: { label: "Strong", icon: CheckCircle2, pill: "bg-success-soft text-success" },
  developing: { label: "Developing", icon: TrendingUp, pill: "bg-warning-soft text-warning" },
  gap: { label: "Area to grow", icon: CircleDot, pill: "bg-danger-soft text-danger" },
};

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const DEFAULT_CONSENT_TEXT =
  "I agree that FlowDot AI can show me a summary of my own interview — a " +
  "per-skill view of where I came across as strong and where I can grow. I " +
  "understand these are AI assessments from my interview, not a verified score, " +
  "and that this summary is kept for a limited time and then removed.";

export default function CandidateFeedback() {
  const { programId } = useParams<{ programId: string }>();
  const { account, logout } = useCandidateAuth();

  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!programId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await candidateFeedbackApi.getConsentState(programId);
      setConsent(c);
      // Consent-first: only reach for skill data once consent is on record.
      if (c.enabled && c.consented) {
        setFeedback(await candidateFeedbackApi.getFeedback(programId));
      } else {
        setFeedback(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your feedback.");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConsent = async () => {
    if (!programId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await candidateFeedbackApi.postConsent(programId, {
        version: consent?.consentVersion ?? undefined,
      });
      setConsent(res);
      if (res.enabled && res.consented) {
        setFeedback(await candidateFeedbackApi.getFeedback(programId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record your consent.");
    } finally {
      setSubmitting(false);
    }
  };

  const featureOff = consent != null && consent.enabled === false;
  const needsConsent = !loading && !error && consent != null && consent.enabled && !consent.consented;
  const retentionLabel = formatDate(feedback?.retentionUntil ?? consent?.retentionUntil);

  return (
    <div className="min-h-[100dvh] bg-paper-2">
      {/* Header — mirrors the applicant portal shell */}
      <header className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-ink">FlowDot AI</h1>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">
              Your feedback
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/candidate/dashboard" className="text-sm text-muted hover:text-ink">
              Dashboard
            </Link>
            <button onClick={logout} className="text-xs text-muted underline hover:text-danger">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-ink">Your interview feedback</h2>
          <p className="mt-1 text-sm text-muted">
            A per-skill view of how your interview came across — where you were strong and where
            there's room to grow.
            {account?.name ? ` For ${account.name}.` : ""}
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading your feedback…
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            {error && (
              <ErrorBanner
                tone="danger"
                title="Couldn't load your feedback"
                description={error}
                retryLabel="Try again"
                onRetry={load}
              />
            )}

            {/* The unverified mark is always present — these are AI assessments. */}
            {!error && <UnverifiedMark reason={UNVERIFIED_REASON} />}

            {/* Feature off (backend slice flag) — honest, calm notice. */}
            {!error && featureOff && (
              <EmptyState
                icon={ClipboardList}
                title="This feedback view isn't available yet"
                description="Your detailed feedback isn't ready to share here right now. Please check back later."
              />
            )}

            {/* Consent-first: no skill data until the candidate agrees. */}
            {!error && !featureOff && needsConsent && (
              <section className="rounded-md border border-rule bg-paper p-6">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-rule bg-paper-2">
                    <ShieldCheck className="h-4 w-4 text-gold-ink" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">
                      Before you see this
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-ink">
                      A quick consent, first
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                      {consent?.consentText || DEFAULT_CONSENT_TEXT}
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <Button variant="gold" onClick={handleConsent} disabled={submitting}>
                        {submitting ? "Saving…" : "I agree"}
                      </Button>
                      <span className="text-xs text-muted">
                        You can ask us to delete this anytime from your data settings.
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Consented — either the honest-empty state or the status-only list. */}
            {!error && !featureOff && consent?.consented && feedback && (
              <>
                {!feedback.ready ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Your detailed feedback isn't available yet"
                    description="Once your interview has been assessed, your per-skill summary will show up here."
                  />
                ) : (
                  <section className="overflow-hidden rounded-md border border-rule bg-paper">
                    <div className="flex items-baseline justify-between border-b border-rule px-5 py-3">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">
                        Per-skill summary
                      </p>
                      <span className="font-mono text-xs tabular-nums text-muted">
                        {feedback.items.length} skills
                      </span>
                    </div>
                    <ul className="divide-y divide-rule">
                      {feedback.items.map((item) => {
                        const meta = STATUS_META[item.status];
                        const Icon = meta.icon;
                        return (
                          <li
                            key={item.skillName}
                            className="flex items-center justify-between gap-4 px-5 py-3.5"
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-ink">
                              {item.skillName}
                            </span>
                            <span
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.pill}`}
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden />
                              {meta.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {retentionLabel && (
                      <p className="border-t border-rule px-5 py-3 text-xs text-muted">
                        Kept until {retentionLabel}, then removed.
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
