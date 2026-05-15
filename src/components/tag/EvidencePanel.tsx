/**
 * Right-side detail panel for a selected TAG node.
 *
 * Shows the skill name, score, proficiency labels, and the evidence
 * findings from the reviewer transcript. Closes by clicking the X
 * or selecting a different node.
 */
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TagGraphNode } from "./TalentAnalysisGraph";

interface EvidencePanelProps {
  node: TagGraphNode;
  status: "strong" | "developing" | "gap" | "transferable" | "role_center";
  onClose: () => void;
}

const STATUS_LABELS: Record<EvidencePanelProps["status"], string> = {
  strong: "Strong",
  developing: "Developing",
  gap: "Gap",
  transferable: "Transferable Skill",
  role_center: "Target Role",
};

const STATUS_BG: Record<EvidencePanelProps["status"], string> = {
  strong: "bg-green-100 text-green-800",
  developing: "bg-orange-100 text-orange-800",
  gap: "bg-red-100 text-red-800",
  transferable: "bg-purple-100 text-purple-800",
  role_center: "bg-slate-800 text-slate-100",
};

export function EvidencePanel({ node, status, onClose }: EvidencePanelProps) {
  return (
    <motion.aside
      key={node.id}
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="absolute right-0 top-0 z-20 flex h-full w-[360px] flex-col overflow-y-auto border-l bg-white shadow-lg"
    >
      <header className="sticky top-0 flex items-start justify-between gap-2 border-b bg-white px-4 py-3">
        <div className="space-y-1">
          <Badge className={STATUS_BG[status]}>{STATUS_LABELS[status]}</Badge>
          <h3 className="text-lg font-semibold leading-tight text-slate-900">{node.label}</h3>
          {node.score != null && status !== "role_center" && (
            <p className="text-sm text-slate-500">Score: <span className="font-semibold text-slate-900">{node.score}/100</span></p>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close evidence panel">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="space-y-4 px-4 py-4 text-sm">
        {/* Proficiency comparison */}
        {(node.required_proficiency || node.demonstrated_proficiency || node.proficiency_label) && status !== "role_center" && (
          <section className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proficiency</h4>
            {node.proficiency_label && (
              <p className="text-slate-700"><span className="font-semibold">Assessment:</span> {node.proficiency_label}</p>
            )}
            {node.required_proficiency && (
              <p className="text-slate-700"><span className="font-semibold">Required:</span> {node.required_proficiency}</p>
            )}
            {node.demonstrated_proficiency && (
              <p className="text-slate-700"><span className="font-semibold">Demonstrated:</span> {node.demonstrated_proficiency}</p>
            )}
          </section>
        )}

        {/* Transferable provenance */}
        {status === "transferable" && node.transferable_from && (
          <section className="space-y-1.5 rounded bg-purple-50 p-3 text-purple-900">
            <h4 className="text-xs font-semibold uppercase tracking-wider">Transferred from</h4>
            <p>{node.transferable_from}</p>
          </section>
        )}

        {/* Evidence findings */}
        {node.evidence && node.evidence.length > 0 && (
          <section className="space-y-2">
            <h4 className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
              Evidence from the interview
            </h4>
            <ul className="space-y-2">
              {node.evidence.map((line, i) => (
                /* TAG-quote idiom: deliberate side accent on the marquee component. See styles.css .tag-panel-quote and DESIGN.md exception. */
                <li key={i} className="rounded-md border-l-2 border-gold bg-paper-2 px-3 py-2 text-ink-soft">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(!node.evidence || node.evidence.length === 0) && status !== "role_center" && (
          <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-slate-500">
            No evidence captured. (This usually means the candidate did not discuss the area in depth.)
          </p>
        )}
      </div>
    </motion.aside>
  );
}
