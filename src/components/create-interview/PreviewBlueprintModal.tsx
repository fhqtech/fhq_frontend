/**
 * Preview-only modal twin of BlueprintViewModal.
 *
 * Renders the same 10-skill TAG the BlueprintPreviewRail already shows, but
 * full-size with a skill list beside it. No fetch — feeds directly from the
 * preview payload the rail already has in state. Exists because the full
 * BlueprintViewModal calls fetchFullBlueprint(workspaceId, templateId) and
 * the template doesn't exist yet at wizard time.
 */
import { X } from "lucide-react";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import { tagFromPreview } from "@/components/tag/adapters";
import type { PreviewSkill } from "@/services/blueprintPreviewApi";

interface PreviewBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type?: "screening" | "fitment";
  skills: PreviewSkill[];
}

const SKILL_TYPE_LABEL: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  cultural: "Cultural",
};

export function PreviewBlueprintModal({
  isOpen,
  onClose,
  title,
  type,
  skills,
}: PreviewBlueprintModalProps) {
  if (!isOpen) return null;

  const grouped: Record<string, PreviewSkill[]> = { technical: [], behavioral: [], cultural: [] };
  for (const s of skills) {
    const k = (s.skill_type as string) || "technical";
    if (grouped[k]) grouped[k].push(s);
    else grouped.technical.push(s);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-xl w-full max-w-[1200px] max-h-[92vh] overflow-hidden flex flex-col border-2 border-rule"
        style={{ boxShadow: "var(--shadow-3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-rule bg-paper-2">
          <div className="flex items-center gap-3">
            <h2 className="font-mono font-black text-xl text-ink">{title || "Role"}</h2>
            {type && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-1 rounded uppercase ${
                  type === "screening" ? "bg-paper-3 text-ink" : "bg-paper-3 text-gold-ink"
                }`}
              >
                {type}
              </span>
            )}
            <span className="bg-ink text-paper text-[10px] font-mono font-bold px-2 py-1 rounded uppercase">
              preview
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-sm hover:bg-paper-3 flex items-center justify-center"
            aria-label="Close preview"
          >
            <X className="w-4 h-4 text-ink" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-h-[420px]">
            <TalentAnalysisGraph data={tagFromPreview(title || "Role", skills)} mode="blueprint" />
          </div>
          <div className="space-y-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gold-ink">
              Skills the interview will assess
            </p>
            {(["technical", "behavioral", "cultural"] as const).map((bucket) =>
              grouped[bucket].length > 0 ? (
                <div key={bucket}>
                  <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted mb-2">
                    {SKILL_TYPE_LABEL[bucket]}
                  </p>
                  <ul className="space-y-1.5">
                    {grouped[bucket].map((s) => (
                      <li key={s.shortName} className="text-xs text-ink leading-snug">
                        <span className="font-mono text-ink-soft mr-2">·</span>
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-rule bg-paper-2">
          <p className="text-[11px] text-muted italic font-mono">
            Preview only. Full blueprint with proficiency anchors generates on launch.
          </p>
        </div>
      </div>
    </div>
  );
}
