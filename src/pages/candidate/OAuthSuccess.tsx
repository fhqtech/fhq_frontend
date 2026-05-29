import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

/**
 * Lands here after Google OAuth callback redirects with #token=...
 * Reads the token from the URL hash, stores it via the context, then:
 *  - P8: if this is a first-time Google signup (account created < 60s
 *    ago) OR the account has no name yet, route to /candidate/confirm-name
 *    so the candidate can confirm/edit the name the interview agent will
 *    use when greeting them.
 *  - Otherwise route to the page they came from (sessionStorage) or
 *    fall back to /candidate/dashboard.
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
      .then(async () => {
        // Read the next URL the user came from (set by loginWithGoogle).
        let nextUrl = '/candidate/dashboard';
        try {
          const stashed = sessionStorage.getItem('candidate_oauth_next');
          if (stashed) nextUrl = stashed;
          sessionStorage.removeItem('candidate_oauth_next');
        } catch {
          /* private mode — use default */
        }

        // Detect first-time signup via /me. setSessionFromToken already
        // fetched and stored the account on context, but we re-fetch to
        // read created_at without depending on render order.
        let needsConfirm = false;
        try {
          const meResp = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidate-auth/me`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (meResp.ok) {
            const me = await meResp.json();
            const acct = me?.account || {};
            const created = acct?.created_at;
            if (created) {
              const createdMs = Date.parse(created);
              if (!Number.isNaN(createdMs)) {
                const ageMs = Date.now() - createdMs;
                if (ageMs >= 0 && ageMs < 60_000) needsConfirm = true;
              }
            }
            if (!acct.name || !String(acct.name).trim()) {
              needsConfirm = true;
            }
          }
        } catch {
          /* network blip — fall through to the default redirect */
        }

        const target = needsConfirm
          ? `/candidate/confirm-name?next=${encodeURIComponent(nextUrl)}`
          : nextUrl;
        window.history.replaceState({}, '', target);
        navigate(target, { replace: true });
      })
      .catch((err) => setError(err?.message || 'Sign-in failed'));
  }, [navigate, setSessionFromToken]);

  return (
    <div className="min-h-dvh bg-paper-2 flex items-center justify-center px-4">
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
