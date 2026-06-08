/**
 * CandidateScenario (A2) — a candidate answers one scenario / SJT item.
 *
 * Route: /candidate/assessment/:scenarioId?candidateId=<profileId>&sessionId=<id>
 * Keyed items render choices; open items render a free-text box. On submit the
 * server scores + stores the Evidence. Per CR-04 the candidate sees only a
 * confirmation + a human-in-the-loop note — never the score.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { assessmentsApi, type ScenarioView } from "@/services/assessmentsApi";

export default function CandidateScenario() {
  const { scenarioId = "" } = useParams();
  const [params] = useSearchParams();
  const candidateId = params.get("candidateId") || "";
  const sessionId = params.get("sessionId") || undefined;
  const battery = params.get("battery") || "";
  const batteryItem = params.get("batteryItem") || "";
  const domain = params.get("domain") || "finance";

  const [scenario, setScenario] = useState<ScenarioView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [restored, setRestored] = useState(false);

  // Save-and-resume: open-text answers autosave to localStorage so a refresh /
  // accidental close doesn't lose work. Keyed choices are one tap — not saved.
  const draftKey = `assess_draft:${candidateId}:${scenarioId}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    assessmentsApi
      .getScenario(scenarioId, domain)
      .then((s) => {
        if (cancelled) return;
        setScenario(s);
        if (s.response_type === "open") {
          const saved = localStorage.getItem(draftKey);
          if (saved) { setText(saved); setRestored(true); }
        }
      })
      .catch((e) => !cancelled && setError(e?.message || "Could not load this assessment."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [scenarioId, domain]);

  function onText(v: string) {
    setText(v);
    setRestored(false);
    try { v.trim() ? localStorage.setItem(draftKey, v) : localStorage.removeItem(draftKey); } catch { /* quota / private mode */ }
  }

  const answered = scenario?.response_type === "keyed" ? !!choice : text.trim().length > 0;

  async function submit() {
    if (!scenario || !answered || !candidateId) return;
    setSubmitting(true);
    setError(null);
    try {
      await assessmentsApi.scoreScenario({
        candidate_id: candidateId,
        scenario_id: scenario.id,
        session_id: sessionId,
        domain,
        chosen_option_id: scenario.response_type === "keyed" ? choice : undefined,
        response: scenario.response_type === "open" ? text : undefined,
      });
      if (battery && batteryItem) {
        try { await assessmentsApi.markBatteryItem(battery, batteryItem); } catch { /* progress is best-effort */ }
      }
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
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
        <p className="text-sm text-muted py-12 text-center" aria-busy="true">Loading assessment…</p>
      ) : !candidateId ? (
        <div className="py-12 flex flex-col items-center gap-2 text-center" role="alert">
          <AlertCircle className="h-5 w-5 text-warning" />
          <p className="text-sm text-ink">This assessment link is missing its candidate reference.</p>
        </div>
      ) : submitted ? (
        <Card className="p-0">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-base font-medium text-ink">Your response has been recorded.</p>
            <p className="text-xs text-muted max-w-sm">
              Your answer is reviewed alongside the rest of your assessment by the hiring team. A human makes the final decision — this is one input among several.
            </p>
          </CardContent>
        </Card>
      ) : scenario ? (
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-base text-ink">Scenario</CardTitle>
            <CardDescription className="text-sm text-ink/80 whitespace-pre-line pt-1">
              {scenario.prompt}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scenario.response_type === "keyed" ? (
              <RadioGroup value={choice} onValueChange={setChoice} className="space-y-2">
                {scenario.options.map((o) => (
                  <div key={o.id} className="flex items-start gap-3 rounded border border-rule p-3 hover:bg-paper-2">
                    <RadioGroupItem value={o.id} id={`opt-${o.id}`} className="mt-0.5" />
                    <Label htmlFor={`opt-${o.id}`} className="text-sm text-ink font-normal leading-snug cursor-pointer">
                      {o.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-1.5">
                <Textarea
                  value={text}
                  onChange={(e) => onText(e.target.value)}
                  placeholder="Explain your approach and the judgment behind it…"
                  rows={8}
                />
                <p className="text-xs text-muted">
                  {restored
                    ? "Restored your saved draft — pick up where you left off."
                    : text.trim()
                    ? "Saved on this device. You can close and come back."
                    : "Your answer saves automatically as you type."}
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={submit} disabled={!answered || submitting} className="rounded">
                {submitting ? "Submitting…" : "Submit response"}
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
