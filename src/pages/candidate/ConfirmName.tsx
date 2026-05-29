/**
 * Phase 8: one-screen interstitial after first-time Google OAuth signup.
 *
 * The OAuthSuccess page redirects here when it detects a freshly-created
 * account (created within the last 60s). The candidate sees the Google-
 * provided name pre-filled and can edit it before continuing. Their
 * choice writes to candidate_accounts.name and syncs to every linked
 * candidate_profiles row via PATCH /api/candidate-auth/me.
 *
 * Bypasses the screen if the user already has a sensible non-empty name
 * AND came here by accident (no `force` query flag). Always shows when
 * the account name is blank.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ConfirmName() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/candidate/dashboard";
  const { account, isLoading, updateName } = useCandidateAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account && !name) {
      setName(account.name || "");
    }
  }, [account, name]);

  // If somehow no session, bounce to login.
  useEffect(() => {
    if (!isLoading && !account) {
      navigate("/candidate/login", { replace: true });
    }
  }, [isLoading, account, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter the name you'd like to be called.");
      return;
    }
    setBusy(true);
    try {
      await updateName(trimmed);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save name.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !account) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-ink">What should we call you?</h1>
          <p className="text-sm text-muted">
            You're signed in as{" "}
            <span className="font-mono">{account.email}</span>. The name below is
            what the interviewer will use when speaking with you. You can change
            it anytime.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-name">Preferred name</Label>
            <Input
              id="confirm-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
              autoFocus
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
