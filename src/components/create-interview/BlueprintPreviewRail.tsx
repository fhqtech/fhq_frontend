/**
 * Right-rail blueprint preview shown on CreateInterview Step 1.
 *
 * Calls POST /api/interviews/preview-blueprint after a 1-second debounce
 * once the title is long enough. Shows 10 skill chips colour-coded by type
 * (technical / behavioral / cultural). Lightweight — no persistence.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { previewBlueprint, type BlueprintPreview, type PreviewSkill } from "@/services/blueprintPreviewApi";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import { tagFromPreview } from "@/components/tag/adapters";

interface BlueprintPreviewRailProps {
  title: string;
  type?: "screening" | "fitment";
  description?: string;
}

const TYPE_STYLES: Record<PreviewSkill["skill_type"], { bg: string; border: string; text: string; dot: string }> = {
  technical: { bg: "bg-info-soft", border: "border-info/30", text: "text-info", dot: "bg-info" },
  behavioral: { bg: "bg-paper-3", border: "border-rule", text: "text-gold-ink", dot: "bg-ink" },
  cultural: { bg: "bg-warning-soft", border: "border-warning/30", text: "text-amber-800", dot: "bg-amber-500" },
};

export function BlueprintPreviewRail({ title, type, description }: BlueprintPreviewRailProps) {
  const [preview, setPreview] = useState<BlueprintPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastInputRef = useRef<string>("");

  useEffect(() => {
    const trimmed = title?.trim() ?? "";
    if (trimmed.length < 4) {
      setPreview(null);
      setError(null);
      return;
    }
    const inputKey = `${trimmed}|${type ?? ""}|${description?.trim() ?? ""}`;
    if (inputKey === lastInputRef.current) return;

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await previewBlueprint({ title: trimmed, type, description }, controller.signal);
        lastInputRef.current = inputKey;
        setPreview(data);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError("Couldn't generate preview. We'll try again on the next change.");
        }
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [title, type, description]);

  const handleRegenerate = () => {
    lastInputRef.current = "";
    // Trigger effect by toggling a dependency — easiest is to clear preview.
    setPreview(null);
  };

  return (
    <div
      className="rounded-sm bg-paper p-5 sticky top-6"
      style={{ boxShadow: 'var(--shadow-clay)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-info" />
          <h4 className="text-xs font-mono font-bold text-ink-soft">
            Blueprint Preview
          </h4>
        </div>
        {preview && !loading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            className="h-7 px-2 text-[10px] uppercase font-mono"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        )}
      </div>

      {!title || title.trim().length < 4 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          Type a role title to see the AI-generated skill blueprint.
        </p>
      ) : loading && !preview ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span className="text-xs">Generating preview…</span>
        </div>
      ) : error ? (
        <p className="text-xs text-danger py-6 text-center">{error}</p>
      ) : preview ? (
        <>
          {loading && (
            <div className="flex items-center text-[10px] text-muted-foreground mb-2">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Refreshing…
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mb-3">
            {preview.skills.length} skills the interview will assess
          </p>

          {/* Radial TAG preview — same component used on the result page,
              fed by tagFromPreview() with no scores / no annotations. */}
          <div className="-mx-2 mb-3">
            <TalentAnalysisGraph
              data={tagFromPreview(title, preview.skills)}
              mode="blueprint"
            />
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Preview only. Full blueprint is generated when you launch the interview.
          </p>
        </>
      ) : null}
    </div>
  );
}
