/**
 * CandidateProfileTag — the post-skill-analysis profile view.
 *
 * Shows: narrative summary at top, journey timeline in the middle,
 * skill graph (TAG) at the bottom. Reuses TalentAnalysisGraph (existing,
 * generic) for the graph and JourneyTimeline (new) for the lifetime view.
 *
 * Data source: GET /api/candidates/{candidate_id}/profile-tag
 * → candidate_profile_tags/{candidate_id} doc.
 *
 * Phase 1.6 writes this doc post-skill_analysis interview via the profile
 * synthesizer. The doc is keyed by candidate_id (not session_id), so
 * subsequent skill_analysis interviews extend rather than replace.
 *
 * Empty state: shown when the candidate hasn't completed a skill_analysis
 * interview yet. Points at /interviews to start one.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Sparkles, Calendar, Lightbulb, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  TalentAnalysisGraph,
  type TagGraphNode,
} from "@/components/tag/TalentAnalysisGraph";
import { JourneyTimeline, type JourneyNode } from "@/components/profile/JourneyTimeline";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageSpinner } from "@/components/ui/spinner";
import {
  useReviewerStatus,
  useRetryReviewer,
} from "@/queries/useReviewerStatus";

const API_BASE = () =>
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

type NarrativeTag =
  | "generalist_climbing"
  | "specialist_deepening"
  | "pivoter"
  | "recent_returnee"
  | "high_intensity_recent"
  | "consistent_trajectory";

const NARRATIVE_LABEL: Record<NarrativeTag, string> = {
  generalist_climbing: "Generalist climbing",
  specialist_deepening: "Specialist deepening",
  pivoter: "Career pivoter",
  recent_returnee: "Recent returnee",
  high_intensity_recent: "High intensity, recent",
  consistent_trajectory: "Consistent trajectory",
};

interface SkillClaim {
  id: string;
  canonical_id?: string | null;
  raw_name: string;
  apparent_level?: string;
  validated_level?: string | null;
  evidence?: string[];
}

interface ProfileTagDoc {
  candidate_id: string;
  session_id: string;
  journey_nodes: JourneyNode[];
  skill_claims: SkillClaim[];
  skill_graph?: {
    nodes?: TagGraphNode[];
    edges?: any[];
    annotations?: any[];
  } | null;
  narrative_summary: string;
  narrative_tags: NarrativeTag[];
  strong_signals: string[];
  open_questions_remaining: string[];
  generated_at?: string;
  reviewer_version?: string;
  previous_versions?: Array<{ session_id: string; generated_at: string }>;
}

interface ApiResponse {
  success: boolean;
  candidate_id: string;
  profile_tag: ProfileTagDoc | null;
  sources?: { resume_url?: string; linkedin_url?: string; portfolio_url?: string } | null;
  // Round 3 R3: latest skill_analysis session for this candidate.
  // Lets the page distinguish "no interview yet" from "interview just
  // wrapped, reviewer pending" or "reviewer errored".
  latest_session?: {
    session_id?: string;
    interview_id?: string;
    completed_at?: string | null;
    reviewer_status?:
      | "pending"
      | "ready"
      | "error"
      | "out_of_scope"
      | "incomplete"
      | null;
    reviewer_error?: string | null;
  } | null;
}

export default function CandidateProfileTag() {
  // Two entry modes:
  //   /candidates/:candidateId/profile-tag      (recruiter view)
  //   /me/profile-tag                            (candidate viewing self)
  // The URL param is optional; when absent we fall back to the auth context
  // (the route guard ensures one of the two is set before mount).
  const { candidateId: paramCandidateId } = useParams<{ candidateId?: string }>();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const candidateId = paramCandidateId || localStorage.getItem("candidate_id") || "";

  useEffect(() => {
    if (!candidateId) {
      setError("No candidate ID — sign in or open from a candidate page.");
      setLoading(false);
      return;
    }
    const wsToken = localStorage.getItem("auth_token");
    const candidateToken = localStorage.getItem("candidate_auth_token");
    const token = candidateToken || wsToken;
    if (!token) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await fetch(
          `${API_BASE()}/api/candidates/${encodeURIComponent(candidateId)}/profile-tag`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!resp.ok) {
          throw new Error(`Failed to load profile (${resp.status})`);
        }
        const json = (await resp.json()) as ApiResponse;
        setData(json);
      } catch (err: any) {
        setError(err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [candidateId]);

  const tagDataForGraph = useMemo(() => {
    const nodes = data?.profile_tag?.skill_graph?.nodes ?? [];
    if (nodes.length === 0) return null;
    // TalentAnalysisGraph accepts both shapes; passing nodes-only is enough.
    return { nodes };
  }, [data]);

  // Round 3 R3.2: poll reviewer status while the latest skill_analysis
  // session is still being reviewed. The hook auto-stops once status
  // leaves "pending"/"unknown".
  const latestSession = data?.latest_session ?? null;
  const reviewerStatusQ = useReviewerStatus(
    latestSession?.interview_id,
    latestSession?.session_id,
    {
      // Only poll when we have a session but no profile_tag yet (or the
      // session itself is in error). Once the profile_tag is rendered,
      // polling adds no value.
      enabled: Boolean(
        latestSession?.session_id &&
          (data?.profile_tag == null ||
            latestSession?.reviewer_status === "error" ||
            latestSession?.reviewer_status === "pending"),
      ),
    },
  );
  const retryMutation = useRetryReviewer();
  // The live status the page should branch on: prefer the polled value
  // (fresher), fall back to the value embedded in the GET response.
  const liveStatus =
    reviewerStatusQ.data?.status ?? latestSession?.reviewer_status ?? null;
  const liveError =
    reviewerStatusQ.data?.error ?? latestSession?.reviewer_error ?? null;

  if (loading) {
    return <PageSpinner label="Loading profile" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <ErrorBanner title="Profile error" description={error} />
      </div>
    );
  }

  const profileTag = data?.profile_tag;

  // Round 3 R3.2: branch the empty-state on reviewer status.
  if (!profileTag) {
    // (a) Interview completed, reviewer still running → "Generating"
    if (liveStatus === "pending" || liveStatus === "unknown") {
      return (
        <div className="mx-auto max-w-4xl px-6 py-10">
          <EmptyState
            icon={Loader2}
            title="Generating profile"
            description="The skill analysis interview just wrapped. The reviewer is synthesising the journey, skill graph, and narrative now — this usually takes 30 to 60 seconds. The page refreshes automatically."
          />
        </div>
      );
    }

    // (b) Reviewer errored → retry affordance
    if (liveStatus === "error") {
      const interviewId = latestSession?.interview_id;
      const sessionId = latestSession?.session_id;
      return (
        <div className="mx-auto max-w-4xl px-6 py-10 space-y-4">
          <ErrorBanner
            title="Profile generation failed"
            description={
              liveError ||
              "The reviewer didn't finish synthesising the profile. You can retry now or contact support if it keeps failing."
            }
          />
          {interviewId && sessionId && (
            <Button
              onClick={() =>
                retryMutation.mutate({ interviewId, sessionId })
              }
              disabled={retryMutation.isPending}
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryMutation.isPending ? "Restarting…" : "Retry"}
            </Button>
          )}
        </div>
      );
    }

    // (c) Interview too short to score
    if (liveStatus === "incomplete") {
      return (
        <div className="mx-auto max-w-4xl px-6 py-10">
          <EmptyState
            icon={AlertCircle}
            title="Interview too short to profile"
            description="The skill analysis interview didn't capture enough substantive responses to build a profile. Reschedule the interview or contact the candidate for a fresh attempt."
            primaryAction={{
              label: "Start a new skill analysis",
              href: "/interviews",
              variant: "gold",
            }}
          />
        </div>
      );
    }

    // (d) Admission rejected at reviewer time (rare backstop)
    if (liveStatus === "out_of_scope") {
      return (
        <div className="mx-auto max-w-4xl px-6 py-10">
          <EmptyState
            icon={AlertCircle}
            title="Candidate outside our scope"
            description="This candidate's profile reads as non-finance. FunnelHQ supports India finance hiring only — accounting, taxation, and management consulting."
          />
        </div>
      );
    }

    // (e) Default: no interview yet
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EmptyState
          icon={Sparkles}
          title="No profile yet"
          description="A profile is generated after the candidate completes a skill analysis interview. Once the interview wraps, this page populates with the journey timeline, skill graph, and narrative."
          primaryAction={{
            label: "Start a skill analysis interview",
            href: "/interviews",
            variant: "gold",
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      {/* Header */}
      <header>
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
          Profile
        </span>
        <h1 className="mt-1 text-3xl font-semibold text-ink">
          Talent profile snapshot
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          {profileTag.generated_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono tabular-nums">
                {new Date(profileTag.generated_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </span>
          )}
          {profileTag.reviewer_version && (
            <span className="font-mono text-xs text-muted">
              {profileTag.reviewer_version}
            </span>
          )}
          {profileTag.previous_versions && profileTag.previous_versions.length > 0 && (
            <span className="text-xs text-muted">
              {profileTag.previous_versions.length} prior snapshot
              {profileTag.previous_versions.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </header>

      {/* Narrative */}
      <section>
        <p className="text-base leading-relaxed text-ink">
          {profileTag.narrative_summary}
        </p>
        {profileTag.narrative_tags && profileTag.narrative_tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profileTag.narrative_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm border border-rule bg-paper-2 px-2 py-0.5 font-mono text-[11px] text-ink-soft"
              >
                {NARRATIVE_LABEL[tag] || tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Strong signals + open questions side by side */}
      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <header className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-gold-ink" aria-hidden />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Strong signals
            </span>
          </header>
          {profileTag.strong_signals?.length > 0 ? (
            <ul className="divide-y divide-rule">
              {profileTag.strong_signals.map((s, idx) => (
                <li key={idx} className="py-2.5 text-sm leading-relaxed text-ink">
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">None recorded.</p>
          )}
        </div>
        <div>
          <header className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-muted" aria-hidden />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Open questions
            </span>
          </header>
          {profileTag.open_questions_remaining?.length > 0 ? (
            <ul className="divide-y divide-rule">
              {profileTag.open_questions_remaining.map((q, idx) => (
                <li key={idx} className="py-2.5 text-sm leading-relaxed text-ink-soft">
                  {q}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              All resume gaps surfaced were addressed.
            </p>
          )}
        </div>
      </section>

      {/* Journey */}
      <section>
        <header className="mb-4">
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
            Journey
          </span>
          <h2 className="mt-1 text-xl font-medium text-ink">
            Lifetime trajectory
          </h2>
        </header>
        <JourneyTimeline
          nodes={profileTag.journey_nodes}
          emptyLabel="No journey nodes recorded for this profile."
        />
      </section>

      {/* Skill graph */}
      {tagDataForGraph && (
        <section>
          <header className="mb-4">
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Talent analysis graph
            </span>
            <h2 className="mt-1 text-xl font-medium text-ink">
              Validated skill graph
            </h2>
          </header>
          <TalentAnalysisGraph nodes={tagDataForGraph.nodes ?? []} roleTitle="" />
        </section>
      )}

      {/* Skill claims fallback (no graph) — show as a dense table */}
      {!tagDataForGraph && profileTag.skill_claims.length > 0 && (
        <section>
          <header className="mb-4">
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Skills
            </span>
            <h2 className="mt-1 text-xl font-medium text-ink">
              Claims surfaced ({profileTag.skill_claims.length})
            </h2>
            <p className="mt-1 text-sm text-muted">
              Skill graph not built yet — the interview was thin on validated
              evidence. Run another skill analysis to deepen the signal.
            </p>
          </header>
          <ul className="divide-y divide-rule">
            {profileTag.skill_claims.map((claim) => (
              <li
                key={claim.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2.5"
              >
                <span className="text-sm text-ink">{claim.raw_name}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {claim.validated_level ?? claim.apparent_level ?? "—"}
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {claim.canonical_id ?? "uncanonicalized"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer / actions */}
      <footer className="border-t border-rule pt-6">
        <Link
          to="/interviews"
          className="font-mono text-xs uppercase tracking-wider text-gold-ink hover:underline"
        >
          ← Back to interviews
        </Link>
      </footer>
    </div>
  );
}
