import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

export default function ClaimPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { claimPassword } = useCandidateAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Missing claim token in URL.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await claimPassword(token, password);
      navigate('/candidate/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Could not set password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-funnel-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-primary tracking-tight">FunnelHQ</h1>
          <p className="text-sm text-foreground-muted mt-1">Set your candidate password</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border p-6">
          <p className="text-sm text-foreground-muted mb-4">
            Set a password so you can sign in any time to see your interview
            invitations and results in one place.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-md text-sm"
            >
              {submitting ? 'Setting password…' : 'Set password and sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
