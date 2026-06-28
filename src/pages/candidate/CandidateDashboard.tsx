import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { StatusDot } from '@/components/ui/status-dot';
import { Link, useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

interface Invitation {
  id: string;
  item_kind?: 'interview' | 'assessment';
  candidate_id?: string;
  invitation_token: string;
  candidate_email: string;
  candidate_name: string;
  status: string;
  interview_id: string;
  // True when this interview folds in a work sample the candidate must submit.
  has_work_sample?: boolean;
  interview_type: 'screening' | 'fitment';
  interview_title?: string;
  interview_description?: string;
  interview_duration?: number | string;
  workspace_id?: string;
  project_id?: string;
  created_at?: string;
  registered_at?: string;
  completed_at?: string;
  expires_at?: string;
  // assessment assignments (item_kind === 'assessment')
  assessment_mode?: 'scenario' | 'case' | 'work_sample' | 'defense';
  assessment_item_id?: string;
  assessment_domain?: string;
}

/** Route a candidate to the right assessment surface for its mode. */
function assessmentPath(inv: Invitation): string | null {
  const itemId = inv.assessment_item_id;
  if (!itemId) return null;
  const cid = inv.candidate_id || '';
  const domain = inv.assessment_domain || 'finance';
  const qs = `candidateId=${encodeURIComponent(cid)}&domain=${encodeURIComponent(domain)}`;
  // scenario has its own page; case/work_sample/defense share the artifact page.
  return inv.assessment_mode === 'scenario'
    ? `/candidate/assessment/${encodeURIComponent(itemId)}?${qs}`
    : `/candidate/assessment-artifact/${encodeURIComponent(itemId)}?${qs}&mode=${encodeURIComponent(inv.assessment_mode || 'case')}`;
}

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

const STATUS_GROUPS: Record<string, 'active' | 'completed' | 'closed'> = {
  pending: 'active',
  link_clicked: 'active',
  registered: 'active',
  scheduling: 'active',
  started: 'active',
  paused: 'active',
  completed: 'completed',
  cancelled: 'closed',
  expired: 'closed',
};

const groupOf = (status?: string) => STATUS_GROUPS[(status || '').toLowerCase()] || 'active';

function StatusBadge({ status }: { status?: string }) {
  const group = groupOf(status);
  const cls =
    group === 'completed'
      ? 'bg-success-soft text-success border-rule'
      : group === 'closed'
      ? 'bg-paper-3 text-muted border-rule'
      : 'bg-accent/10 text-primary border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px]   font-semibold rounded border ${cls}`}
    >
      {(status || 'pending').replace(/_/g, ' ')}
    </span>
  );
}

/**
 * F24.6: applicant-side "analyzing" pill.
 *
 * Heuristic — completed within the last 5 minutes = TAG still being scored.
 * The reviewer agent typically finishes within 1–2 min; 5 min is the soft
 * upper bound from F19's portal-load measurements.
 */
function isAnalyzing(inv: Invitation): boolean {
  if (groupOf(inv.status) !== 'completed') return false;
  if (!inv.completed_at) return true; // completed flag set but no timestamp — assume in-flight
  const completedMs = new Date(inv.completed_at).getTime();
  if (Number.isNaN(completedMs)) return false;
  return Date.now() - completedMs < 5 * 60_000;
}

const ASSESSMENT_KIND_LABEL: Record<string, string> = {
  scenario: 'Scenario assessment',
  case: 'Case study',
  work_sample: 'Work-sample',
  defense: 'Defense round',
};

function InvitationCard({ inv }: { inv: Invitation }) {
  const navigate = useNavigate();
  const group = groupOf(inv.status);
  const analyzing = isAnalyzing(inv);
  const isAssessment = inv.item_kind === 'assessment';
  // Work-sample interview: surface a sub-label and route the primary action
  // to the interview-keyed work-sample submit page (only while still active).
  const hasWorkSample = !isAssessment && inv.has_work_sample === true;
  const showWorkSample = hasWorkSample && group !== 'completed';

  const kindLabel = isAssessment
    ? ASSESSMENT_KIND_LABEL[inv.assessment_mode || 'scenario'] || 'Assessment'
    : inv.interview_type === 'fitment'
    ? 'Fitment interview'
    : 'Screening interview';

  const cta = isAssessment
    ? group === 'completed'
      ? 'Submitted'
      : 'Start assessment'
    : group === 'completed'
    ? analyzing ? 'Results coming soon' : 'View results'
    : showWorkSample
    ? 'Start work sample'
    : inv.status === 'started' || inv.status === 'paused'
    ? 'Resume interview'
    : 'Start interview';

  const assessmentDest = isAssessment ? assessmentPath(inv) : null;
  const ctaDisabled = isAssessment
    ? group === 'completed' || !assessmentDest
    : analyzing;

  const onClick = () => {
    if (isAssessment) {
      if (assessmentDest) navigate(assessmentDest);
      return;
    }
    if (group === 'completed') {
      navigate(`/candidate/interviews/${inv.interview_id}/results`);
    } else if (showWorkSample) {
      const ws = encodeURIComponent(inv.workspace_id || '');
      const pr = encodeURIComponent(inv.project_id || '');
      navigate(
        `/candidate/interview/${encodeURIComponent(inv.interview_id)}/work-sample?ws=${ws}&pr=${pr}`,
      );
    } else {
      navigate(`/candidate/interviews/${inv.interview_id}`);
    }
  };

  const duration = inv.interview_duration != null ? `${inv.interview_duration} min` : null;

  return (
    <div className="bg-paper rounded-xl border border-border shadow-1 p-5 flex flex-col gap-3 hover:border-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] text-muted font-semibold">{kindLabel}</p>
          <h3 className="text-lg font-semibold text-foreground leading-tight mt-1">
            {inv.interview_title || (isAssessment ? 'Assessment' : 'Interview')}
          </h3>
          {showWorkSample && (
            <p className="text-xs text-gold-ink font-medium mt-1">Work sample required</p>
          )}
        </div>
        <StatusBadge status={inv.status} />
      </div>

      {inv.interview_description && (
        <p className="text-sm text-muted line-clamp-3">{inv.interview_description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted">
        {duration && <span>{duration}</span>}
        {inv.completed_at && (
          <span>Completed {new Date(inv.completed_at).toLocaleDateString()}</span>
        )}
        {analyzing && <StatusDot variant="pending" pulse label="Analyzing" />}
      </div>

      <button
        onClick={onClick}
        disabled={ctaDisabled}
        className="mt-auto h-9 bg-primary hover:bg-primary/90 text-paper text-sm font-medium rounded-md transition-colors disabled:bg-paper-3 disabled:text-muted disabled:cursor-not-allowed"
      >
        {cta}
      </button>
    </div>
  );
}

type PracticalCard = {
  practical_id: string;
  title: string;
  program_title?: string | null;
  status: string;
  register_url: string;
};
type JourneyCard = {
  journey_instance_id: string;
  program_title?: string | null;
  status: string;
  current_stage_id?: string | null;
  current_stage_index: number;
  total_stages: number;
  stages?: Array<{
    stage_id?: string;
    title?: string;
    type?: string;
    candidate_action_url?: string | null;
  }>;
};

export default function CandidateDashboard() {
  const { account, logout } = useCandidateAuth();
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [practicals, setPracticals] = useState<PracticalCard[]>([]);
  const [journeys, setJourneys] = useState<JourneyCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('candidate_auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    (async () => {
      try {
        const resp = await fetch(`${API_BASE()}/api/candidate-me/invitations`, auth);
        if (!resp.ok) throw new Error(`Failed to load (${resp.status})`);
        const data = await resp.json();
        setInvitations(data.invitations || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load invitations');
      } finally {
        setLoading(false);
      }
      // Practicals + journeys are best-effort — never block the dashboard.
      try {
        const r = await fetch(`${API_BASE()}/api/candidate-me/practicals`, auth);
        if (r.ok) setPracticals((await r.json()).practicals || []);
      } catch { /* noop */ }
      try {
        const r = await fetch(`${API_BASE()}/api/candidate-me/journeys`, auth);
        if (r.ok) setJourneys((await r.json()).journeys || []);
      } catch { /* noop */ }
    })();
  }, []);

  const active = (invitations || []).filter((i) => groupOf(i.status) === 'active');
  const completed = (invitations || []).filter((i) => groupOf(i.status) === 'completed');
  const closed = (invitations || []).filter((i) => groupOf(i.status) === 'closed');
  // A practical the candidate hasn't finished yet is still actionable.
  const openPracticals = practicals.filter(
    (p) => !['submitted', 'completed', 'report_ready'].includes((p.status || '').toLowerCase()),
  );
  const hasAnything =
    (invitations?.length || 0) > 0 || openPracticals.length > 0 || journeys.length > 0;

  return (
    <div className="min-h-dvh bg-paper-2">
      {/* Header */}
      <header className="bg-paper border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-primary tracking-tight">FlowDot AI</h1>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Applicant Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/candidate/profile-tag"
              className="text-sm text-muted hover:text-primary"
            >
              Insights
            </Link>
            <Link
              to="/candidate/profile"
              className="text-sm text-muted hover:text-primary"
            >
              Profile
            </Link>
            <Link
              to="/candidate/settings"
              className="text-sm text-muted hover:text-primary"
            >
              Settings
            </Link>
            <div className="flex items-center gap-2">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  account?.name || account?.email || 'C'
                )}`}
                alt={account?.name || ''}
                className="w-8 h-8 rounded-full"
              />
              <button
                onClick={logout}
                className="text-xs text-muted hover:text-danger underline"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hello */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome back, {account?.name || account?.email}
          </h2>
          <p className="text-sm text-muted mt-1">
            Your assessments and TAG reports across every FlowDot AI workspace.
          </p>
        </div>

        {loading && (
          <div className="text-muted text-sm">Loading your invitations…</div>
        )}

        {error && (
          <ErrorBanner
            tone="danger"
            title="Couldn't load your invitations"
            description={error}
            className="mb-6"
          />
        )}

        {!loading && !error && !hasAnything && (
          <EmptyState
            icon={Mail}
            title="No invitations yet"
            description="When a workspace invites you to an assessment, it'll show up here."
          />
        )}

        {!loading && !error && hasAnything && (
          <div className="space-y-10">
            {journeys.length > 0 && (
              <Section title="Evaluation journeys" count={journeys.length}>
                {journeys.map((j) => (
                  <JourneyDashCard key={j.journey_instance_id} j={j} />
                ))}
              </Section>
            )}
            {openPracticals.length > 0 && (
              <Section title="Practical assignments" count={openPracticals.length}>
                {openPracticals.map((p) => (
                  <PracticalDashCard key={p.practical_id} p={p} />
                ))}
              </Section>
            )}
            {active.length > 0 && (
              <Section title="Active" count={active.length}>
                {active.map((inv) => (
                  <InvitationCard key={inv.id} inv={inv} />
                ))}
              </Section>
            )}
            {completed.length > 0 && (
              <Section title="Completed" count={completed.length}>
                {completed.map((inv) => (
                  <InvitationCard key={inv.id} inv={inv} />
                ))}
              </Section>
            )}
            {closed.length > 0 && (
              <Section title="Closed" count={closed.length}>
                {closed.map((inv) => (
                  <InvitationCard key={inv.id} inv={inv} />
                ))}
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted">{count}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </section>
  );
}

/** A standalone practical assignment. The candidate is already signed in here,
 *  so the register link opens straight into the submit flow. */
function PracticalDashCard({ p }: { p: PracticalCard }) {
  return (
    <div className="rounded-xl border border-border bg-paper p-5 flex flex-col">
      <p className="font-mono uppercase tracking-[0.14em] text-[10px] text-gold-ink mb-2">
        Work sample
      </p>
      <h4 className="text-base font-semibold text-foreground">{p.title}</h4>
      <p className="text-sm text-muted mt-1 flex-1">
        Upload your deliverable and a short note, then defend your key choices.
      </p>
      <Link
        to={p.register_url}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Start assignment
      </Link>
    </div>
  );
}

/** An evaluation journey — links to the full timeline. */
function JourneyDashCard({ j }: { j: JourneyCard }) {
  const navigate = useNavigate();
  const total = j.total_stages || (j.stages?.length ?? 0);
  const current = j.stages?.[j.current_stage_index];
  const actionUrl = current?.candidate_action_url || null;

  // Route straight to the current stage when the workspace has started it
  // (absolute URLs hard-nav; relative route in-app); else open the full timeline.
  const go = () => {
    if (actionUrl) {
      if (/^https?:\/\//i.test(actionUrl)) window.location.href = actionUrl;
      else navigate(actionUrl);
      return;
    }
    navigate('/candidate/journeys');
  };

  return (
    <div className="rounded-xl border border-border bg-paper p-5 flex flex-col">
      <p className="font-mono uppercase tracking-[0.14em] text-[10px] text-gold-ink mb-2">
        Evaluation journey
      </p>
      <h4 className="text-base font-semibold text-foreground">
        {j.program_title || 'Your journey'}
      </h4>
      <p className="text-sm text-muted mt-1 flex-1">
        {current?.title ? `${current.title} · ` : ''}
        Stage {Math.min(j.current_stage_index + 1, total)} of {total}
        {current?.type ? ` · ${current.type.replace(/_/g, ' ')}` : ''}
      </p>
      <button
        type="button"
        onClick={go}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {actionUrl ? 'Continue' : 'Open journey'}
      </button>
    </div>
  );
}
