/**
 * BlueprintRubricTable — the scannable L1-L5 rubric for a blueprint's skills.
 * One expandable row per skill: name, type, criticality, target proficiency and
 * probe budget on the summary line; the five proficiency levels (L1-L5) with the
 * target level highlighted on expand. Reads the widened BlueprintSkill contract
 * (skill_type / is_critical / target_probes, all optional) so older blueprints
 * still render. Token-true, sentence case, font-mono tabular numerics.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlueprintSkill, SkillType } from "@/services/templateApi";

const TYPE_TONE: Record<SkillType, string> = {
  technical: "bg-info-soft text-info",
  behavioral: "bg-gold-soft text-gold-ink",
  cultural: "bg-success-soft text-success",
};

const TYPE_LABEL: Record<SkillType, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  cultural: "Cultural",
};

function targetLevel(skill: BlueprintSkill): { level: number; name: string } | null {
  const n = skill.expected_proficiency;
  if (!n) return null;
  const match = skill.proficiency_levels?.find((l) => l.level === n);
  return { level: n, name: match?.name ?? `Level ${n}` };
}

function SkillRow({ skill }: { skill: BlueprintSkill }) {
  const [open, setOpen] = useState(false);
  const target = targetLevel(skill);
  const levels = [...(skill.proficiency_levels ?? [])].sort((a, b) => a.level - b.level);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-2"
      >
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{skill.name}</span>
            {skill.skill_type ? (
              <span className={cn("shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium", TYPE_TONE[skill.skill_type])}>
                {TYPE_LABEL[skill.skill_type]}
              </span>
            ) : null}
            {skill.is_critical ? (
              <span className="shrink-0 rounded-sm bg-danger-soft px-1.5 py-0.5 text-[10px] font-medium text-danger">
                Critical
              </span>
            ) : null}
          </div>
          {skill.description ? (
            <p className="mt-0.5 truncate text-xs text-muted">{skill.description}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          {target ? (
            <p className="font-mono text-xs tabular-nums text-ink-soft">
              Target L{target.level} · {target.name}
            </p>
          ) : (
            <p className="text-xs text-muted">No target set</p>
          )}
          {typeof skill.target_probes === "number" ? (
            <p className="font-mono text-[11px] tabular-nums text-muted">
              {skill.target_probes} probe{skill.target_probes === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </button>

      {open && levels.length > 0 ? (
        <ol className="space-y-1 border-t border-rule bg-paper-2 px-4 py-3">
          {levels.map((lvl) => {
            const isTarget = target?.level === lvl.level;
            return (
              <li
                key={lvl.level}
                className={cn(
                  "flex gap-3 rounded-sm px-2 py-1.5",
                  isTarget ? "bg-gold-soft/60 ring-1 ring-gold-ink/25" : "",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 font-mono text-[11px] font-semibold tabular-nums",
                    isTarget ? "text-gold-ink" : "text-muted",
                  )}
                >
                  L{lvl.level}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-xs font-medium", isTarget ? "text-ink" : "text-ink-soft")}>
                    {lvl.name}
                    {isTarget ? <span className="ml-1.5 text-[10px] font-normal text-gold-ink">target</span> : null}
                  </p>
                  {lvl.description ? (
                    <p className="text-[11px] leading-relaxed text-muted">{lvl.description}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

export interface BlueprintRubricTableProps {
  skills: BlueprintSkill[];
  className?: string;
}

export function BlueprintRubricTable({ skills, className }: BlueprintRubricTableProps) {
  if (!skills || skills.length === 0) {
    return (
      <p className={cn("rounded-md border border-rule bg-paper-2 px-4 py-8 text-center text-sm text-muted", className)}>
        No skills defined for this blueprint.
      </p>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-md border border-rule bg-paper", className)}>
      <div className="flex items-center justify-between border-b border-rule bg-paper-2 px-4 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Skill · proficiency rubric</p>
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">Target · probes</p>
      </div>
      <div className="divide-y divide-rule">
        {skills.map((skill) => (
          <SkillRow key={skill.skill_id} skill={skill} />
        ))}
      </div>
    </div>
  );
}
