import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface InterviewDetail {
  interview_id: string;
  title?: string;
  description?: string;
  duration?: number | string;
  type?: 'screening' | 'fitment';
  voiceSpeed?: string;
  voiceAccent?: string;
  invitation: {
    id: string;
    invitation_token: string;
    status: string;
    completed_at?: string | null;
  };
}

export default function CandidateInterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<InterviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('candidate_auth_token');
    if (!token) return;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE()}/api/candidate-me/interviews/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`Failed to load (${resp.status})`);
        const json = await resp.json();
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-funnel-cream flex items-center justify-center text-foreground-muted">
        Loading interview…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-funnel-cream flex items-center justify-center px-4">
        <div className="max-w-md bg-white border border-border rounded-xl p-6 text-center">
          <h2 className="font-semibold mb-2">Interview not found</h2>
          <p className="text-sm text-foreground-muted mb-4">{error}</p>
          <Link to="/candidate/dashboard" className="text-primary underline text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const inv = data.invitation;
  const isCompleted = inv.status === 'completed';
  const canStart = ['pending', 'link_clicked', 'registered', 'scheduling'].includes(
    inv.status?.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-funnel-cream">
      <header className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/candidate/dashboard" className="text-sm text-primary hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-sm font-semibold tracking-wider uppercase">{data.title}</h1>
          <span />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-semibold mb-2">
            {data.type === 'fitment' ? 'Fitment interview' : 'Screening interview'}
          </p>
          <h2 className="text-2xl font-semibold mb-4">{data.title}</h2>

          <div className="flex items-center gap-4 text-xs text-foreground-muted mb-6">
            {data.duration != null && <span>{data.duration} min</span>}
            <span>Status: {inv.status?.replace(/_/g, ' ')}</span>
            {inv.completed_at && (
              <span>Submitted {new Date(inv.completed_at).toLocaleString()}</span>
            )}
          </div>

          {data.description && (
            <p className="text-sm text-foreground/80 leading-relaxed mb-6">{data.description}</p>
          )}

          <div className="border-t border-border pt-5 flex flex-wrap items-center gap-3">
            {isCompleted && (
              <button
                onClick={() => navigate(`/candidate/interviews/${data.interview_id}/results`)}
                className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-medium rounded-md text-sm"
              >
                View results
              </button>
            )}
            {canStart && (
              <button
                onClick={() =>
                  navigate(`/interview/${data.interview_id}/pre-check`)
                }
                className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-medium rounded-md text-sm"
              >
                Start interview
              </button>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="h-10 px-5 border border-border bg-white hover:border-accent text-foreground font-medium rounded-md text-sm"
            >
              Copy share link
            </button>
          </div>
        </div>

        {isCompleted && (
          <div className="mt-6 text-sm text-foreground-muted">
            <p>
              Your full Talent Analysis Graph (TAG) and recruiter summary are available
              in your results.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
