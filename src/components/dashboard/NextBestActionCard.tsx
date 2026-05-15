/**
 * NextBestActionCard — the one CTA we want the user to see on every primary screen.
 *
 * Driven by `computeInterviewNBA` / `computeDashboardNBA` from `lib/nextBestAction`.
 */
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NBA } from "@/lib/nextBestAction";

interface NextBestActionCardProps {
  nba: NBA;
  /** Optional override for the action="addCandidates" handler. Defaults to navigating to /interviews/create. */
  onAddCandidates?: () => void;
  onShare?: () => void;
  onRemind?: () => void;
  onStart?: () => void;
  className?: string;
}

export function NextBestActionCard({
  nba,
  onAddCandidates,
  onShare,
  onRemind,
  onStart,
  className,
}: NextBestActionCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (nba.pending) return;
    if (nba.action === "addCandidates" && onAddCandidates) return onAddCandidates();
    if (nba.action === "share" && onShare) return onShare();
    if (nba.action === "remind" && onRemind) return onRemind();
    if (nba.action === "start" && onStart) return onStart();
    if (nba.href) navigate(nba.href);
  };

  return (
    <Card
      className={`p-5 flex items-center justify-between gap-4 border-2 ${
        nba.variant === "default" ? "border-blue-200 bg-blue-50/50" : "border-rule"
      } ${className ?? ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider mb-1">
          Next Best Action
        </p>
        <h3 className="text-lg font-bold text-foreground truncate">{nba.label}</h3>
        {nba.hint && (
          <p className="text-xs text-muted-foreground mt-0.5">{nba.hint}</p>
        )}
      </div>
      <Button
        type="button"
        variant={nba.variant}
        onClick={handleClick}
        disabled={nba.pending}
        className="rounded-sm uppercase font-bold shrink-0"
        size="default"
      >
        {nba.pending ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <ArrowRight className="w-4 h-4 mr-1.5" />
        )}
        {nba.pending ? "Working…" : "Go"}
      </Button>
    </Card>
  );
}
