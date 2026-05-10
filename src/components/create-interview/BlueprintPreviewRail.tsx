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

interface BlueprintPreviewRailProps {
  title: string;
  type?: "screening" | "fitment";
  description?: string;
}

const TYPE_STYLES: Record<PreviewSkill["skill_type"], { bg: string; border: string; text: string; dot: string }> = {
  technical: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-500" },
  behavioral: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", dot: "bg-purple-500" },
  cultural: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
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
      className="rounded-sm bg-white p-5 sticky top-6"
      style={{ boxShadow: "inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
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
        <p className="text-xs text-red-600 py-6 text-center">{error}</p>
      ) : preview ? (
        <>
          {loading && (
            <div className="flex items-center text-[10px] text-muted-foreground mb-2">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Refreshing…
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider">
            {preview.skills.length} skills the interview will assess
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.skills.map((s, i) => {
              const style = TYPE_STYLES[s.skill_type] ?? TYPE_STYLES.technical;
              return (
                <span
                  key={`${s.shortName}-${i}`}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2 py-1 rounded border ${style.bg} ${style.border} ${style.text}`}
                  title={s.name}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {s.shortName}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Technical</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Behavioral</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Cultural</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            Preview only. Full blueprint is generated when you launch the interview.
          </p>
        </>
      ) : null}
    </div>
  );
}
