/**
 * CandidateLogin — applicant sign-in.
 *
 * Mirrors ProductLanding.tsx structure. Only the kicker word differs
 * ("APPLICANT PORTAL" vs "WORKSPACE"). Same shell, primitives, palette.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ArrowRight, Loader2 } from "lucide-react";

export default function CandidateLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useCandidateAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || "/candidate/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  if (isAuthenticated) {
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
      setError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper-2 text-ink antialiased">
      {/* Top bar — identical to ProductLanding */}
      <header className="bg-paper border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-ink text-paper grid place-items-center font-semibold text-sm">
              F
            </div>
            <span className="text-ink font-semibold tracking-tight">FunnelHQ</span>
          </Link>
          <Link to="/start" className="text-sm text-ink-soft hover:text-ink">
            New here? Get started
          </Link>
        </div>
      </header>

      <main className="px-6 py-16 md:py-20">
        {/* Hero block */}
        <div className="text-center mb-10">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Applicant Portal
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-muted">Sign in to take your assessment</p>
        </div>

        {/* Sign-in card */}
        <div className="max-w-md mx-auto bg-paper border border-rule rounded-md shadow-1 p-6 md:p-7">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={loginWithGoogle}
            disabled={isLoading}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-rule" />
            <span className="font-mono uppercase tracking-wider text-[10px] text-muted">
              or sign in with email
            </span>
            <div className="flex-1 h-px bg-rule" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-muted">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-muted">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <ErrorBanner tone="danger" title="Sign-in failed" description={error} />
            )}

            <Button
              type="submit"
              variant="gold"
              className="w-full h-11"
              disabled={submitting || isLoading}
            >
              {(submitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-5 text-center text-xs">
            <Link to="/forgot-password" className="text-muted hover:text-ink">
              Forgot password?
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          New to FunnelHQ? Accept the invitation email from your hiring workspace to get started.
        </p>
      </main>
    </div>
  );
}
