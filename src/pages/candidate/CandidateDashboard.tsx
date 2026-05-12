import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

interface Invitation {
  id: string;
  invitation_token: string;
  candidate_email: string;
  candidate_name: string;
  status: string;
  interview_id: string;
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
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : group === 'closed'
      ? 'bg-gray-100 text-gray-600 border-gray-200'
      : 'bg-accent/10 text-primary border-accent/30';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded border ${cls}`}
    >
      {(status || 'pending').replace(/_/g, ' ')}
    </span>
  );
}

function InvitationCard({ inv }: { inv: Invitation }) {
  const navigate = useNavigate();
  const group = groupOf(inv.status);
  const cta =
    group === 'completed'
      ? 'View results'
      : inv.status === 'started' || inv.status === 'paused'
      ? 'Resume interview'
      : 'Start interview';
  const onClick = () => {
    if (group === 'completed') {
      navigate(`/candidate/interviews/${inv.interview_id}/results`);
    } else {
      navigate(`/candidate/interviews/${inv.interview_id}`);
    }
  };

  const duration = inv.interview_duration != null ? `${inv.interview_duration} min` : null;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3 hover:border-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-semibold">
            {inv.interview_type === 'fitment' ? 'Fitment interview' : 'Screening interview'}
          </p>
          <h3 className="text-lg font-semibold text-foreground leading-tight mt-1">
            {inv.interview_title || 'Interview'}
          </h3>
        </div>
        <StatusBadge status={inv.status} />
      </div>

      {inv.interview_description && (
        <p className="text-sm text-foreground-muted line-clamp-3">{inv.interview_description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-foreground-muted">
        {duration && <span>{duration}</span>}
        {inv.completed_at && (
          <span>Completed {new Date(inv.completed_at).toLocaleDateString()}</span>
        )}
      </div>

      <button
        onClick={onClick}
        className="mt-auto h-9 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-md"
      >
        {cta}
      </button>
    </div>
  );
}

export default function CandidateDashboard() {
  const { account, logout } = useCandidateAuth();
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('candidate_auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE()}/api/candidate-me/invitations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`Failed to load (${resp.status})`);
        const data = await resp.json();
        setInvitations(data.invitations || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load invitations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = (invitations || []).filter((i) => groupOf(i.status) === 'active');
  const completed = (invitations || []).filter((i) => groupOf(i.status) === 'completed');
  const closed = (invitations || []).filter((i) => groupOf(i.status) === 'closed');

  return (
    <div className="min-h-screen bg-funnel-cream">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-primary tracking-tight">FunnelHQ</h1>
            <span className="text-xs uppercase tracking-wider text-foreground-muted">
              Candidate Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/candidate/profile"
              className="text-sm text-foreground-muted hover:text-primary"
            >
              Profile
            </Link>
            <Link
              to="/candidate/settings"
              className="text-sm text-foreground-muted hover:text-primary"
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
                className="text-xs text-foreground-muted hover:text-red-600 underline"
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
          <p className="text-sm text-foreground-muted mt-1">
            Your interviews and results across every FunnelHQ recruiter.
          </p>
        </div>

        {loading && (
          <div className="text-foreground-muted text-sm">Loading your invitations…</div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">
            {error}
          </div>
        )}

        {!loading && !error && invitations && invitations.length === 0 && (
          <div className="bg-white border border-border rounded-xl p-8 text-center">
            <h3 className="text-lg font-semibold text-foreground">No invitations yet</h3>
            <p className="text-sm text-foreground-muted mt-2">
              When a recruiter invites you to an interview, it will show up here.
            </p>
          </div>
        )}

        {!loading && !error && invitations && invitations.length > 0 && (
          <div className="space-y-10">
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
        <h3 className="text-sm uppercase tracking-widest font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-foreground-muted">{count}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </section>
  );
}
