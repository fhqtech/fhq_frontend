/**
 * ScoreOverrideModal (A4) — recruiter human-in-the-loop override of one AI
 * per-skill score (IR-03 / CMP-2). Calls the override API; the AI value is
 * preserved + audit-logged server-side. A reason is required.
 */
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resultsApi } from "@/services/resultsApi";

interface ScoreOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  skillId: string;
  skillLabel: string;
  currentScore: number;
  onOverridden?: () => void;
}

export function ScoreOverrideModal({
  open, onOpenChange, sessionId, skillId, skillLabel, currentScore, onOverridden,
}: ScoreOverrideModalProps) {
  const [newScore, setNewScore] = useState<string>(String(currentScore));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setNewScore(String(currentScore)); setReason(""); setError(null); }
  }, [open, currentScore]);

  const scoreNum = Number(newScore);
  const valid = reason.trim().length >= 3 && Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 100;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await resultsApi.overrideSkillScore({ sessionId, skillId, newScore: scoreNum, reason: reason.trim() });
      onOverridden?.();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Could not save the override.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Override score — {skillLabel}</DialogTitle>
          <DialogDescription className="text-xs">
            The AI score is kept on record; your override supersedes it and is logged with your reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted">
              AI score <span className="font-mono tabular-nums text-ink">{currentScore}</span>
            </div>
            <div className="flex-1">
              <Label htmlFor="new-score" className="text-xs">New score (0–100)</Label>
              <Input
                id="new-score" type="number" min={0} max={100} value={newScore}
                onChange={(e) => setNewScore(e.target.value)} className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason" className="text-xs">Reason (required)</Label>
            <Textarea
              id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Why are you overriding the AI score?" className="mt-1"
            />
          </div>

          {error && (
            <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded">Cancel</Button>
          <Button onClick={submit} disabled={!valid || submitting} className="rounded">
            {submitting ? "Saving…" : "Save override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
