/**
 * CandidateArtifact (S5/S6) — a candidate submits a case / work-sample
 * deliverable, then defends it (async, text-based per D5).
 *
 * Route: /candidate/assessment-artifact/:itemId?candidateId=<id>&domain=<d>&mode=<case|work_sample|defense>
 * Per CR-04 the candidate sees only confirmations + a human-in-the-loop note —
 * never a score. The artifact score is PROVISIONAL until the defense gates it.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { assessmentsApi, type ArtifactView } from "@/services/assessmentsApi";

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

async function uploadArtifact(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const token = localStorage.getItem("candidate_auth_token");
  const r = await fetch(`${API_BASE()}/api/upload-file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const result = await r.json().catch(() => ({}));
  if (!r.ok || !result?.upload_info?.gcs_url) {
    throw new Error(result?.errors?.[0] || "Could not upload your file");
  }
  return result.upload_info.gcs_url as string;
}

export default function CandidateArtifact() {
  const { itemId = "" } = useParams();
  const [params] = useSearchParams();
  const candidateId = params.get("candidateId") || "";
  const domain = params.get("domain") || "finance";
  const defenseOnly = (params.get("mode") || "") === "defense";

  const [item, setItem] = useState<ArtifactView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // step: submit artifact -> defend -> done. defenseOnly skips straight to defend.
  const [step, setStep] = useState<"artifact" | "defense" | "done">(
    defenseOnly ? "defense" : "artifact",
  );
  const [defense, setDefense] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    assessmentsApi
      .getArtifact(itemId, domain)
      .then((a) => !cancelled && setItem(a))
      .catch((e) => !cancelled && setError(e?.message || "Could not load this assessment."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [itemId, domain]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !candidateId) return;
    setBusy(true);
    setError(null);
    try {
      const ref = await uploadArtifact(file);
      await assessmentsApi.submitArtifact({
        candidate_id: candidateId,
        item_id: itemId,
        domain,
        artifact_ref: ref,
      });
      setStep("defense");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDefense() {
    if (defense.trim().length === 0 || !candidateId) return;
    setBusy(true);
    setError(null);
    try {
      await assessmentsApi.scoreDefense({
        candidate_id: candidateId,
        item_id: itemId,
        domain,
        defense_transcript: defense,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {loading ? (
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">Loading assessment…</p>
      ) : !candidateId ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">This assessment link is missing its candidate reference.</p>
        </div>
      ) : step === "done" ? (
        <Card className="p-0">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-base font-medium text-ink">Your submission and defense have been recorded.</p>
            <p className="text-xs text-muted max-w-sm">
              Your work is reviewed alongside the rest of your assessment by the hiring team. A human makes the final decision — this is one input among several.
            </p>
          </CardContent>
        </Card>
      ) : item ? (
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-base text-ink">
              {step === "defense" ? "Defend your submission" : "Your task"}
            </CardTitle>
            <CardDescription className="text-sm text-ink/80 whitespace-pre-line pt-1">
              {item.prompt}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.rubric.length > 0 && (
              <div className="rounded border border-rule p-3 space-y-1.5">
                <p className="text-xs font-semibold text-ink">What's assessed</p>
                <ul className="text-xs text-muted list-disc pl-4 space-y-1">
                  {item.rubric.map((c, i) => (
                    <li key={i}>
                      <span className="text-ink">{c.label}</span>
                      {c.description ? ` — ${c.description}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === "artifact" ? (
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-center gap-2 rounded border border-dashed border-rule p-6 cursor-pointer hover:bg-paper-2 text-sm text-ink">
                  <Upload className="h-4 w-4" />
                  {busy ? "Uploading…" : "Upload your deliverable (PDF or DOCX)"}
                  <input
                    type="file"
                    accept={(item.submission_spec?.accept || [".pdf", ".docx"]).join(",")}
                    onChange={onFile}
                    disabled={busy}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-muted">
                  After you upload, you'll be asked to defend the key choices in your work.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted">
                  Explain the key judgments in your submission, and how your approach would change if a core assumption changed.
                </p>
                <Textarea
                  value={defense}
                  onChange={(e) => setDefense(e.target.value)}
                  placeholder="Walk through your reasoning and the choices you made…"
                  rows={10}
                />
                <div className="flex justify-end">
                  <Button onClick={submitDefense} disabled={defense.trim().length === 0 || busy} className="rounded">
                    {busy ? "Submitting…" : "Submit defense"}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">{error || "Assessment not available."}</p>
        </div>
      )}
    </div>
  );
}
