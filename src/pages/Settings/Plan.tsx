/**
 * Settings → Plan
 *
 * Single-screen view of the active workspace's plan + credit balance.
 * No self-serve checkout yet — the "Contact us to upgrade" CTA opens a
 * mailto link until billing integration ships.
 *
 * The feature matrix is hardcoded mirror of `shared/plan_features.py` on
 * the backend; the backend is the source of truth at request time, this
 * is render-only.
 */
import { useEffect, useMemo, useState } from "react";
import { Check, X, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth, type PlanId, type FeatureLevel } from "@/contexts/AuthContext";

interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  actor: string;
  balanceAfter: number;
  createdAt: string | null;
  flagged_large_revoke?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function shortReason(reason: string): string {
  // ledger reasons are colon-tagged: `resend_retake:inv_id` etc.
  const base = reason.split(":")[0] ?? reason;
  const map: Record<string, string> = {
    signup_trial: "Signup trial",
    signup_trial_repair: "Trial credits (repair)",
    invite_candidates: "Invited candidates",
    fitment_start: "Fitment bulk start",
    resend_legacy: "Resend (legacy invite)",
    resend_retake: "Resend (retake)",
    reset_legacy: "Reset (legacy invite)",
    reset_retake: "Reset (retake)",
    cron_legacy: "Cron resend (legacy)",
    cron_retake: "Cron resend (retake)",
    test: "Test charge",
  };
  return map[base] ?? reason;
}

const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

// Mirror of backend PLAN_FEATURES. Keep in sync with
// shared/plan_features.py (FE is render-only; BE enforces).
const FEATURE_MATRIX: Array<{
  id: string;
  label: string;
  surface: "Control tower" | "Recruiter portal";
  free: FeatureLevel;
  pro: FeatureLevel;
  enterprise: FeatureLevel;
}> = [
  { id: "ct_projects",    label: "Projects",            surface: "Control tower",   free: "FULL", pro: "FULL", enterprise: "FULL" },
  { id: "ct_finops",      label: "FinOps & usage",      surface: "Control tower",   free: "VIEW", pro: "FULL", enterprise: "FULL" },
  { id: "ct_talent_pool", label: "Global talent pool",  surface: "Control tower",   free: "NONE", pro: "FULL", enterprise: "FULL" },
  { id: "ct_pii",         label: "Candidate PII (workspace)", surface: "Control tower", free: "VIEW", pro: "FULL", enterprise: "FULL" },
  { id: "ct_blueprints",  label: "Custom blueprints",   surface: "Control tower",   free: "VIEW", pro: "FULL", enterprise: "FULL" },
  { id: "ct_roles",       label: "Roles & access",      surface: "Control tower",   free: "VIEW", pro: "FULL", enterprise: "FULL" },
  { id: "ct_integrations",label: "Integrations",        surface: "Control tower",   free: "NONE", pro: "EDIT", enterprise: "FULL" },
  { id: "ct_security",    label: "Security & compliance", surface: "Control tower", free: "NONE", pro: "VIEW", enterprise: "FULL" },
  { id: "rp_lists",       label: "Lists",               surface: "Recruiter portal", free: "FULL", pro: "FULL", enterprise: "FULL" },
  { id: "rp_interviews",  label: "Interviews (uses credits)", surface: "Recruiter portal", free: "FULL", pro: "FULL", enterprise: "FULL" },
  { id: "rp_review",      label: "Interview review",    surface: "Recruiter portal", free: "FULL", pro: "FULL", enterprise: "FULL" },
  { id: "rp_analytics",   label: "Post-interview analytics", surface: "Recruiter portal", free: "VIEW", pro: "FULL", enterprise: "FULL" },
  { id: "rp_candidates",  label: "Candidate management", surface: "Recruiter portal", free: "FULL", pro: "FULL", enterprise: "FULL" },
  { id: "rp_pii",         label: "Candidate PII (project)", surface: "Recruiter portal", free: "VIEW", pro: "FULL", enterprise: "FULL" },
];

const STATUS_LABEL = {
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
} as const;

function levelCell(level: FeatureLevel, isCurrentPlan: boolean) {
  const tone = isCurrentPlan ? "text-ink" : "text-muted-foreground";
  if (level === "NONE") {
    return <X className={`h-4 w-4 ${tone}`} aria-label="No access" />;
  }
  if (level === "VIEW") return <span className={`font-mono text-[11px] ${tone}`}>view</span>;
  if (level === "EDIT" || level === "PARTIAL") return <span className={`font-mono text-[11px] ${tone}`}>edit</span>;
  return <Check className={`h-4 w-4 ${tone}`} aria-label="Full access" />;
}

export default function PlanPage() {
  const { user } = useAuth();
  const plan = user?.activeWorkspacePlan;

  const currentPlan: PlanId = plan?.plan ?? "free";
  const status = plan?.status ?? "active";

  const memberCap = useMemo(() => {
    const cap = plan?.limits?.maxMembers;
    return cap === null || cap === undefined ? "unlimited" : String(cap);
  }, [plan?.limits]);

  // P-Plans F6: load the credit ledger so users can audit their grants
  // and charges. Read-only — mutations are admin-only.
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  useEffect(() => {
    const wsId = plan?.workspaceId;
    if (!wsId) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    setLedgerLoading(true);
    fetch(`${API_BASE_URL}/api/workspaces/${wsId}/credit-ledger?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setLedger(Array.isArray(d.entries) ? d.entries : []))
      .catch((err) => console.warn("Failed to load credit ledger:", err))
      .finally(() => setLedgerLoading(false));
  }, [plan?.workspaceId]);

  if (!plan) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">No active workspace.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan and credit balance for this workspace.
        </p>
      </header>

      {/* Top row — current plan + credits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-medium text-ink">{PLAN_LABEL[currentPlan]}</span>
              <Badge variant="outline" className="font-mono uppercase tracking-[0.1em] text-[10px]">
                {STATUS_LABEL[status]}
              </Badge>
            </div>
            <dl className="divide-y divide-rule border-t border-rule text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Member cap</dt>
                <dd className="font-mono tabular-nums text-ink">{memberCap}</dd>
              </div>
              {plan.expiresAt ? (
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Renews / expires</dt>
                  <dd className="font-mono tabular-nums text-ink">
                    {new Date(plan.expiresAt).toLocaleDateString()}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <a href="mailto:hello@flowdot.ai?subject=Plan%20upgrade">
                  <Mail className="h-3.5 w-3.5 mr-2" aria-hidden />
                  Contact us to upgrade
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Interview credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-ink font-mono tabular-nums">
              {plan.credits.remaining}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Credits remaining. Each interview uses 1 credit.
            </p>
            <dl className="mt-4 divide-y divide-rule border-t border-rule text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Granted lifetime</dt>
                <dd className="font-mono tabular-nums text-ink">{plan.credits.granted}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted-foreground">Consumed lifetime</dt>
                <dd className="font-mono tabular-nums text-ink">{plan.credits.consumed}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Feature matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What each plan includes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-normal">Feature</th>
                  <th className={`py-2 px-3 text-center font-normal ${currentPlan === "free" ? "text-ink font-medium" : ""}`}>
                    Free
                  </th>
                  <th className={`py-2 px-3 text-center font-normal ${currentPlan === "pro" ? "text-ink font-medium" : ""}`}>
                    Pro
                  </th>
                  <th className={`py-2 px-3 text-center font-normal ${currentPlan === "enterprise" ? "text-ink font-medium" : ""}`}>
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {FEATURE_MATRIX.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4">
                      <div className="text-ink">{row.label}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {row.surface}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">{levelCell(row.free, currentPlan === "free")}</td>
                    <td className="py-2 px-3 text-center">{levelCell(row.pro, currentPlan === "pro")}</td>
                    <td className="py-2 px-3 text-center">{levelCell(row.enterprise, currentPlan === "enterprise")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Credit ledger — recent grants + charges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent credit activity</CardTitle>
          <p className="text-xs text-muted-foreground">
            Last 20 entries. Newest first.
          </p>
        </CardHeader>
        <CardContent>
          {ledgerLoading && ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. Credits show up here when you receive a grant or run an interview.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {ledger.map((entry) => {
                const isPositive = entry.delta > 0;
                return (
                  <li key={entry.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-ink">{shortReason(entry.reason)}</span>
                        {entry.flagged_large_revoke && (
                          <Badge variant="outline" className="font-mono uppercase text-[9px] tracking-[0.12em] border-danger text-danger">
                            Large revoke
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate">
                        {entry.actor} · {formatRelative(entry.createdAt)}
                      </p>
                    </div>
                    <div className={`font-mono tabular-nums text-sm ${isPositive ? 'text-success' : 'text-ink'}`}>
                      {isPositive ? '+' : ''}{entry.delta}
                    </div>
                    <div className="ml-4 font-mono tabular-nums text-xs text-muted-foreground w-16 text-right">
                      → {entry.balanceAfter}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
