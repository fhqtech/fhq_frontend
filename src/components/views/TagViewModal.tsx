import React from "react";
import { X } from "lucide-react";
import { TalentAnalysisGraph } from "@/components/tag/TalentAnalysisGraph";
import type { TagData } from "@/components/tag/types";

interface TagViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TagData;
  roleTitle?: string;
}

export const TagViewModal: React.FC<TagViewModalProps> = ({
  isOpen,
  onClose,
  data,
  roleTitle,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-xl shadow-3 w-full max-w-[1400px] max-h-[92vh] overflow-hidden flex flex-col border-2 border-rule"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b-2 border-rule bg-paper-2">
          <div>
            <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Talent Analysis Graph
            </span>
            {roleTitle && (
              <h2 className="font-mono font-black text-xl text-ink mt-1">
                {roleTitle}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-paper-3 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <TalentAnalysisGraph data={data} mode="result" />
        </div>
      </div>
    </div>
  );
};
