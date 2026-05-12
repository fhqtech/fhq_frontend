import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

export default function CandidateLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useCandidateAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/candidate/dashboard';

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-funnel-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-primary tracking-tight">FunnelHQ</h1>
          <p className="text-sm text-foreground-muted mt-1">Candidate sign in</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-accent"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:border-accent"
                placeholder="Your password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full h-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-md text-sm"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-foreground-muted">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={loginWithGoogle}
            type="button"
            className="w-full h-10 border border-border hover:border-accent bg-white text-foreground rounded-md text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.333z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 text-center text-xs text-foreground-muted">
            <Link to="/forgot-password" className="hover:text-primary underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          New to FunnelHQ? Accept an invitation email from a recruiter to get started.
        </p>
      </div>
    </div>
  );
}
