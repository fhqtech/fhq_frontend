import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  assessmentsRecruiterApi,
  type AssessmentMode,
} from "@/services/assessmentsRecruiterApi";

export interface AssignAssessmentCandidate {
  email: string;
  name?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidates: AssignAssessmentCandidate[];
  workspaceId?: string;
  projectId?: string;
  blueprintId?: string;
  domain?: string;
  onSuccess?: (assigned: number) => void;
}

const MODES: { value: AssessmentMode; label: string }[] = [
  { value: "scenario", label: "Scenario / SJT" },
  { value: "case", label: "Case study" },
  { value: "work_sample", label: "Work-sample" },
  { value: "defense", label: "Defense round" },
];

export function AssignAssessmentDialog({
  isOpen,
  onClose,
  candidates,
  workspaceId,
  projectId,
  blueprintId,
  domain = "finance",
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<AssessmentMode>("scenario");
  const [itemId, setItemId] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const withEmail = candidates.filter((c) => (c.email || "").trim().length > 0);
  const canAssign = itemId.trim().length > 0 && withEmail.length > 0 && !submitting;

  async function assign() {
    if (!canAssign) return;
    setSubmitting(true);
    try {
      const res = await assessmentsRecruiterApi.assignAssessment({
        item_id: itemId.trim(),
        mode,
        candidates: withEmail.map((c) => ({ email: c.email, name: c.name })),
        domain,
        workspace_id: workspaceId,
        project_id: projectId,
        blueprint_id: blueprintId,
        title: title.trim() || undefined,
      });
      toast({
        title: "Assessment assigned",
        description: `Sent to ${res.assigned} candidate(s).`,
      });
      onSuccess?.(res.assigned);
      onClose();
      setItemId("");
      setTitle("");
    } catch (e) {
      toast({
        title: "Couldn't assign assessment",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign an assessment</DialogTitle>
          <DialogDescription>
            Send a scenario, case, work-sample, or defense item to{" "}
            {withEmail.length} candidate(s). It appears in their applicant portal
            alongside interviews.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="assess-mode">Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as AssessmentMode)}>
              <SelectTrigger id="assess-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assess-item">Content item id</Label>
            <Input
              id="assess-item"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="e.g. gst-itc-dispute-keyed"
            />
            <p className="text-xs text-muted">
              The id of an SME-curated item in the {domain} library. Draft items
              won't open for the candidate until promoted.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assess-title">Title (optional)</Label>
            <Input
              id="assess-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shown on the candidate's card"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={assign} disabled={!canAssign}>
            {submitting ? "Assigning…" : `Assign to ${withEmail.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
