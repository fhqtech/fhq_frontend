/**
 * Superadmin → Workspaces
 *
 * Single page where ops assigns plans + grants credits to customer workspaces.
 * Gated client-side on `user.is_superadmin`; the backend endpoints are also
 * superadmin-gated server-side (see funnelhq_api/dependencies/auth.py).
 *
 * Layout: searchable list on the left, edit panel on the right. Pure
 * keyboard / click-driven — no inline payments, no plan-purchase flow.
 */
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth, type PlanId, type PlanStatus } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AdminWorkspace {
  id: string;
  name?: string;
  ownerId?: string;
  memberCount: number;
  plan: PlanId;
  planStatus: PlanStatus;
  planExpiresAt: string | null;
  creditsRemaining: number;
  creditsGranted: number;
  creditsConsumed: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail: any;
    try { detail = await res.json(); } catch { /* */ }
    throw new Error(detail?.detail?.error ?? detail?.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export default function AdminWorkspaces() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<AdminWorkspace[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Plan form state
  const [plan, setPlan] = useState<PlanId>("free");
  const [status, setStatus] = useState<PlanStatus>("active");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Credit form state
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [creditReason, setCreditReason] = useState("");
  const [granting, setGranting] = useState(false);

  const selected = useMemo(
    () => items.find((w) => w.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setPlan(selected.plan);
      setStatus(selected.planStatus);
      setExpiresAt(selected.planExpiresAt ?? "");
    }
  }, [selected]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await fetchJson<{ workspaces: AdminWorkspace[] }>("/api/admin/workspaces");
      setItems(data.workspaces);
    } catch (e: any) {
      toast({ title: "Failed to load workspaces", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Hooks above — render-time guards below. Don't early-return before hooks.
  if (isLoading) return null;
  if (!user || !user.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = items.filter((w) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (w.name ?? "").toLowerCase().includes(q) || w.id.toLowerCase().includes(q);
  });

  async function assignPlan() {
    if (!selected) return;
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await fetchJson(`/api/admin/workspaces/${selected.id}/plan`, {
        method: "POST",
        body: JSON.stringify({
          plan, status,
          expiresAt: expiresAt || null,
          reason: reason.trim(),
        }),
      });
      toast({ title: "Plan assigned", description: `${selected.name ?? selected.id} → ${plan}` });
      setReason("");
      await refresh();
    } catch (e: any) {
      toast({ title: "Failed to assign plan", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function grantCredits() {
    if (!selected) return;
    const amount = parseInt(creditAmount, 10);
    if (Number.isNaN(amount) || amount === 0) {
      toast({ title: "Enter a non-zero amount", variant: "destructive" });
      return;
    }
    if (!creditReason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }

    // P-Plans F7: confirm large revokes client-side before hitting the
    // server. Backend also enforces this (returns 400 with
    // `large_revoke_unconfirmed`), but a window.confirm gives the
    // operator a visible "are you sure" beat for irreversible drains.
    let confirmLargeRevoke = false;
    if (amount < 0) {
      const halfBalance = Math.floor(selected.creditsRemaining / 2);
      if (Math.abs(amount) > halfBalance) {
        confirmLargeRevoke = window.confirm(
          `Revoking ${Math.abs(amount)} credits from ${selected.name ?? selected.id} ` +
          `(balance: ${selected.creditsRemaining}). This is more than half their balance ` +
          `and will be flagged on the audit log. Continue?`
        );
        if (!confirmLargeRevoke) {
          return;
        }
      }
    }

    setGranting(true);
    try {
      const data = await fetchJson<{ balance: number; large_revoke?: boolean }>(`/api/admin/workspaces/${selected.id}/credits`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          reason: creditReason.trim(),
          confirm_large_revoke: confirmLargeRevoke,
        }),
      });
      toast({
        title: "Credits updated",
        description: `New balance: ${data.balance}${data.large_revoke ? ' (flagged: large revoke)' : ''}`,
      });
      setCreditAmount("");
      setCreditReason("");
      await refresh();
      await loadAuditAndLedger(selected.id);
    } catch (e: any) {
      toast({ title: "Failed to grant credits", description: e.message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  }

  // P-Plans F7: load ledger + plan audit for the selected workspace.
  interface LedgerRow { id: string; delta: number; reason: string; actor: string; balanceAfter: number; createdAt: string | null; flagged_large_revoke?: boolean; }
  const [auditLedger, setAuditLedger] = useState<LedgerRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  async function loadAuditAndLedger(wsId: string) {
    setLoadingAudit(true);
    try {
      const ledgerRes = await fetchJson<{ entries: LedgerRow[] }>(`/api/workspaces/${wsId}/credit-ledger?limit=20`);
      setAuditLedger(ledgerRes.entries || []);
    } catch (e: any) {
      console.warn("Failed to load audit/ledger:", e);
      setAuditLedger([]);
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => {
    if (selected) {
      loadAuditAndLedger(selected.id);
    } else {
      setAuditLedger([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Admin · Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign plans and grant credits. All changes are audited.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
        {/* List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workspaces</CardTitle>
            <Input
              placeholder="Search by name or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-rule">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No workspaces.</p>
              ) : filtered.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`w-full text-left p-3 hover:bg-rule/30 transition-colors ${
                    selectedId === w.id ? "bg-rule/40" : ""
                  }`}
                >
                  <div className="text-sm text-ink truncate">{w.name ?? "(unnamed)"}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono uppercase text-[9px] tracking-[0.12em]">
                      {w.plan}
                    </Badge>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {w.creditsRemaining} cr
                    </span>
                    <span className="text-muted-foreground">· {w.memberCount} members</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="space-y-4">
          {!selected ? (
            <Card>
              <CardContent className="p-8 text-sm text-muted-foreground">
                Select a workspace to edit its plan and credits.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selected.name ?? "(unnamed)"}</CardTitle>
                  <p className="font-mono text-[11px] text-muted-foreground">{selected.id}</p>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Credits remaining</dt>
                      <dd className="font-mono tabular-nums text-ink text-lg">{selected.creditsRemaining}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Granted lifetime</dt>
                      <dd className="font-mono tabular-nums text-ink text-lg">{selected.creditsGranted}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Consumed lifetime</dt>
                      <dd className="font-mono tabular-nums text-ink text-lg">{selected.creditsConsumed}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Assign plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Plan</Label>
                      <Select value={plan} onValueChange={(v) => setPlan(v as PlanId)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as PlanStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="past_due">Past due</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Expires at (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reason</Label>
                    <Input
                      placeholder="Contract / call notes"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <Button onClick={assignPlan} disabled={submitting} size="sm">
                    {submitting ? "Saving…" : "Assign plan"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Grant credits</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Positive = add credits. Negative = revoke.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 100 or -25"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reason</Label>
                    <Input
                      placeholder="e.g. Q1 allotment — call 2026-05-27"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                    />
                  </div>
                  <Button onClick={grantCredits} disabled={granting} size="sm">
                    {granting ? "Saving…" : "Apply"}
                  </Button>
                </CardContent>
              </Card>

              {/* P-Plans F7: credit ledger audit trail */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent activity</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Last 20 ledger entries on this workspace.
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingAudit && auditLedger.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : auditLedger.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="divide-y divide-rule max-h-96 overflow-y-auto">
                      {auditLedger.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-ink font-mono text-[11px] truncate">{entry.reason}</span>
                              {entry.flagged_large_revoke && (
                                <Badge variant="outline" className="font-mono uppercase text-[9px] tracking-[0.12em] border-danger text-danger">
                                  Flagged
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate">
                              {entry.actor} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                            </p>
                          </div>
                          <div className={`font-mono tabular-nums text-sm ml-2 ${entry.delta > 0 ? 'text-success' : 'text-ink'}`}>
                            {entry.delta > 0 ? '+' : ''}{entry.delta}
                          </div>
                          <div className="ml-3 font-mono tabular-nums text-xs text-muted-foreground w-12 text-right">
                            → {entry.balanceAfter}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
