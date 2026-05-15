import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

/**
 * Lands here after Google OAuth callback redirects with #token=...
 * Reads the token from the URL hash, stores it via the context, then
 * forwards to the dashboard. Errors are surfaced inline.
 */
export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { setSessionFromToken } = useCandidateAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash || '';
    const match = /token=([^&]+)/.exec(hash);
    const token = match ? decodeURIComponent(match[1]) : null;
    if (!token) {
      setError('Could not read OAuth token from the URL.');
      return;
    }
    setSessionFromToken(token)
      .then(() => {
        // Replace the URL so the token isn't visible in history.
        window.history.replaceState({}, '', '/candidate/dashboard');
        navigate('/candidate/dashboard', { replace: true });
      })
      .catch((err) => setError(err?.message || 'Sign-in failed'));
  }, [navigate, setSessionFromToken]);

  return (
    <div className="min-h-[100dvh] bg-paper-2 flex items-center justify-center px-4">
      {error ? (
        <div className="max-w-md bg-paper rounded-xl border border-border p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Sign-in failed</h2>
          <p className="text-sm text-muted mb-4">{error}</p>
          <a href="/candidate/login" className="text-primary underline text-sm">
            Back to sign in
          </a>
        </div>
      ) : (
        <div className="text-muted text-sm flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Signing you in…
        </div>
      )}
    </div>
  );
}
