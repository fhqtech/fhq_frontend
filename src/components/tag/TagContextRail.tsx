/**
 * TagContextRail — left rail on TalentAnalysisGraph.
 *
 * Mirrors the BlueprintViewModal left rail: Certs (Award icon), Tools
 * (Wrench icon + category), Ideal Candidate (free text). Renders nothing
 * when all four are empty.
 */
import { Award, Wrench, User } from "lucide-react";
import type { TagTool } from "./types";

interface Props {
  certifications?: string[];
  tools?: TagTool[];
  idealCandidateProfile?: string | null;
}

export function TagContextRail({ certifications, tools, idealCandidateProfile }: Props) {
  const hasCerts = certifications && certifications.length > 0;
  const hasTools = tools && tools.length > 0;
  const hasIdeal = !!idealCandidateProfile && idealCandidateProfile.trim().length > 0;

  if (!hasCerts && !hasTools && !hasIdeal) return null;

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col gap-3">
      {hasCerts && (
        <div className="bg-paper border border-rule rounded-md p-3 shadow-1">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-gold-ink" />
            <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">Certs</p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {certifications!.map((cert, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                <span className="text-[11px] text-ink-soft leading-tight">{cert}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasTools && (
        <div className="bg-paper border border-rule rounded-md p-3 shadow-1">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-gold-ink" />
            <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">Tools</p>
          </div>
          <ul className="flex flex-col gap-2">
            {tools!.map((tool, i) => (
              <li key={i} className="flex flex-col">
                <span className="text-[11px] font-semibold text-ink-soft">{tool.name}</span>
                {tool.category && (
                  <span className="text-[10px] font-mono text-muted-2 uppercase tracking-wider">
                    {tool.category}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasIdeal && (
        <div className="bg-paper border border-rule rounded-md p-3 shadow-1">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gold-ink" />
            <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
              Ideal candidate
            </p>
          </div>
          <p className="text-[11px] text-ink-soft leading-relaxed whitespace-pre-line">
            {idealCandidateProfile}
          </p>
        </div>
      )}
    </aside>
  );
}

export default TagContextRail;
