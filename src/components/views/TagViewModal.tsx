import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[92vh] max-w-[1400px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-rule bg-paper-2 px-6 py-4 text-left">
          <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
            Talent Analysis Graph
          </span>
          <DialogTitle className="text-xl text-ink">
            {roleTitle ?? "Talent Analysis Graph"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6">
          <TalentAnalysisGraph data={data} mode="result" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
