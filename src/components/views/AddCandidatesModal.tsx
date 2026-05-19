import React, { useState } from "react";
import { X, Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { interviewApi } from "@/services/interviewApi";

interface AddCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: string;
  interviewTitle?: string;
  onInvited?: () => void;
}

interface Row {
  name: string;
  email: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyRow = (): Row => ({ name: "", email: "" });

export const AddCandidatesModal: React.FC<AddCandidatesModalProps> = ({
  isOpen,
  onClose,
  interviewId,
  interviewTitle,
  onInvited,
}) => {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const updateRow = (idx: number, field: keyof Row, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validRows = rows
    .map((r) => ({ name: r.name.trim(), email: r.email.trim().toLowerCase() }))
    .filter((r) => r.name.length > 0 && EMAIL_RE.test(r.email));

  const canSubmit = validRows.length > 0 && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setRows([emptyRow()]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await interviewApi.inviteCandidates(interviewId, validRows);
      const created = result.invitations_created ?? validRows.length;
      const failed = result.emails_failed ?? 0;
      const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;

      if (errorCount > 0 || failed > 0) {
        toast({
          title: `Invited ${created}, ${errorCount + failed} issue(s)`,
          description: errorCount > 0
            ? "Some entries couldn't be invited (duplicate or invalid). Review and retry."
            : "Some invitation emails failed to send. Use Resend on the affected cards.",
          variant: "destructive",
        });
      } else {
        toast({
          title: created === 1 ? "Candidate invited" : `${created} candidates invited`,
          description: "Invitation email sent.",
        });
      }
      setRows([emptyRow()]);
      onInvited?.();
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't add candidates",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="bg-paper rounded-xl shadow-3 w-full max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col border-2 border-rule"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b-2 border-rule bg-paper-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Add candidates</h2>
            {interviewTitle && (
              <p className="text-xs text-muted mt-0.5">{interviewTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-2 hover:bg-paper-3 rounded transition-colors"
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="grid grid-cols-[1fr_1.6fr_auto] gap-3 items-end">
            <Label className="text-xs text-muted">Name</Label>
            <Label className="text-xs text-muted">Email</Label>
            <span />
            {rows.map((row, idx) => (
              <React.Fragment key={idx}>
                <Input
                  placeholder="Priya Sharma"
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                  disabled={submitting}
                />
                <Input
                  type="email"
                  placeholder="priya@example.com"
                  value={row.email}
                  onChange={(e) => updateRow(idx, "email", e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={submitting || rows.length === 1}
                  className="p-2 text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove row"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </React.Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            disabled={submitting}
            className="inline-flex items-center gap-1 text-xs font-medium text-gold-ink hover:underline disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another
          </button>
        </div>

        <footer className="px-6 py-4 border-t-2 border-rule bg-paper-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            They'll receive an email invitation right away.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send invite${validRows.length > 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};
