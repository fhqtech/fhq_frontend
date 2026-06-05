/**
 * FitDetailModal — explainable per-candidate fit (FR-MA-02).
 *
 * Opens from a row in the skill matcher. Calls the fit-detail endpoint and
 * shows, per role skill: required vs demonstrated, how it matched (canonical /
 * id / label), the grounding confidence, and the supporting evidence — so a
 * recruiter can see *why* a fit score is what it is, not just the number.
 */
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RowSkeleton } from "@/components/ui/shimmer";
import { analyticsApi } from "@/services/analyticsApi";
import { cn } from "@/lib/utils";
import type { FitContribution, FitDetailResponse } from "@/types/analytics";

interface FitDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  roleInterviewId: string;
  sessionId: string;
  candidateName?: string | null;
}

const MATCH_LABEL: Record<FitContribution["matched_via"], string> = {
  canonical: "canonical match",
  skill_id: "id match",
  label: "label match",
  none: "no match",
};

function ContributionRow({ c }: { c: FitContribution }) {
  const pct = Math.max(0, Math.min(100, c.demonstrated_score));
  return (
    <li className="py-3">
      <div className="flex items-center gap-2">
        {c.met ? (
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
        ) : (
          <CircleDashed className="h-4 w-4 text-muted shrink-0" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-ink truncate">{c.label || c.role_skill_id}</span>
        {c.is_core && (
          <Badge variant="outline" className="text-[10px] font-mono">core</Badge>
        )}
        <span className="ml-auto text-sm font-mono tabular-nums text-ink">
          {c.demonstrated_score}
          <span className="text-muted"> / {c.expected_score}</span>
        </span>
      </div>

      {/* required vs demonstrated bar */}
      <div className="mt-2 ml-6 h-1.5 rounded-full bg-paper-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full", c.met ? "bg-success" : "bg-gold-ink")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-1.5 ml-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="font-mono">{MATCH_LABEL[c.matched_via]}</span>
        {c.confidence != null && (
          <span className="font-mono">{Math.round(c.confidence * 100)}% grounded</span>
        )}
      </div>

      {c.evidence.length > 0 && (
        <ul className="mt-1.5 ml-6 space-y-1 text-xs text-foreground/80 list-disc pl-4">
          {c.evidence.slice(0, 4).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function FitDetailModal({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  roleInterviewId,
  sessionId,
  candidateName,
}: FitDetailModalProps) {
  const [data, setData] = useState<FitDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    analyticsApi
      .getFitDetail(workspaceId, projectId, { roleInterviewId, sessionId })
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setError("Could not load the fit breakdown for this candidate.");
          return;
        }
        setData(d);
      })
      .catch(() => !cancelled && setError("Could not load the fit breakdown."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, projectId, roleInterviewId, sessionId]);

  // Core skills first, then by demonstrated score descending.
  const contributions = (data?.contributions ?? [])
    .slice()
    .sort((a, b) => Number(b.is_core) - Number(a.is_core) || b.demonstrated_score - a.demonstrated_score);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Fit detail{candidateName ? ` — ${candidateName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {data
              ? <>
                  {data.role.title || "Role"} ·{" "}
                  <span className="font-mono">{Math.round(data.match_score)}%</span> overall fit ·{" "}
                  matched on canonical skill ids
                </>
              : "Why this candidate fits the role, skill by skill."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <RowSkeleton key={i} lines={2} />)}
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center" role="alert">
            <AlertCircle className="h-5 w-5 text-warning" />
            <p className="text-sm text-ink">{error}</p>
          </div>
        ) : contributions.length === 0 ? (
          <p className="text-xs text-muted py-8 text-center">No scored skills to explain.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {contributions.map((c) => (
              <ContributionRow key={c.role_skill_id} c={c} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
