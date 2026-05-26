/**
 * Right-rail blueprint preview shown on CreateInterview Step 1.
 *
 * Calls POST /api/interviews/preview-blueprint on EXPLICIT triggers only —
 * never on every keystroke. Parent bumps `triggerKey` (e.g. on input blur,
 * Enter in title, or Refresh click). The rail also exposes a Refresh button
 * for manual re-runs.
 *
 * Old behavior: 1-second debounce on every prop change. New behavior: only
 * fire when `triggerKey` actually changes. Cancellation via AbortController.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  previewBlueprint,
  PreviewOutOfScopeError,
  type BlueprintPreview,
} from "@/services/blueprintPreviewApi";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import { tagFromPreview } from "@/components/tag/adapters";
import { PreviewBlueprintModal } from "@/components/create-interview/PreviewBlueprintModal";

interface BlueprintPreviewRailProps {
  title: string;
  type?: "screening" | "fitment";
  description?: string;
  /**
   * Parent-controlled trigger. Bump this (e.g. ++) when the user signals
   * they want a fresh preview — blur of title/description, Enter in title,
   * etc. The rail does NOT trigger on prop changes alone.
   */
  triggerKey: number;
  /**
   * Free-text refinement notes. Recruiter can nudge the blueprint with
   * specifics like "include GST compliance, lean Big-4". Persisted on
   * the parent form so it carries into the final blueprint generation.
   */
  notes?: string;
  onNotesChange?: (next: string) => void;
}

function formatTimeAgo(ms: number): string {
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export function BlueprintPreviewRail({
  title,
  type,
  description,
  triggerKey,
  notes,
  onNotesChange,
}: BlueprintPreviewRailProps) {
  const [preview, setPreview] = useState<BlueprintPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [_tick, setTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const lastTriggerRef = useRef<number>(-1);
  const lastInputRef = useRef<string>("");
  const inFlightControllerRef = useRef<AbortController | null>(null);

  // Tick every 15s so "Last generated X ago" stays fresh.
  useEffect(() => {
    if (!generatedAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, [generatedAt]);

  // Fire preview only when triggerKey changes AND input is meaningful.
  useEffect(() => {
    const trimmed = title?.trim() ?? "";
    if (trimmed.length < 4) {
      setPreview(null);
      setError(null);
      lastTriggerRef.current = triggerKey;
      return;
    }
    if (triggerKey === lastTriggerRef.current) return;

    const inputKey = `${trimmed}|${type ?? ""}|${description?.trim() ?? ""}|${notes?.trim() ?? ""}`;
    if (inputKey === lastInputRef.current) {
      // Same input, just record the trigger so we don't re-fire.
      lastTriggerRef.current = triggerKey;
      return;
    }

    // Cancel any in-flight call.
    inFlightControllerRef.current?.abort();
    const controller = new AbortController();
    inFlightControllerRef.current = controller;
    lastTriggerRef.current = triggerKey;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await previewBlueprint(
          { title: trimmed, type, description, notes },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          lastInputRef.current = inputKey;
          setPreview(data);
          setGeneratedAt(Date.now());
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          // R8.2: surface the finance-only rejection copy verbatim
          // instead of the generic "couldn't generate" message.
          if (err instanceof PreviewOutOfScopeError) {
            setError(err.message);
          } else {
            setError("Couldn't generate preview. Click refresh to try again.");
          }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
  }, [triggerKey, title, type, description, notes]);

  const handleRefresh = () => {
    // Force a re-fire by invalidating the input cache; parent will need to
    // bump triggerKey for any future field-blur to also fire.
    lastInputRef.current = "";
    lastTriggerRef.current = -1;
    setPreview(null);
    setGeneratedAt(null);
    // Self-trigger by re-running the effect — we reset lastTriggerRef so the
    // next render sees a "new" triggerKey.
    setTick((n) => n + 1);
    // Note: the effect won't fire because triggerKey didn't change. So we
    // call directly here.
    void runPreview();
  };

  const runPreview = async () => {
    const trimmed = title?.trim() ?? "";
    if (trimmed.length < 4) return;
    inFlightControllerRef.current?.abort();
    const controller = new AbortController();
    inFlightControllerRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      const data = await previewBlueprint(
        { title: trimmed, type, description, notes },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        lastInputRef.current = `${trimmed}|${type ?? ""}|${description?.trim() ?? ""}|${notes?.trim() ?? ""}`;
        setPreview(data);
        setGeneratedAt(Date.now());
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        if (err instanceof PreviewOutOfScopeError) {
          setError(err.message);
        } else {
          setError("Couldn't generate preview. Click refresh to try again.");
        }
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const timeAgoText = generatedAt
    ? `Last generated ${formatTimeAgo(Date.now() - generatedAt)}`
    : null;

  return (
    <div
      className="rounded-sm bg-paper p-5 sticky top-6"
      style={{ boxShadow: 'var(--shadow-clay)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-info" />
          <h4 className="text-xs font-mono font-bold text-ink-soft">
            Blueprint preview
          </h4>
        </div>
        {(preview || error) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-7 px-2 text-[10px] font-mono"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {!title || title.trim().length < 4 ? (
        <p className="text-xs text-muted py-6 text-center">
          Type a role title (at least 4 characters), then click outside the
          field to generate the AI skill blueprint.
        </p>
      ) : loading && !preview ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted">
          <Loader2 className="w-5 h-5 animate-spin mb-2 text-gold-ink" />
          <span className="text-xs">Generating preview…</span>
          <span className="text-[10px] text-muted-2 mt-1">~2 seconds</span>
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-xs text-danger mb-3">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-7 px-3 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Try again
          </Button>
        </div>
      ) : preview ? (
        <>
          {loading && (
            <div className="flex items-center text-[10px] text-muted mb-2">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Refreshing…
            </div>
          )}
          <p className="text-[10px] text-muted mb-3">
            {preview.skills.length} skills the interview will assess
          </p>

          {/* Radial TAG preview — same component used on the result page,
              fed by tagFromPreview() with no scores / no annotations.
              Click opens PreviewBlueprintModal for a full-size view. */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="block w-full -mx-2 mb-2 cursor-pointer hover:opacity-90 transition-opacity rounded-sm"
            aria-label="Open full preview"
          >
            <TalentAnalysisGraph
              data={tagFromPreview(title, preview.skills)}
              mode="blueprint"
            />
          </button>

          <p className="text-[10px] text-muted-2 text-center mb-3">
            Click to explore the full preview.
          </p>

          {onNotesChange && (
            <div className="mb-3">
              <label
                htmlFor="blueprint-refine-notes"
                className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5"
              >
                Refine this preview (optional)
              </label>
              <Textarea
                id="blueprint-refine-notes"
                value={notes ?? ""}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="e.g. include GST compliance, lean Big-4 background, drop M&A"
                rows={3}
                className="text-xs resize-none"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading || !(notes?.trim())}
                  className="h-7 px-3 text-xs"
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  Refine with notes
                </Button>
              </div>
            </div>
          )}

          <div className="border-t border-rule pt-3 flex items-center justify-between">
            <p className="text-[10px] text-muted italic">
              Preview only. Full blueprint generated on launch.
            </p>
            {timeAgoText && (
              <p className="text-[10px] text-muted-2 font-mono">{timeAgoText}</p>
            )}
          </div>
        </>
      ) : (
        <div className="py-6 text-center">
          <p className="text-xs text-muted mb-3">
            Click outside the title field or press Enter to generate a preview.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-7 px-3 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" /> Generate preview
          </Button>
        </div>
      )}

      {preview && (
        <PreviewBlueprintModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={title}
          type={type}
          skills={preview.skills}
        />
      )}
    </div>
  );
}
