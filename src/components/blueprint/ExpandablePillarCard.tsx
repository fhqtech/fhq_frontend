import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Eye, Users } from 'lucide-react';
import { EvaluationPillar, EvaluationCriteria, PROFICIENCY_CONFIG } from '@/types/blueprintTypes';
import ProficiencyBadge from './ProficiencyBadge';

interface ExpandablePillarCardProps {
  pillar: EvaluationPillar;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const ExpandablePillarCard: React.FC<ExpandablePillarCardProps> = ({
  pillar,
  isExpanded = false,
  onToggle
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const expanded = onToggle ? isExpanded : localExpanded;

  return (
    <Card className="border border-gray-200 hover:shadow-lg transition-all duration-300">
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <CardTitle className="text-lg font-semibold text-gray-900">
                {pillar.pillar_name}
              </CardTitle>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {pillar.evaluation_criteria.length} skills
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-2 ml-7">
          {pillar.description}
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4 ml-7">
            {pillar.evaluation_criteria.map((criteria, index) => (
              <SkillCard key={index} criteria={criteria} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

interface SkillCardProps {
  criteria: EvaluationCriteria;
}

const SkillCard: React.FC<SkillCardProps> = ({ criteria }) => {
  const [showDetails, setShowDetails] = useState(false);
  const config = PROFICIENCY_CONFIG[criteria.required_proficiency];

  return (
    <div className={`bg-gray-50 rounded-lg p-4 border-2 border-${config.borderColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-gray-900">
              {criteria.skill_name}
            </h4>
            <ProficiencyBadge level={criteria.required_proficiency} size="sm" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {criteria.context}
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="ml-3 p-1 text-gray-400 hover:text-gray-600 rounded"
          title={showDetails ? 'Hide details' : 'Show details'}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Integration indicators */}
      {criteria.integrates_with.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Integrates with:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {criteria.integrates_with.map((integration, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                {integration}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Expandable focus areas */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
            Interview Focus Areas
          </h5>
          <ul className="space-y-2">
            {criteria.interview_focus_areas.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExpandablePillarCard;