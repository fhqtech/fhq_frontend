/**
 * ProductLanding — workspace sign-in.
 *
 * Centered single-column card on bg-paper-2. Mirrors /candidate/login
 * structure exactly; only the kicker word differs ("WORKSPACE" vs
 * "APPLICANT PORTAL").
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2 } from "lucide-react";

export default function ProductLanding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated. Honor a pending invitation token
  // captured pre-login so applicants who clicked a link land in the right
  // place after authenticating.
  useEffect(() => {
    if (!isAuthenticated) return;
    const pendingInvitationToken = localStorage.getItem("pendingInvitationToken");
    if (pendingInvitationToken) {
      localStorage.removeItem("pendingInvitationToken");
      navigate(`/accept-invitation/${pendingInvitationToken}`);
    } else {
      navigate("/interviews/manage");
    }
  }, [isAuthenticated, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Enter your details",
        description: "Email and password are both required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await login(email, password);
      const pending = localStorage.getItem("pendingInvitationToken");
      if (pending) {
        localStorage.removeItem("pendingInvitationToken");
        navigate(`/accept-invitation/${pending}`);
      } else {
        navigate("/interviews/manage");
      }
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-dvh bg-paper-2 text-ink antialiased">
      {/* Top bar */}
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

      {/* Hero block */}
      <main className="px-6 py-16 md:py-20">
        <div className="text-center mb-10">
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-3">
            Workspace
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-muted">Sign in to your workspace</p>
        </div>

        {/* Sign-in card */}
        <div className="max-w-md mx-auto bg-paper border border-rule rounded-md shadow-1 p-6 md:p-7">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-rule" />
            <span className="font-mono text-[10px] text-muted">
              or sign in with email
            </span>
            <div className="flex-1 h-px bg-rule" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-mono text-muted">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@workspace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-mono text-muted">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          New to FunnelHQ?{" "}
          <Link to="/start" className="text-ink hover:underline">
            Get started
          </Link>
        </p>
      </main>
    </div>
  );
}
