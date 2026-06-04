import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TalentAnalysisGraph, TagGraphNode } from '@/components/tag/TalentAnalysisGraph';
import { tagFromResult } from '@/components/tag/adapters';
import { Info } from 'lucide-react';

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface ResultsPayload {
  ready: boolean;
  message?: string;
  session_id?: string;
  results?: {
    overall_score?: number;
    recommendation?: string;
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    skill_evaluations?: any[];
    graph_data?: { nodes?: TagGraphNode[] };
    transferable_skills?: any[];
    domain?: string;
    evaluated_at?: string | null;
  };
}

// A0.10 / CR-04: never show raw recruiter enums (STRONG_HIRE / REJECT) to a
// candidate. Map each to candidate-appropriate, non-leaky language; anything
// unknown falls back to "Under review" rather than leaking the raw token.
const RECOMMENDATION_DISPLAY: Record<string, { label: string; cls: string }> = {
  STRONG_HIRE: { label: 'Strong performance', cls: 'bg-success-soft text-success border-rule' },
  ADVANCE_WITH_CONCERNS: { label: 'Solid — some areas to develop', cls: 'bg-success-soft text-success border-rule' },
  BORDERLINE: { label: 'Mixed signal', cls: 'bg-gold-soft text-gold-ink border-rule' },
  REJECT: { label: 'Room to develop', cls: 'bg-paper-3 text-ink-soft border-rule' },
  INCOMPLETE_INTERVIEW: { label: 'Interview incomplete', cls: 'bg-paper-3 text-ink-soft border-rule' },
  REVIEW_ERROR: { label: 'Under review', cls: 'bg-paper-3 text-ink-soft border-rule' },
};

function recommendationDisplay(rec?: string): { label: string; cls: string } {
  const fallback = { label: 'Under review', cls: 'bg-paper-3 text-ink-soft border-rule' };
  if (!rec) return fallback;
  const key = rec.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return RECOMMENDATION_DISPLAY[key] || fallback;
}

export default function CandidateResults() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('candidate_auth_token');
    if (!token) return;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE()}/api/candidate-me/interviews/${id}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`Failed to load (${resp.status})`);
        const json: ResultsPayload = await resp.json();
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper-2 flex items-center justify-center text-muted">
        Loading your results…
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-dvh bg-paper-2 flex items-center justify-center px-4">
        <div className="max-w-md bg-paper border border-border rounded-xl p-6 text-center">
          <h2 className="font-semibold mb-2">Couldn't load results</h2>
          <p className="text-sm text-muted mb-4">{error}</p>
          <Link to="/candidate/dashboard" className="text-primary underline text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
  if (!data?.ready) {
    return (
      <div className="min-h-dvh bg-paper-2 flex items-center justify-center px-4">
        <div className="max-w-md bg-paper border border-border rounded-xl p-6 text-center">
          <h2 className="font-semibold mb-2">Results not ready yet</h2>
          <p className="text-sm text-muted mb-4">
            {data?.message || 'Your interview is being reviewed. Check back shortly.'}
          </p>
          <Link to="/candidate/dashboard" className="text-primary underline text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const r = data.results || {};
  const nodes = (r.graph_data?.nodes || []) as TagGraphNode[];
  const hasBlueprintError =
    nodes.length > 0 &&
    nodes.every((n: any) =>
      (n?.skill_name || n?.name || n?.label || '').toLowerCase().includes('blueprint error')
    );

  return (
    <div className="min-h-dvh bg-paper-2">
      <header className="bg-paper border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/candidate/dashboard" className="text-sm text-primary hover:underline">
            ← Dashboard
          </Link>
          <h1 className="text-sm font-semibold">Your interview results</h1>
          <span />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {hasBlueprintError && (
          <div className="rounded-xl border border-rule bg-gold-soft p-4 text-sm text-gold-ink">
            This interview's blueprint was misconfigured by the recruiter, so the
            scores you see below are placeholders — not a real signal on your
            performance.
          </div>
        )}

        {/* Headline score + recommendation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-paper rounded-xl border border-border p-5">
            <p className="text-[10px] text-muted font-semibold mb-2">
              Overall summary
            </p>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {r.summary || 'No summary available for this interview.'}
            </p>
          </div>

          <div className="bg-paper rounded-xl border border-border p-5 flex flex-col items-center justify-center">
            <p className="text-[10px] text-muted font-semibold mb-2">
              Score
            </p>
            <div className="text-5xl font-light text-primary">
              {r.overall_score != null ? r.overall_score : '—'}
              <span className="text-base text-muted">/100</span>
            </div>
            <span
              className={`mt-3 inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${recommendationDisplay(r.recommendation).cls}`}
            >
              {recommendationDisplay(r.recommendation).label}
            </span>
          </div>
        </div>

        {/* A0.10 / CR-04: human-in-the-loop disclaimer — prominent, not buried.
            The candidate must understand this is one input, not an automated
            decision (EU AI Act Art. 13 transparency / DPDP). */}
        <div className="bg-paper rounded-xl border border-border p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-foreground/80">
            This is an AI-assisted assessment — one input among several. A member of the
            hiring team reviews these results and makes the final decision. You can request an
            explanation or correction of your data from your account settings.
          </p>
        </div>

        {/* TAG */}
        {nodes.length > 0 && (
          <div className="bg-paper rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Talent Analysis Graph</h2>
              <span className="text-[10px] text-muted">
                Click any skill for evidence
              </span>
            </div>
            <TalentAnalysisGraph
              data={tagFromResult({ graph_data: r.graph_data || { nodes } } as any, (r as any).role || 'Role')}
              mode="result"
            />
          </div>
        )}

        {/* Strengths + Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-paper rounded-xl border border-border p-5">
            <p className="text-[10px] text-success font-semibold mb-2">
              Strengths
            </p>
            {(r.strengths || []).length === 0 ? (
              <p className="text-sm text-muted">No strengths recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm text-foreground/85 list-disc pl-5">
                {(r.strengths || []).map((s, i) => (
                  <li key={i}>{typeof s === 'string' ? s : (s as any)?.description || JSON.stringify(s)}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-paper rounded-xl border border-border p-5">
            <p className="text-[10px] text-danger font-semibold mb-2">
              Areas to develop
            </p>
            {(r.gaps || []).length === 0 ? (
              <p className="text-sm text-muted">No gaps recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm text-foreground/85 list-disc pl-5">
                {(r.gaps || []).map((g, i) => (
                  <li key={i}>{typeof g === 'string' ? g : (g as any)?.description || JSON.stringify(g)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="text-xs text-muted">
          Evaluated {r.evaluated_at ? new Date(r.evaluated_at).toLocaleString() : '—'}.
          Hiring decisions remain with the recruiter — this graph is shared for transparency.
        </p>
      </main>
    </div>
  );
}
