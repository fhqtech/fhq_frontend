/**
 * P2-3 — add candidates to a role. A single paste-and-enroll surface: emails in,
 * candidates enrolled into the role's pipeline (they land in the screen column).
 * The valid-email count gates the action so a junk paste can't fire.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { parseEmails } from "@/lib/parseEmails";

export interface AddCandidatesToRoleProps {
  onSubmit: (emails: string[]) => Promise<void>;
}

export function AddCandidatesToRole({ onSubmit }: AddCandidatesToRoleProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const emails = parseEmails(text);

  const handleAdd = async () => {
    if (emails.length === 0) return;
    setBusy(true);
    try {
      await onSubmit(emails);
      setText("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold" size="sm">
          <UserPlus className="mr-1.5 h-4 w-4" /> Add candidates
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add candidates to this role</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="role-emails">Candidate emails</Label>
          <Textarea
            id="role-emails"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste emails, separated by commas or new lines."
          />
          <p className="text-xs text-ink-soft">
            <span className="font-mono tabular-nums">{emails.length}</span> valid email
            {emails.length === 1 ? "" : "s"} detected.
          </p>
        </div>
        <DialogFooter>
          <Button variant="gold" disabled={emails.length === 0 || busy} onClick={handleAdd}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {emails.length} candidate{emails.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
