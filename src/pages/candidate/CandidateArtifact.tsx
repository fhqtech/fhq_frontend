/**
 * CandidateArtifact (PR-4) — a candidate completes a case study or work-sample
 * item: read the brief, upload the deliverable, submit. The artifact score is
 * provisional; a defense round follows (the candidate is sent there on submit).
 *
 * Route: /candidate/assessment/artifact/:itemId?candidateId=<profileId>&sessionId=<id>
 * Per CR-04 the candidate never sees a score — only a confirmation + the
 * human-in-the-loop note.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Upload, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assessmentsApi, type ArtifactItemView } from "@/services/assessmentsApi";

const MODE_LABEL: Record<string, string> = { case: "Case study", work_sample: "Work sample" };

export default function CandidateArtifact() {
  const { itemId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const candidateId = params.get("candidateId") || "";
  const sessionId = params.get("sessionId") || undefined;
  const domain = params.get("domain") || "finance";

  const [item, setItem] = useState<ArtifactItemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    assessmentsApi
      .getArtifactItem(itemId, domain)
      .then((it) => !cancelled && setItem(it))
      .catch((e) => !cancelled && setError(e?.message || "Could not load this assessment."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [itemId, domain]);

  async function submit() {
    if (!item || !file || !candidateId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { artifact_ref } = await assessmentsApi.uploadArtifact(candidateId, item.id, file);
      await assessmentsApi.submitArtifact({
        candidate_id: candidateId, item_id: item.id, artifact_ref, session_id: sessionId, domain,
      });
      // The artifact score is provisional — send the candidate into the defense round.
      const qs = new URLSearchParams({ candidateId, domain, ...(sessionId ? { sessionId } : {}) });
      navigate(`/candidate/assessment/defense/${encodeURIComponent(item.id)}?${qs.toString()}`);
    } catch (e: any) {
      setError(e?.message || "Submission failed. Please try again.");
      setSubmitting(false);
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
      ) : item ? (
        <Card className="p-0">
          <CardHeader>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              {MODE_LABEL[item.mode] || "Assessment"}
            </span>
            <CardTitle className="text-base text-ink pt-1">Your task</CardTitle>
            <CardDescription className="text-sm text-ink/80 whitespace-pre-line pt-1">
              {item.task_brief}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {item.criteria.length > 0 && (
              <div className="border-t border-rule pt-4">
                <p className="text-xs text-muted mb-2">What this assesses</p>
                <ul className="divide-y divide-rule">
                  {item.criteria.map((cr) => (
                    <li key={cr.id} className="py-1.5 text-sm text-ink">{cr.label}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-rule pt-4 space-y-2">
              <label htmlFor="artifact-file" className="text-sm text-ink">Upload your deliverable</label>
              <Input
                id="artifact-file" type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf,.xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-success" /> {file.name}
                </p>
              )}
              <p className="text-xs text-muted">
                After you submit, you'll be asked to walk through your choices in a short defense round.
              </p>
            </div>

            {error && (
              <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={submit} disabled={!file || submitting} className="rounded">
                <Upload className="h-4 w-4 mr-1.5" />
                {submitting ? "Submitting…" : "Submit & continue"}
              </Button>
            </div>
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
