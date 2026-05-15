import React, { useMemo } from 'react';
import { SkillNode, ProficiencyLevel, PROFICIENCY_CONFIG, EvaluationPillar } from '@/types/blueprintTypes';

interface SkillMindMapProps {
  nodes: SkillNode[];
  pillars: EvaluationPillar[];
  className?: string;
}

// Proficiency Badge Component with proper Tailwind classes
const ProficiencyBadge: React.FC<{ proficiency: ProficiencyLevel }> = ({ proficiency }) => {
  // Map proficiency to complete Tailwind classes (not dynamic)
  const getBadgeClasses = (prof: ProficiencyLevel) => {
    switch (prof) {
      case 'Expert':
        return 'bg-danger-soft text-danger border-danger/30';
      case 'Advanced':
        return 'bg-orange-100 text-orange-700 border-orange-500';
      case 'Intermediate':
      case 'Hands-On Experience':
        return 'bg-info-soft text-info border-info/30';
      case 'Basic':
      case 'Required':
      case 'Operational Experience':
        return 'bg-success-soft text-success border-green-500';
      default:
        return 'bg-paper-3 text-ink-soft border-rule-strong';
    }
  };

  const getDotClasses = (prof: ProficiencyLevel) => {
    switch (prof) {
      case 'Expert':
        return 'bg-red-700';
      case 'Advanced':
        return 'bg-orange-700';
      case 'Intermediate':
      case 'Hands-On Experience':
        return 'bg-info';
      case 'Basic':
      case 'Required':
      case 'Operational Experience':
        return 'bg-green-700';
      default:
        return 'bg-ink';
    }
  };

  const config = PROFICIENCY_CONFIG[proficiency] || {
    label: proficiency,
    description: 'Unknown proficiency level'
  };

  return (
    <div className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${getBadgeClasses(proficiency)}`}>
      <span className={`w-1.5 h-1.5 ${getDotClasses(proficiency)} rounded-full mr-1.5`}></span>
      {config.label}
    </div>
  );
};

const SkillMindMap: React.FC<SkillMindMapProps> = ({ nodes, pillars, className = '' }) => {
  // Group nodes by pillar for layout
  const pillarGroups = useMemo(() => {
    const groups: Record<string, SkillNode[]> = {};
    nodes.forEach(node => {
      if (!groups[node.pillar]) {
        groups[node.pillar] = [];
      }
      groups[node.pillar].push(node);
    });
    return groups;
  }, [nodes]);

  return (
    <div className={`${className}`}>
      {/* Grid of Pillar Tiles - Max 2 per row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(pillarGroups).map(([pillarName, pillarNodes], pillarIndex) => {
          // Find pillar metadata from pillars array
          const pillarData = pillars.find((p: any) => p.pillar_name === pillarName);
          const pillarDescription = pillarData?.pillar_description || pillarData?.description;
          const pillarWeight = pillarData?.weight_percentage || pillarData?.weight;

          return (
            <div
              key={pillarName}
              className="border border-rule-strong rounded-lg overflow-hidden bg-paper transition-all hover:shadow-2"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              {/* Pillar Header */}
              <div className="bg-paper-2 from-[hsl(var(--ink))] to-[hsl(var(--ink-soft))] text-paper p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold">
                        {pillarName}
                      </h3>
                      {pillarWeight && (
                        <div className="px-2 py-0.5 bg-paper/20 rounded text-xs font-semibold">
                          {pillarWeight}%
                        </div>
                      )}
                    </div>
                    {pillarDescription && (
                      <p className="text-paper/90 text-xs leading-relaxed">
                        {pillarDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills List */}
              <div className="p-5 space-y-4 bg-paper-2">
                {pillarNodes.map((node) => (
                    <div
                      key={node.id}
                      className="border border-rule rounded-md p-4 bg-paper hover:border-rule-strong transition-all"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                    >
                      {/* Skill Header - proficiency badge in top right */}
                      <div className="mb-2">
                        <div className="flex items-start justify-between">
                          {node.name !== pillarName && (
                            <h4 className="text-sm font-bold text-ink">
                              {node.name}
                            </h4>
                          )}
                          <div className="ml-auto">
                            <ProficiencyBadge proficiency={node.proficiency} />
                          </div>
                        </div>
                      </div>

                      {/* Interview Focus Areas - moved up with larger font */}
                      {node.focusAreas && node.focusAreas.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center mb-3">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                            <h5 className="text-sm font-semibold text-ink-soft uppercase">
                              Focus Areas ({node.focusAreas.length})
                            </h5>
                          </div>
                          <ul className="space-y-2 ml-4">
                            {node.focusAreas.map((area, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-orange-500 mr-2 text-xs">•</span>
                                <span className="text-xs text-muted leading-relaxed flex-1 uppercase">{area}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Qualifying Topics Chips */}
                      {pillarData?.qualifying_topics && pillarData.qualifying_topics.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center mb-2">
                            <span className="w-2 h-2 bg-info rounded-full mr-2"></span>
                            <h5 className="text-sm font-semibold text-ink-soft uppercase">
                              Qualifying Topics
                            </h5>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pillarData.qualifying_topics.map((topic: string, idx: number) => (
                              <div
                                key={idx}
                                className="px-3 py-1.5 bg-info-soft border border-info/30 rounded-full text-xs font-medium text-info uppercase"
                              >
                                {topic}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Context */}
                      {node.context && (
                        <p className="text-xs text-muted leading-relaxed mb-3">
                          {node.context}
                        </p>
                      )}

                      {/* Skill Integrations */}
                      {node.connections && node.connections.length > 0 && (
                        <div>
                          <div className="flex items-center mb-2">
                            <span className="w-2 h-2 bg-info rounded-full mr-2"></span>
                            <h5 className="text-xs font-semibold text-ink-soft">
                              Integrates With ({node.connections.length})
                            </h5>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {node.connections.map((connectionId, idx) => {
                              const connectedNode = nodes.find(n => n.id === connectionId);
                              return connectedNode ? (
                                <div
                                  key={idx}
                                  className="px-2 py-1 bg-info-soft border border-info/30 rounded text-xs font-medium text-info"
                                >
                                  {connectedNode.name}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillMindMap;