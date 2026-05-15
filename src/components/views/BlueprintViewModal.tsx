import React, { useState, useEffect } from 'react';
import { X, Award, Wrench } from 'lucide-react';
import { SpinnerWithCopy } from '@/components/ui/spinner';
import { fetchFullBlueprint, FullBlueprintData, EvaluationPillar } from '@/services/templateApi';
import SkillsGraph from '../ui/SkillsGraph';

interface BlueprintViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  workspaceId: string;
  templateTitle: string;
}

export const BlueprintViewModal: React.FC<BlueprintViewModalProps> = ({
  isOpen,
  onClose,
  templateId,
  workspaceId,
  templateTitle,
}) => {
  const [blueprint, setBlueprint] = useState<FullBlueprintData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && templateId && workspaceId) {
      loadBlueprint();
    }
  }, [isOpen, templateId, workspaceId]);

  const loadBlueprint = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchFullBlueprint(workspaceId, templateId);
      if (response.success && response.blueprint) {
        setBlueprint(response.blueprint);
      } else {
        setError('Failed to load blueprint data');
      }
    } catch (err) {
      console.error('Error loading blueprint:', err);
      setError('Failed to load blueprint');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Check if we have the new skills-based structure
  const hasNewStructure = blueprint?.skills && blueprint.skills.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-xl shadow-3 w-full max-w-[1400px] max-h-[92vh] overflow-hidden flex flex-col border-2 border-rule"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Gen Z style */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-rule bg-paper-2">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-mono font-black text-xl text-ink uppercase tracking-wide">
                {blueprint?.role || templateTitle}
              </h2>
              {blueprint?.type && (
                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded uppercase ${
                  blueprint.type === 'screening'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {blueprint.type}
                </span>
              )}
              <span className="bg-ink text-paper text-[10px] font-mono font-bold px-2 py-1 rounded uppercase">
                skill tree
              </span>
            </div>
            {(blueprint?.description || blueprint?.overview) && (
              <p className="text-sm text-muted font-mono mt-1 max-w-2xl">
                {blueprint.description || blueprint.overview}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close blueprint"
            className="p-2 bg-paper-3 hover:bg-paper-4 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <SpinnerWithCopy size="lg" variant="brand" label="Loading blueprint…" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-red-600 font-medium font-mono">{error}</p>
                <button
                  onClick={loadBlueprint}
                  className="mt-4 px-4 py-2 bg-ink text-paper rounded-lg font-mono font-bold uppercase text-sm hover:bg-ink transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : blueprint ? (
            <>
              {/* Left Sidebar - Certifications & Tools */}
              <div className="w-56 shrink-0 border-r-2 border-rule bg-paper-2 p-4 flex flex-col gap-4">
                {/* Certifications */}
                {blueprint.certifications_recommended && blueprint.certifications_recommended.length > 0 && (
                  <div className="bg-paper border-2 border-rule rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-4 h-4 text-amber-500" />
                      <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">certs</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {blueprint.certifications_recommended.map((cert, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span className="text-[10px] font-mono text-muted leading-tight">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                {blueprint.tools && blueprint.tools.length > 0 && (
                  <div className="bg-paper border-2 border-rule rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="w-4 h-4 text-blue-500" />
                      <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">tools</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {blueprint.tools.map((tool, i) => (
                        <div key={i} className="flex flex-col">
                          <span className="text-[10px] font-mono font-bold text-ink-soft">{tool.name}</span>
                          {tool.category && (
                            <span className="text-[9px] font-mono text-muted-2">{tool.category}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ideal Candidate Profile */}
                {blueprint.ideal_candidate_profile && (
                  <div className="bg-paper border-2 border-rule rounded-lg p-3">
                    <p className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider mb-2">Ideal Candidate</p>
                    <p className="text-[10px] font-mono text-muted leading-relaxed">
                      {blueprint.ideal_candidate_profile}
                    </p>
                  </div>
                )}

                {/* No certs or tools message */}
                {(!blueprint.certifications_recommended || blueprint.certifications_recommended.length === 0) &&
                 (!blueprint.tools || blueprint.tools.length === 0) && (
                  <div className="bg-paper border-2 border-dashed border-rule rounded-lg p-4 text-center">
                    <p className="text-[10px] font-mono text-muted-2">No tools or certs specified</p>
                  </div>
                )}
              </div>

              {/* Center - Skill Map */}
              <div className="flex-1 px-6 py-4 bg-paper">
                {hasNewStructure && blueprint.skills ? (
                  <SkillsGraph
                    roleTitle={blueprint.role || templateTitle}
                    skills={blueprint.skills}
                    skillLayout={blueprint.skill_layout}
                    size={520}
                  />
                ) : blueprint.evaluation_pillars && blueprint.evaluation_pillars.length > 0 ? (
                  // Legacy pillars view
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
                      Evaluation Pillars
                    </h3>
                    {blueprint.evaluation_pillars.map((pillar, pillarIndex) => (
                      <LegacyPillarCard key={pillarIndex} pillar={pillar} index={pillarIndex} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted font-mono">No skills data available</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-muted font-mono">No blueprint data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-rule px-6 py-4 bg-paper-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-ink text-paper rounded-lg font-mono font-bold uppercase text-sm hover:bg-ink transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Legacy Pillar Card Component (for backward compatibility with old blueprints)
const LegacyPillarCard: React.FC<{ pillar: EvaluationPillar; index: number }> = ({ pillar, index }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const pillarColors = [
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' },
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100' },
  ];

  const colors = pillarColors[index % pillarColors.length];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-paper/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg ${colors.badge} ${colors.text} flex items-center justify-center font-bold text-sm`}>
            {index + 1}
          </span>
          <div>
            <h4 className="font-bold text-ink">{pillar.pillar_name}</h4>
            <p className="text-xs text-muted">
              {pillar.evaluation_criteria?.length || 0} skills to assess
              {pillar.weight_percentage && ` - ${pillar.weight_percentage}% weight`}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-muted-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {(pillar.pillar_description || pillar.description) && (
            <p className="text-sm text-muted bg-paper/60 p-3 rounded-lg">
              {pillar.pillar_description || pillar.description}
            </p>
          )}

          {pillar.evaluation_criteria && pillar.evaluation_criteria.length > 0 && (
            <div className="space-y-2">
              {pillar.evaluation_criteria.map((criteria, criteriaIndex) => (
                <div
                  key={criteriaIndex}
                  className="bg-paper rounded-lg p-3 border border-rule"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-ink text-sm">{criteria.skill_name}</h5>
                      {criteria.context && (
                        <p className="text-xs text-muted mt-1">{criteria.context}</p>
                      )}
                    </div>
                    {criteria.required_proficiency && (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-paper-3 text-muted rounded">
                        {criteria.required_proficiency}
                      </span>
                    )}
                  </div>

                  {criteria.interview_focus_areas && criteria.interview_focus_areas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {criteria.interview_focus_areas.map((area, areaIndex) => (
                        <span
                          key={areaIndex}
                          className="text-[10px] px-2 py-0.5 bg-paper-2 text-muted rounded border border-rule"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlueprintViewModal;
