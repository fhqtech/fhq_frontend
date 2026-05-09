import React from 'react';
import { ProficiencyLevel, PROFICIENCY_CONFIG } from '@/types/blueprintTypes';

interface ProficiencyBadgeProps {
  level: ProficiencyLevel;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const ProficiencyBadge: React.FC<ProficiencyBadgeProps> = ({
  level,
  size = 'md',
  showTooltip = true
}) => {
  const config = PROFICIENCY_CONFIG[level];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="relative inline-block">
      <span
        className={`
          inline-flex items-center rounded-full font-medium
          bg-${config.bgColor} text-${config.color} border border-${config.borderColor}
          ${sizeClasses[size]}
          ${showTooltip ? 'cursor-help' : ''}
        `}
        title={showTooltip ? config.description : undefined}
      >
        {config.label}
      </span>
    </div>
  );
};

export default ProficiencyBadge;