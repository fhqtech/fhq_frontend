/**
 * CandidateDefense (PR-4) — the mandatory defense round for a case / work-sample.
 *
 * Route: /candidate/assessment/defense/:itemId?candidateId=<profileId>&sessionId=<id>
 * The candidate explains and owns the choices in their submitted deliverable;
 * the server scores the defense and finalizes the (defense-gated) score. Text
 * entry is the v1 channel — the live voice defense reuses the interview voice
 * stack in a later pass. Per CR-04 no score is shown.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { assessmentsApi, type ArtifactItemView } from "@/services/assessmentsApi";

export default function CandidateDefense() {
  const { itemId = "" } = useParams();
  const [params] = useSearchParams();
  const candidateId = params.get("candidateId") || "";
  const sessionId = params.get("sessionId") || undefined;
  const domain = params.get("domain") || "finance";
  const battery = params.get("battery") || "";
  const batteryItem = params.get("batteryItem") || "";

  const [item, setItem] = useState<ArtifactItemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    assessmentsApi
      .getArtifactItem(itemId, domain)
      .then((it) => !cancelled && setItem(it))
      .catch(() => { /* context is best-effort; the defense can still be submitted */ })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [itemId, domain]);

  const ready = text.trim().length >= 20;

  async function submit() {
    if (!ready || !candidateId) return;
    setSubmitting(true);
    setError(null);
    try {
      await assessmentsApi.submitDefense({
        candidate_id: candidateId, item_id: itemId, defense_transcript: text.trim(),
        session_id: sessionId, domain,
      });
      if (battery && batteryItem) {
        try { await assessmentsApi.markBatteryItem(battery, batteryItem); } catch { /* best-effort */ }
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {loading ? (
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">Loading…</p>
      ) : !candidateId ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">This link is missing its candidate reference.</p>
        </div>
      ) : submitted ? (
        <Card className="p-0">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-base font-medium text-ink">Your defense has been recorded.</p>
            <p className="text-xs text-muted max-w-sm">
              Your deliverable and your explanation are reviewed together by the hiring team. A human makes the final decision — this is one input among several.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <CardHeader>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Defense round
            </span>
            <CardTitle className="text-base text-ink pt-1">Walk us through your work</CardTitle>
            <CardDescription className="text-sm text-ink/80 pt-1">
              Explain the key choices you made and the reasoning behind them. If one fact changed, what would you do differently?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {item?.task_brief && (
              <div className="border-t border-rule pt-4">
                <p className="text-xs text-muted mb-1">Your task was</p>
                <p className="text-sm text-ink/80 whitespace-pre-line">{item.task_brief}</p>
              </div>
            )}

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Explain your approach, the trade-offs you weighed, and how you'd adapt if a key assumption changed…"
              rows={10}
            />

            {error && (
              <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={submit} disabled={!ready || submitting} className="rounded">
                {submitting ? "Submitting…" : "Submit defense"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
