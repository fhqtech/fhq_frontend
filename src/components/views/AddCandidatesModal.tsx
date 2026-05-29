import React, { useMemo, useRef, useState } from "react";
import { X, Plus, Minus, Loader2, Check, AlertCircle, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { interviewApi } from "@/services/interviewApi";
import { toastPlanError } from "@/lib/planErrorToast";
import { useCredits, useRefreshCredits } from "@/hooks/usePlan";

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

// Reused by both tabs — keep a single source of truth for the email shape.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generous but not unbounded — protects the browser from a 10 MB paste.
const MAX_PASTE_BYTES = 512 * 1024; // ~500 KB
const MAX_PARSED_ROWS = 2000;

const emptyRow = (): Row => ({ name: "", email: "" });

/* --------------------------------- parsing -------------------------------- */

interface ParsedRow {
  rowIndex: number; // 1-based, for display
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

/**
 * Split a single CSV line into fields, respecting double-quoted segments
 * (so `"Sharma, Priya","p@x.co"` stays two fields, not three). Doubled
 * quotes (`""`) inside a quoted field unescape to a single quote.
 *
 * This is intentionally not full RFC 4180 — we don't need embedded
 * newlines because the parser already split on `\n` upstream.
 */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        out.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  out.push(current);
  return out.map((f) => f.trim());
}

function looksLikeHeader(fields: string[]): boolean {
  // If neither field on the first row contains '@', treat it as a header.
  // Anything else (e.g. `Priya,priya@x.co`) is data.
  return !fields.some((f) => f.includes("@"));
}

interface ParseResult {
  rows: ParsedRow[];
  hadHeader: boolean;
  separator: "," | "\t";
  truncated: boolean;
}

function parseCsv(input: string): ParseResult {
  const trimmed = input.replace(/\r\n?/g, "\n").trim();
  if (!trimmed) {
    return { rows: [], hadHeader: false, separator: ",", truncated: false };
  }

  // Drop empty + whitespace-only lines.
  const rawLines = trimmed.split("\n").filter((l) => l.trim().length > 0);

  // Detect separator on the first non-empty line. If a comma-split yields a
  // single field but a tab-split yields ≥2, fall back to TSV.
  const first = rawLines[0];
  let separator: "," | "\t" = ",";
  if (splitCsvLine(first, ",").length < 2 && splitCsvLine(first, "\t").length >= 2) {
    separator = "\t";
  }

  const firstFields = splitCsvLine(first, separator);
  const hadHeader = looksLikeHeader(firstFields);
  const dataLines = hadHeader ? rawLines.slice(1) : rawLines;

  const truncated = dataLines.length > MAX_PARSED_ROWS;
  const sliced = truncated ? dataLines.slice(0, MAX_PARSED_ROWS) : dataLines;

  // Track duplicates within the paste itself; the backend will flag any
  // that duplicate previously-invited emails on this interview.
  const seen = new Set<string>();
  const rows: ParsedRow[] = sliced.map((line, i) => {
    const fields = splitCsvLine(line, separator);
    const name = (fields[0] ?? "").trim();
    const emailRaw = (fields[1] ?? "").trim().toLowerCase();
    const rowIndex = i + 1;

    if (!name && !emailRaw) {
      return { rowIndex, name, email: emailRaw, valid: false, error: "Empty row" };
    }
    if (!name) {
      return { rowIndex, name, email: emailRaw, valid: false, error: "Missing name" };
    }
    if (!emailRaw) {
      return { rowIndex, name, email: emailRaw, valid: false, error: "Missing email" };
    }
    if (!EMAIL_RE.test(emailRaw)) {
      return { rowIndex, name, email: emailRaw, valid: false, error: "Invalid email" };
    }
    if (seen.has(emailRaw)) {
      return { rowIndex, name, email: emailRaw, valid: false, error: "Duplicate in paste" };
    }
    seen.add(emailRaw);
    return { rowIndex, name, email: emailRaw, valid: true };
  });

  return { rows, hadHeader, separator, truncated };
}

/* ---------------------------- post-submit state --------------------------- */

interface SubmitOutcome {
  ok: boolean;
  successful: number;
  failed: number;
  emailsFailed: number;
  errors: Array<{ index: number; error: string; email?: string; name?: string }>;
}

/* ---------------------------------- modal --------------------------------- */

export const AddCandidatesModal: React.FC<AddCandidatesModalProps> = ({
  isOpen,
  onClose,
  interviewId,
  interviewTitle,
  onInvited,
}) => {
  const [tab, setTab] = useState<"individual" | "bulk">("individual");

  // Individual tab state
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  // Bulk tab state
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Shared submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitOutcome, setSubmitOutcome] = useState<SubmitOutcome | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { toast } = useToast();
  const credits = useCredits();
  const refreshCredits = useRefreshCredits();

  const parsed = useMemo(() => parseCsv(pasteText), [pasteText]);
  const validBulkRows = useMemo(
    () => parsed.rows.filter((r) => r.valid).map((r) => ({ name: r.name, email: r.email })),
    [parsed.rows],
  );

  if (!isOpen) return null;

  /* ------------------------- individual-tab helpers ----------------------- */

  const updateRow = (idx: number, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (idx: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));

  const validIndividualRows = rows
    .map((r) => ({ name: r.name.trim(), email: r.email.trim().toLowerCase() }))
    .filter((r) => r.name.length > 0 && EMAIL_RE.test(r.email));

  /* ---------------------------- bulk-tab helpers -------------------------- */

  const handleFile = async (file: File) => {
    setFileError(null);
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setFileError("Choose a .csv, .tsv, or .txt file.");
      return;
    }
    if (file.size > MAX_PASTE_BYTES) {
      setFileError(`File is too large (max ${Math.round(MAX_PASTE_BYTES / 1024)} KB). Split and try again.`);
      return;
    }
    try {
      const text = await file.text();
      setFileName(file.name);
      setPasteText(text);
    } catch {
      setFileError("Couldn't read that file.");
    }
  };

  const onPasteChange = (value: string) => {
    if (value.length > MAX_PASTE_BYTES) {
      // Don't silently truncate — flag it so the recruiter knows.
      setFileError(`Paste exceeds ${Math.round(MAX_PASTE_BYTES / 1024)} KB. Trim and try again.`);
      return;
    }
    setFileError(null);
    setFileName(null);
    setPasteText(value);
  };

  /* ------------------------------- submit -------------------------------- */

  const candidatesToSend: Row[] =
    tab === "individual" ? validIndividualRows : validBulkRows;

  // P-Plans F3: also gate on credit balance. 1 credit per candidate.
  const requiredCredits = candidatesToSend.length;
  const hasEnoughCredits = credits.remaining >= requiredCredits;
  const canSubmit = candidatesToSend.length > 0 && !submitting && hasEnoughCredits;

  const handleClose = () => {
    if (submitting) return;
    // Reset everything so the modal opens clean next time.
    setRows([emptyRow()]);
    setPasteText("");
    setFileName(null);
    setFileError(null);
    setSubmitOutcome(null);
    setTab("individual");
    onClose();
  };

  const handleCancelInFlight = () => {
    abortRef.current?.abort();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitOutcome(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await interviewApi.inviteCandidates(
        interviewId,
        candidatesToSend,
        { signal: controller.signal },
      );

      // Backend returns either `successful_invitations` (current) or
      // `invitations_created` (legacy alias) — accept both.
      const successful =
        result.successful_invitations ??
        result.invitations_created ??
        candidatesToSend.length;
      const failed = result.failed_invitations ?? 0;
      const emailsFailed = result.emails_failed ?? 0;
      const rawErrors = Array.isArray(result.errors) ? result.errors : [];
      const errors = rawErrors.map((e) => ({
        index: e.index,
        error: e.error,
        email: e.data?.email,
        name: e.data?.name,
      }));

      const outcome: SubmitOutcome = {
        ok: failed === 0 && emailsFailed === 0,
        successful,
        failed,
        emailsFailed,
        errors,
      };
      setSubmitOutcome(outcome);

      if (outcome.ok) {
        toast({
          title:
            successful === 1
              ? "Candidate invited"
              : `${successful} candidates invited`,
          description: "Invitation email sent.",
        });
        onInvited?.();
        // W-FE-P1: refresh credit balance so the Header badge + any
        // <useCredits/> consumers reflect the post-invite balance
        // without waiting for a manual page refresh.
        void refreshCredits();
        // Close on full success — keep open on partial so the recruiter
        // can read per-row errors before dismissing.
        handleClose();
        return;
      }

      const issues = failed + emailsFailed;
      toast({
        title: `Invited ${successful}, ${issues} issue(s)`,
        description:
          failed > 0
            ? "Some entries couldn't be invited — see the list below."
            : "Some invitation emails failed to send. Use Resend on the affected cards.",
        variant: "destructive",
      });
      onInvited?.();
      // Partial success still consumed credits — refresh.
      void refreshCredits();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast({
          title: "Send cancelled",
          description: "No invitations were created.",
        });
      } else if (!toastPlanError(toast, err)) {
        // Not a credit/plan denial — generic error.
        toast({
          title: "Couldn't add candidates",
          description: err instanceof Error ? err.message : "Try again in a moment.",
          variant: "destructive",
        });
      } else {
        // Plan/credit denial — backend's `remaining` is authoritative.
        void refreshCredits();
      }
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  };

  /* --------------------------------- view -------------------------------- */

  const sendLabel =
    tab === "individual"
      ? `Send invite${validIndividualRows.length === 1 ? "" : "s"}`
      : validBulkRows.length > 0
        ? `Send ${validBulkRows.length} invitation${validBulkRows.length === 1 ? "" : "s"}`
        : "Send invitations";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        className="bg-paper rounded-xl shadow-3 w-full max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col border-2 border-rule"
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

        <div className="flex-1 overflow-auto p-6">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              if (submitting) return;
              setTab(v as "individual" | "bulk");
              setSubmitOutcome(null);
            }}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="individual" disabled={submitting}>
                Individual
              </TabsTrigger>
              <TabsTrigger value="bulk" disabled={submitting}>
                Bulk paste / CSV
              </TabsTrigger>
            </TabsList>

            {/* -------------------------- individual --------------------------- */}
            <TabsContent value="individual" className="space-y-4">
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
                      placeholder="priya@firm.co.in"
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
            </TabsContent>

            {/* ----------------------------- bulk ------------------------------ */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted">
                  Paste rows (one per line) or upload a CSV / TSV
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      // Reset so the same file can be picked again.
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload file
                  </Button>
                </div>
              </div>

              <Textarea
                value={pasteText}
                onChange={(e) => onPasteChange(e.target.value)}
                disabled={submitting}
                placeholder={`Priya Sharma, priya@firm.co.in\nArjun Mehta, arjun@firm.co.in\nRohan Iyer, rohan@firm.co.in`}
                className="min-h-[140px] font-mono text-xs"
              />

              {fileName && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Loaded {fileName}</span>
                </div>
              )}
              {fileError && (
                <div className="flex items-start gap-2 text-xs text-danger rounded-md border border-danger/40 bg-danger/5 px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Preview */}
              {pasteText.trim().length === 0 ? (
                <div className="rounded-md border border-dashed border-rule bg-paper-2 px-4 py-6 text-center">
                  <p className="text-sm text-ink">Paste rows above</p>
                  <p className="text-xs text-muted mt-1">
                    Format: one row per candidate, comma-separated.
                    {" "}
                    <span className="font-mono">Priya Sharma, priya@firm.co.in</span>
                  </p>
                </div>
              ) : validBulkRows.length === 0 ? (
                <div className="rounded-md border border-danger/40 bg-danger/5 px-4 py-3">
                  <p className="text-sm font-medium text-danger">
                    We couldn't find any name + email pairs.
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Format: one row per candidate, comma-separated, e.g.{" "}
                    <span className="font-mono">Priya Sharma, priya@firm.co.in</span>.
                    Header row optional. Tabs work too.
                  </p>
                </div>
              ) : (
                <PreviewTable parsed={parsed} />
              )}

              {parsed.truncated && (
                <p className="text-xs text-muted">
                  Showing first {MAX_PARSED_ROWS} rows. Trim the input to see the rest.
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Submit outcome (partial-failure detail) */}
          {submitOutcome && !submitOutcome.ok && (
            <div className="mt-4 rounded-md border border-rule bg-paper-2 p-3 space-y-2">
              <p className="text-sm font-medium text-ink">
                Sent {submitOutcome.successful} of{" "}
                {submitOutcome.successful + submitOutcome.failed}.
                {submitOutcome.emailsFailed > 0 &&
                  ` ${submitOutcome.emailsFailed} email${submitOutcome.emailsFailed === 1 ? "" : "s"} failed to deliver.`}
              </p>
              {submitOutcome.errors.length > 0 && (
                <ul className="text-xs space-y-1">
                  {submitOutcome.errors.slice(0, 10).map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-danger">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-mono">{e.email ?? e.name ?? `Row ${e.index + 1}`}</span>
                        {" — "}
                        {e.error}
                      </span>
                    </li>
                  ))}
                  {submitOutcome.errors.length > 10 && (
                    <li className="text-muted">
                      +{submitOutcome.errors.length - 10} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t-2 border-rule bg-paper-2 flex items-center justify-between gap-3">
          <div className="text-xs">
            <p className="text-muted">
              {submitting
                ? `Sending ${candidatesToSend.length} invitation${candidatesToSend.length === 1 ? "" : "s"}…`
                : "They'll receive an email invitation right away."}
            </p>
            {/* P-Plans F3: surface cost + balance. Red when short, muted otherwise. */}
            {!submitting && candidatesToSend.length > 0 && (
              <p className={`mt-0.5 font-mono tabular-nums ${hasEnoughCredits ? 'text-muted' : 'text-danger'}`}>
                Uses {requiredCredits} credit{requiredCredits === 1 ? '' : 's'} · {credits.remaining} remaining
                {!hasEnoughCredits && ' — out of credits, contact us to add more.'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {submitting ? (
              <Button variant="outline" size="sm" onClick={handleCancelInFlight}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleClose}>
                Close
              </Button>
            )}
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending…
                </>
              ) : (
                sendLabel
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

/* ------------------------------ preview table ----------------------------- */

const PreviewTable: React.FC<{ parsed: ParseResult }> = ({ parsed }) => {
  const validCount = parsed.rows.filter((r) => r.valid).length;
  const invalidCount = parsed.rows.length - validCount;
  return (
    <div className="rounded-md border border-rule overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-paper-2 border-b border-rule text-xs">
        <span className="text-muted">
          {parsed.hadHeader && <span className="mr-2">Header detected.</span>}
          {parsed.separator === "\t" && <span className="mr-2">Tab-separated.</span>}
          {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} parsed
        </span>
        <span className="font-mono tabular-nums">
          <span className="text-success">{validCount} ok</span>
          {invalidCount > 0 && (
            <span className="text-danger ml-2">{invalidCount} to fix</span>
          )}
        </span>
      </div>
      <div className="max-h-[260px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-paper border-b border-rule">
            <tr className="text-left text-muted">
              <th className="px-3 py-1.5 font-medium w-10">#</th>
              <th className="px-3 py-1.5 font-medium">Name</th>
              <th className="px-3 py-1.5 font-medium">Email</th>
              <th className="px-3 py-1.5 font-medium w-32">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {parsed.rows.map((r) => (
              <tr key={r.rowIndex} className={r.valid ? "" : "bg-danger/5"}>
                <td className="px-3 py-1.5 font-mono tabular-nums text-muted">{r.rowIndex}</td>
                <td className="px-3 py-1.5 text-ink truncate max-w-[180px]">{r.name || <span className="text-muted">—</span>}</td>
                <td className="px-3 py-1.5 font-mono text-ink truncate max-w-[220px]">
                  {r.email || <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-1.5">
                  {r.valid ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check className="h-3 w-3" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <AlertCircle className="h-3 w-3" />
                      {r.error}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
