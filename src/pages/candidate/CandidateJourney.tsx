/**
 * CandidateJourney — the applicant's journey timeline (route /candidate/journeys).
 *
 * Complements the flat CandidateDashboard (which lists discrete invitations)
 * with a staged view: one JourneyTimeline rail per active program instance,
 * showing what's done, what's live now, and what's still locked.
 *
 * The page owns data + routing; JourneyTimeline stays dumb. The current-stage
 * CTA here is a placeholder navigation — the per-stage-type deep-link target
 * lands in the integration pass (see TODO in handleStageCta).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Map as MapIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { JourneyTimeline } from "@/components/candidate/JourneyTimeline";
import {
  getMyJourneys,
  type JourneyInstance,
  type JourneyStage,
} from "@/services/journeysApi";

/** Continue if any earlier stage is done; otherwise this is a fresh start. */
function ctaLabel(journey: JourneyInstance): "Start" | "Continue" {
  const started =
    journey.current_stage_index > 0 ||
    (journey.stages ?? []).some((s) => s.status === "done");
  return started ? "Continue" : "Start";
}

export default function CandidateJourney() {
  const { account, logout } = useCandidateAuth();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<JourneyInstance[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const token = localStorage.getItem("candidate_auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getMyJourneys()
      .then((data) => setJourneys(data.journeys))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load your journeys"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /**
   * Current-stage CTA handler.
   *
   * TODO(integration): route per stage.type to its deep link
   *   - interview     → /candidate/interviews/:id
   *   - scenario      → /candidate/assessment/:scenarioId
   *   - case|work_sample|defense → /candidate/assessment-artifact/:itemId
   * For now this is a placeholder so the rail is interactive end-to-end.
   */
  const handleStageCta = (journey: JourneyInstance, stage: JourneyStage) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[CandidateJourney] stage CTA", {
        journey_instance_id: journey.journey_instance_id,
        stage_id: stage.stage_id,
        type: stage.type,
      });
    }
    navigate("/candidate/dashboard");
  };

  return (
    <div className="min-h-[100dvh] bg-paper-2">
      {/* Header — mirrors the applicant dashboard shell */}
      <header className="border-b border-border bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-primary">FlowDot AI</h1>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">
              Applicant Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/candidate/dashboard" className="text-sm text-muted hover:text-primary">
              Dashboard
            </Link>
            <Link to="/candidate/profile" className="text-sm text-muted hover:text-primary">
              Profile
            </Link>
            <div className="flex items-center gap-2">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  account?.name || account?.email || "C",
                )}`}
                alt={account?.name || ""}
                className="h-8 w-8 rounded-full"
              />
              <button
                onClick={logout}
                className="text-xs text-muted underline hover:text-danger"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground">Your journeys</h2>
          <p className="mt-1 text-sm text-muted">
            Each program you're in, stage by stage — what's done, what's next.
          </p>
        </div>

        {loading && <div className="text-sm text-muted">Loading your journeys…</div>}

        {error && (
          <ErrorBanner
            tone="danger"
            title="Couldn't load your journeys"
            description={error}
            retryLabel="Try again"
            onRetry={load}
            className="mb-6"
          />
        )}

        {!loading && !error && journeys && journeys.length === 0 && (
          <EmptyState
            icon={MapIcon}
            title="No journeys yet"
            description="When a workspace enrols you in a multi-stage program, it'll show up here as a timeline."
          />
        )}

        {!loading && !error && journeys && journeys.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {journeys.map((journey) => (
              <section
                key={journey.journey_instance_id}
                className="rounded-xl border border-border bg-paper-2 p-5"
              >
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink">
                      Program
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                      {journey.program_id}
                    </h3>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                    {journey.current_stage_index + 1}/{journey.total_stages || journey.stages.length}
                  </span>
                </div>

                <JourneyTimeline
                  journey={journey}
                  renderCta={(stage) => (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleStageCta(journey, stage)}
                    >
                      {ctaLabel(journey)}
                    </Button>
                  )}
                />
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
