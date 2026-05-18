/**
 * Applicant DPDP rights surface.
 *
 * Routes:
 *   GET  /candidate/account/data                 (this page)
 *   POST /api/dpdp/applicant/access-request
 *   POST /api/dpdp/applicant/correction-request
 *   POST /api/dpdp/applicant/nominee
 *   DELETE /api/candidate-me/account             (existing erasure endpoint)
 *
 * Mirrors /account/data on the workspace side.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner, PageSpinner } from "@/components/ui/spinner";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useConsent } from "@/contexts/ConsentContext";
import { useToast } from "@/hooks/use-toast";
import { useCandidateAuth } from "@/contexts/CandidateAuthContext";

interface DataSummary {
  principal_kind: string;
  account_id: string;
  data_categories: Record<string, number>;
  retention_days: Record<string, number>;
  sub_processors: Array<{ name: string; purpose: string; region: string }>;
  rights: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("candidate_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CandidateDataAccount() {
  const navigate = useNavigate();
  const { logout } = useCandidateAuth();
  const { state: consentState, accept, decline } = useConsent();
  const { toast } = useToast();

  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/dpdp/applicant/data-summary`, {
          headers: authHeaders(),
        });
        if (!r.ok) throw new Error(`Failed to load summary (HTTP ${r.status})`);
        const d = await r.json();
        if (!cancelled) setSummary(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`${API_BASE}/api/dpdp/applicant/access-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!r.ok) throw new Error(`Export failed (HTTP ${r.status})`);
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flowdot-applicant-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready", description: "Your data download has started." });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      // §13 erasure: existing endpoint (predates F23.D1).
      const r = await fetch(`${API_BASE}/api/candidate-me/account`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error(`Delete failed (HTTP ${r.status})`);
      toast({ title: "Account deleted", description: "Logging out…" });
      setTimeout(() => {
        logout();
        navigate("/");
      }, 1500);
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  if (loading) return <PageSpinner label="Loading your data summary…" />;
  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <ErrorBanner tone="danger" title="Couldn't load summary" description={error} />
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
          Applicant portal · Data &amp; privacy
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Your data</h1>
        <p className="text-sm text-muted">
          Exercise your rights under the Digital Personal Data Protection Act,
          2023.
        </p>
      </header>

      {/* Data summary */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-ink">What we hold</h2>
        <ul className="space-y-2 text-sm">
          {Object.entries(summary.data_categories).map(([k, v]) => (
            <li key={k} className="flex justify-between border-b border-rule pb-2 last:border-0">
              <span className="text-ink-soft">{k.replace(/_/g, " ")}</span>
              <span className="font-mono tabular-nums text-ink">{v}</span>
            </li>
          ))}
        </ul>
        <div className="pt-2">
          <h3 className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-2">
            Retention
          </h3>
          <ul className="space-y-1 text-sm text-ink-soft">
            {Object.entries(summary.retention_days).map(([k, days]) => (
              <li key={k}>
                {k.replace(/_/g, " ")} —{" "}
                <span className="font-mono tabular-nums">{days} days</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Access export */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold text-ink">§11 Access</h2>
        <p className="text-sm text-muted">
          Download a JSON snapshot of every record we hold about you — your
          profile, résumés, interview transcripts, and TAG results.
        </p>
        <Button variant="default" onClick={handleExport} disabled={downloading}>
          {downloading ? <Spinner size="sm" variant="inverse" className="mr-2" /> : null}
          {downloading ? "Preparing…" : "Download my data"}
        </Button>
      </Card>

      {/* Consent */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold text-ink">Analytics &amp; session replay</h2>
        <p className="text-sm text-muted">
          PostHog (EU region) records how you use the applicant portal. Both
          analytics and replay are gated by your consent below.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink">
            Status:{" "}
            <span className="font-medium">
              {consentState === "accepted"
                ? "Accepted"
                : consentState === "declined"
                  ? "Declined"
                  : "Not set"}
            </span>
          </span>
          {consentState === "accepted" ? (
            <Button variant="outline" size="sm" onClick={decline}>
              Withdraw
            </Button>
          ) : (
            <Button variant="gold" size="sm" onClick={accept}>
              Accept
            </Button>
          )}
        </div>
      </Card>

      {/* Erasure */}
      <Card className="p-6 space-y-3 border-danger">
        <h2 className="text-xl font-semibold text-danger">§13 Erasure</h2>
        <p className="text-sm text-muted">
          Delete your applicant account and every record linked to it
          (profile, résumés, transcripts, audio, TAG results). This is
          irreversible.
        </p>
        <div className="space-y-2">
          <label htmlFor="confirm-delete" className="text-sm text-ink">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm:
          </label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="max-w-xs"
            disabled={deleting}
          />
        </div>
        <Button
          variant="destructive"
          disabled={confirmText !== "DELETE" || deleting}
          onClick={handleDelete}
        >
          {deleting ? <Spinner size="sm" variant="inverse" className="mr-2" /> : null}
          {deleting ? "Deleting…" : "Delete my account"}
        </Button>
      </Card>
    </div>
  );
}
