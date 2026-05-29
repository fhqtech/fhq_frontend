/**
 * P7: gate the invitation landing pages (/register/:token, /candidate-portal/:token)
 * behind a logged-in candidate session whose email matches the invitation.
 *
 * Flow:
 *  1. Fetch the invitation. If logged in, the backend either returns the full
 *     payload (identity matches) or 403 identity_mismatch.
 *  2. If not logged in, the backend returns `{requires_login: true, ...}` with
 *     a masked invited email.
 *  3. We render: a claim-password form (if ?claim=… present), a sign-in card
 *     (if requires_login), the wrapped child (if identity matches), or a
 *     mismatch error screen (if 403).
 */
import { useEffect, useMemo, useState, ReactNode } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, LogOut } from "lucide-react";

const API_BASE = () =>
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

interface InvitationSummary {
  requires_login?: boolean;
  invitation_token?: string;
  interview?: { id?: string; title?: string; type?: string; duration?: number };
  invited_email_masked?: string;
  // Phase 8: recruiter-typed name, used only as a pre-fill hint on the
  // "What should we call you?" input. Never authoritative.
  invited_name_suggested?: string;
  // Or it's the full payload when the gate already passed:
  [k: string]: any;
}

type GateState =
  | { kind: "loading" }
  | { kind: "needs_claim"; claimToken: string; summary: InvitationSummary }
  | { kind: "needs_login"; summary: InvitationSummary }
  | { kind: "mismatch"; invitedMasked: string }
  | { kind: "ok"; payload: any };

interface Props {
  endpoint: "register" | "candidate-portal";
  children: (invitation: any) => ReactNode;
}

export function InvitationAuthGate({ endpoint, children }: Props) {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const claimParam = searchParams.get("claim");
  const { account, isAuthenticated, isLoading, login, loginWithGoogle, claimPassword, logout } =
    useCandidateAuth();
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInBusy, setSignInBusy] = useState(false);
  const [claimPwd, setClaimPwd] = useState("");
  const [claimPwd2, setClaimPwd2] = useState("");
  const [claimName, setClaimName] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  const fetchInvitation = useMemo(
    () => async () => {
      if (!token) return;
      const headers: Record<string, string> = {};
      const jwt = localStorage.getItem("candidate_auth_token");
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
      const resp = await fetch(`${API_BASE()}/api/${endpoint}/${token}`, { headers });
      if (resp.status === 403) {
        const body = await resp.json().catch(() => ({}));
        const masked = body?.detail?.invited_email_masked || "the invited address";
        setState({ kind: "mismatch", invitedMasked: masked });
        return;
      }
      if (!resp.ok) {
        setState({
          kind: "mismatch",
          invitedMasked: "the invited address",
        });
        return;
      }
      const data = (await resp.json()) as InvitationSummary;
      if (data?.requires_login) {
        // Brand-new candidate with a claim token wins over the login card.
        if (claimParam) {
          setState({ kind: "needs_claim", claimToken: claimParam, summary: data });
        } else {
          setState({ kind: "needs_login", summary: data });
        }
        return;
      }
      setState({ kind: "ok", payload: data });
    },
    [token, endpoint, claimParam],
  );

  useEffect(() => {
    if (isLoading) return; // wait for auth bootstrap
    fetchInvitation();
  }, [isLoading, isAuthenticated, fetchInvitation]);

  if (state.kind === "loading" || isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (state.kind === "ok") {
    return <>{children(state.payload)}</>;
  }

  if (state.kind === "mismatch") {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gold-soft flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-gold-ink" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-ink">Account doesn't match</h1>
            <p className="text-sm text-muted">
              This invitation was sent to <span className="font-mono">{state.invitedMasked}</span>.
              Sign in with that email to continue.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                // After logout, fetch will return requires_login again.
                setState({ kind: "loading" });
                fetchInvitation();
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out and try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "needs_claim") {
    const summary = state.summary;
    // P8: pre-fill the name input from the recruiter's suggestion the
    // first time the claim screen renders for this session. Once the
    // candidate edits it, their value sticks (we don't clobber via
    // useEffect on every render).
    if (!claimName && summary.invited_name_suggested) {
      setClaimName(summary.invited_name_suggested);
    }
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setClaimError(null);
      if (!claimName.trim()) {
        setClaimError("Please enter the name you'd like to be called.");
        return;
      }
      if (claimPwd.length < 8) {
        setClaimError("Password must be at least 8 characters.");
        return;
      }
      if (claimPwd !== claimPwd2) {
        setClaimError("Passwords don't match.");
        return;
      }
      setClaimBusy(true);
      try {
        await claimPassword(state.claimToken, claimPwd, claimName.trim());
        setState({ kind: "loading" });
        fetchInvitation();
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : "Could not set password.");
      } finally {
        setClaimBusy(false);
      }
    };
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-ink">Set your password</h1>
            <p className="text-sm text-muted">
              You've been invited to {summary.interview?.title || "an interview"}. Set a password
              for <span className="font-mono">{summary.invited_email_masked}</span> to continue.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claim-name">What should we call you?</Label>
              <Input
                id="claim-name"
                type="text"
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
                autoComplete="name"
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-pwd">New password</Label>
              <Input
                id="claim-pwd"
                type="password"
                value={claimPwd}
                onChange={(e) => setClaimPwd(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-pwd2">Confirm password</Label>
              <Input
                id="claim-pwd2"
                type="password"
                value={claimPwd2}
                onChange={(e) => setClaimPwd2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {claimError && <p className="text-sm text-red-600">{claimError}</p>}
            <Button type="submit" disabled={claimBusy} className="w-full">
              {claimBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Set password and continue
            </Button>
          </form>
          <p className="text-center text-xs text-muted">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setState({ kind: "needs_login", summary })}
              className="underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // needs_login
  const summary = state.summary;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSignInBusy(true);
    try {
      await login(signInEmail, signInPassword);
      setState({ kind: "loading" });
      fetchInvitation();
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setSignInBusy(false);
    }
  };
  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-ink">Sign in to continue</h1>
          <p className="text-sm text-muted">
            You've been invited to {summary.interview?.title || "an interview"}. Sign in with{" "}
            <span className="font-mono">{summary.invited_email_masked}</span> to start.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={loginWithGoogle}
        >
          Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="flex-1 border-t" />
          or
          <div className="flex-1 border-t" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-pwd">Password</Label>
            <Input
              id="signin-pwd"
              type="password"
              value={signInPassword}
              onChange={(e) => setSignInPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {signInError && <p className="text-sm text-red-600">{signInError}</p>}
          <Button type="submit" disabled={signInBusy} className="w-full">
            {signInBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
        <p className="text-center text-xs text-muted">
          <Link to="/forgot-password" className="underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
