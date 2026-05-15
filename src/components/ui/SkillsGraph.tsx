import React, { useState, useMemo } from 'react';
import { BlueprintSkill, SkillLayout } from '../../services/templateLibraryApi';

interface SkillsGraphProps {
  roleTitle: string;
  skills: BlueprintSkill[];
  skillLayout?: SkillLayout;
  size?: number;
}

interface SkillPosition {
  x: number;
  y: number;
  connectsTo: number[];
  connectsToCenter: boolean;
}

// Default positions for 10 skills spread around the canvas
const DEFAULT_POSITIONS: { x: number; y: number }[] = [
  { x: 30, y: 15 },   // 0 - upper left
  { x: 50, y: 5 },    // 1 - top center - ds
  { x: 88, y: 32 },   // 2 - upper right
  { x: 95, y: 50 },   // 3 - far right
  { x: 95, y: 5 },    // 4 - top right corner
  { x: 5, y: 5 },     // 5 - top left corner
  { x: 78, y: 85 },   // 6 - bottom right
  { x: 2, y: 50 },    // 7 - far left - functions
  { x: 35, y: 78 },   // 8 - bottom center-left - communications
  { x: 8, y: 78 },    // 9 - bottom left
];

// Generate layout dynamically from skill_layout data
const generateLayoutFromData = (skills: BlueprintSkill[], skillLayout?: SkillLayout): SkillPosition[] => {
  const skillIdToIndex = new Map<string, number>();
  skills.forEach((skill, index) => {
    skillIdToIndex.set(skill.skill_id, index);
  });

  if (!skillLayout || !skillLayout.core_skills || !skillLayout.derived_skills) {
    return skills.map((_, index) => ({
      x: DEFAULT_POSITIONS[index]?.x ?? 50,
      y: DEFAULT_POSITIONS[index]?.y ?? 50,
      connectsTo: [],
      connectsToCenter: true
    }));
  }

  const coreSkillIds = new Set(skillLayout.core_skills);
  const derivedMap = new Map<string, string>();

  skillLayout.derived_skills.forEach(derived => {
    derivedMap.set(derived.skill_id, derived.derives_from);
  });

  return skills.map((skill, index) => {
    const isCore = coreSkillIds.has(skill.skill_id);
    const derivesFrom = derivedMap.get(skill.skill_id);

    const x = DEFAULT_POSITIONS[index]?.x ?? 50;
    const y = DEFAULT_POSITIONS[index]?.y ?? 50;

    const connectsTo: number[] = [];
    if (derivesFrom) {
      const parentIndex = skillIdToIndex.get(derivesFrom);
      if (parentIndex !== undefined) {
        connectsTo.push(parentIndex);
      }
    }

    return {
      x,
      y,
      connectsTo,
      connectsToCenter: isCore
    };
  });
};

// Proficiency level labels and colors. Sentence-case finance-trust copy.
// Slang ("NOOB / GOAT / no cap skilled") was off-brand for the Big-4
// finance audience — replaced 2026-05-14 per Designer review S2.7.
const proficiencyLabels: Record<number, { short: string; full: string; tag: string; color: string; bgColor: string }> = {
  1: { short: 'L1', full: 'Beginner', tag: 'familiar with basics', color: '#14b8a6', bgColor: '#ccfbf1' },
  2: { short: 'L2', full: 'Basic', tag: 'comfortable with fundamentals', color: '#3b82f6', bgColor: '#dbeafe' },
  3: { short: 'L3', full: 'Intermediate', tag: 'independent execution', color: '#8b5cf6', bgColor: '#ede9fe' },
  4: { short: 'L4', full: 'Advanced', tag: 'leads workstreams', color: '#ec4899', bgColor: '#fce7f3' },
  5: { short: 'L5', full: 'Expert', tag: 'sets the bar', color: '#ef4444', bgColor: '#fee2e2' },
};

// Get proficiency color for a skill based on expected_proficiency
// Handles edge cases: undefined, null, 0, or out-of-range values
const getProficiencyColor = (level: number | undefined | null): string => {
  // If level is undefined, null, 0, or not a valid number, default to level 3 (MID)
  if (level === undefined || level === null || level === 0 || isNaN(level)) {
    return proficiencyLabels[3].color; // Default to MID (purple) for unknown
  }
  // Clamp to valid range 1-5
  const clampedLevel = Math.max(1, Math.min(5, Math.round(level)));
  return proficiencyLabels[clampedLevel].color;
};

// Get light background color for a skill based on expected_proficiency
const getProficiencyBgColor = (level: number | undefined | null): string => {
  if (level === undefined || level === null || level === 0 || isNaN(level)) {
    return proficiencyLabels[3].bgColor; // Default to MID for unknown
  }
  const clampedLevel = Math.max(1, Math.min(5, Math.round(level)));
  return proficiencyLabels[clampedLevel].bgColor;
};

interface SkillNodeProps {
  skill: BlueprintSkill;
  x: number;
  y: number;
  index: number;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (index: number | null) => void;
  onClick: (skill: BlueprintSkill, index: number) => void;
}

const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  x,
  y,
  index,
  isHovered,
  isSelected,
  onHover,
  onClick
}) => {
  const label = skill.shortName || skill.name || '';
  const words = label.split(' ');
  const maxWordLength = Math.max(...words.map(w => w.length), 0);
  const numWords = words.length;
  const nodeRadius = Math.max(28, 20 + maxWordLength * 2.5 + (numWords > 1 ? 5 : 0));
  const fontSize = maxWordLength > 6 ? 7 : maxWordLength > 4 ? 8 : 9;

  // Get proficiency color based on expected_proficiency
  const proficiencyColor = getProficiencyColor(skill.expected_proficiency);
  const proficiencyBgColor = getProficiencyBgColor(skill.expected_proficiency);

  return (
    <g
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(skill, index)}
      style={{ cursor: 'pointer' }}
      className="transition-transform duration-150"
    >
      {/* Glow effect for selected - spinning dashed circle using stroke-dashoffset animation */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={nodeRadius + 8}
          fill="none"
          stroke={proficiencyColor}
          strokeWidth={2}
          strokeDasharray="4 4"
          className="skill-glow-ring"
        />
      )}

      {/* Main node - stroke color based on proficiency level, fill with light tint */}
      <circle
        cx={x}
        cy={y}
        r={nodeRadius}
        fill={isSelected ? '#1e293b' : isHovered ? '#334155' : proficiencyBgColor}
        stroke={proficiencyColor}
        strokeWidth={isSelected ? 4 : 3}
        className="transition-all duration-150"
        transform={isSelected ? `scale(1.08)` : isHovered ? `scale(1.04)` : ''}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />

      {/* Skill abbreviation */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isSelected || isHovered ? 'white' : '#334155'}
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="monospace"
        style={{ pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.3px' }}
      >
        {words.map((word, i, arr) => (
          <tspan
            key={i}
            x={x}
            dy={i === 0 ? `${-0.5 * (arr.length - 1)}em` : '1.15em'}
          >
            {word}
          </tspan>
        ))}
      </text>
    </g>
  );
};

interface ProficiencyOrbsProps {
  skill: BlueprintSkill;
  x: number;
  y: number;
  nodeRadius: number;
  selectedLevel: number | null;
  onSelectLevel: (level: number | null) => void;
}

const ProficiencyOrbs: React.FC<ProficiencyOrbsProps> = ({ skill, x, y, nodeRadius, selectedLevel, onSelectLevel }) => {
  const proficiencyLevels = skill.proficiency_levels || [];
  const numLevels = proficiencyLevels.length;
  if (numLevels === 0) return null;
  const orbitRadius = nodeRadius + 25;

  const handleOrbClick = (level: number) => {
    if (selectedLevel === level) {
      onSelectLevel(null);
    } else {
      onSelectLevel(level);
    }
  };

  return (
    <g>
      {/* Orbit path */}
      <circle
        cx={x}
        cy={y}
        r={orbitRadius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={1}
        strokeDasharray="4 4"
        className="opacity-50"
      />
      {proficiencyLevels.map((level, i) => {
        const startAngle = -Math.PI / 2;
        const angle = startAngle + (i * (2 * Math.PI) / numLevels);
        const orbX = x + Math.cos(angle) * orbitRadius;
        const orbY = y + Math.sin(angle) * orbitRadius;
        const isSelected = selectedLevel === level.level;

        return (
          <g
            key={level.level}
            onClick={() => handleOrbClick(level.level)}
            style={{ cursor: 'pointer' }}
            className="transition-transform duration-200"
          >
            {/* Square orb */}
            <rect
              x={orbX - 18}
              y={orbY - 10}
              width={36}
              height={20}
              rx={3}
              fill={isSelected ? '#334155' : '#f1f5f9'}
              stroke={isSelected ? '#1e293b' : '#cbd5e1'}
              strokeWidth={2}
              className="transition-all duration-100"
              transform={isSelected ? 'scale(1.1)' : ''}
              style={{ transformOrigin: `${orbX}px ${orbY}px` }}
            />
            {/* Level label */}
            <text
              x={orbX}
              y={orbY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isSelected ? 'white' : '#334155'}
              fontSize="8"
              fontWeight="700"
              fontFamily="monospace"
              style={{ pointerEvents: 'none', letterSpacing: '0.3px' }}
            >
              {proficiencyLabels[level.level]?.short}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export const SkillsGraph: React.FC<SkillsGraphProps> = ({
  roleTitle,
  skills,
  skillLayout,
  size = 500
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<BlueprintSkill | null>(null);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState<number | null>(null);
  const [selectedProficiencyLevel, setSelectedProficiencyLevel] = useState<number | null>(null);

  const centerX = size / 2;
  const centerY = size / 2;
  const centerRadius = 45;

  const layout = useMemo(() => generateLayoutFromData(skills, skillLayout), [skills, skillLayout]);

  const calculateNodeRadius = (skill: BlueprintSkill) => {
    const label = skill.shortName || skill.name || '';
    const words = label.split(' ');
    const maxWordLength = Math.max(...words.map(w => w.length), 0);
    const numWords = words.length;
    return Math.max(28, 20 + maxWordLength * 2.5 + (numWords > 1 ? 5 : 0));
  };

  const skillPositions = skills.map((skill, index) => {
    const pos = layout[index] || { x: 50, y: 50, connectsTo: [], connectsToCenter: true };
    return {
      skill,
      x: (pos.x / 100) * size,
      y: (pos.y / 100) * size,
      nodeRadius: calculateNodeRadius(skill),
      connectsTo: pos.connectsTo,
      connectsToCenter: pos.connectsToCenter
    };
  });

  const handleSkillClick = (skill: BlueprintSkill, index: number) => {
    if (selectedSkill?.skill_id === skill.skill_id) {
      setSelectedSkill(null);
      setSelectedSkillIndex(null);
      setSelectedProficiencyLevel(null);
    } else {
      setSelectedSkill(skill);
      setSelectedSkillIndex(index);
      setSelectedProficiencyLevel(null);
    }
  };

  const connections: { from: { x: number; y: number }; to: { x: number; y: number }; key: string }[] = [];
  const addedConnections = new Set<string>();

  skillPositions.forEach((pos, index) => {
    if (pos.connectsToCenter) {
      connections.push({
        from: { x: pos.x, y: pos.y },
        to: { x: centerX, y: centerY },
        key: `center-${index}`
      });
    }
    pos.connectsTo.forEach(targetIndex => {
      const connectionKey = [Math.min(index, targetIndex), Math.max(index, targetIndex)].join('-');
      if (!addedConnections.has(connectionKey) && skillPositions[targetIndex]) {
        addedConnections.add(connectionKey);
        connections.push({
          from: { x: pos.x, y: pos.y },
          to: { x: skillPositions[targetIndex].x, y: skillPositions[targetIndex].y },
          key: `skill-${connectionKey}`
        });
      }
    });
  });

  return (
    <div className="relative w-full flex gap-4">
      {/* Main SVG container */}
      <div className="flex-1">
        <svg
          width="100%"
          height={size + 60}
          viewBox={`-40 -40 ${size + 80} ${size + 80}`}
          className="overflow-visible"
        >
          {/* Connection lines */}
          {connections.map(({ from, to, key }, index) => (
            <line
              key={key}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              className="transition-opacity duration-300"
              style={{
                opacity: 1,
                animation: `fadeIn 0.4s ease-out ${index * 0.02}s both`
              }}
            />
          ))}

          {/* Center hub - outer dashed ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={centerRadius + 5}
            fill="none"
            stroke="#334155"
            strokeWidth={2}
            strokeDasharray="6 4"
            className="animate-spin"
            style={{ animationDuration: '20s', transformOrigin: `${centerX}px ${centerY}px` }}
          />
          {/* Center hub - main circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={centerRadius}
            fill="#1e293b"
          />

          {/* Center role title */}
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
            style={{ pointerEvents: 'none', letterSpacing: '0.3px' }}
          >
            {roleTitle.split(' ').slice(0, 2).map((word, i, arr) => (
              <tspan
                key={i}
                x={centerX}
                dy={i === 0 ? `${-0.5 * (arr.length - 1)}em` : '1.2em'}
              >
                {word.toUpperCase()}
              </tspan>
            ))}
          </text>

          {/* Skill nodes */}
          {skillPositions.map(({ skill, x, y }, index) => (
            <SkillNode
              key={skill.skill_id}
              skill={skill}
              x={x}
              y={y}
              index={index}
              isHovered={hoveredIndex === index}
              isSelected={selectedSkillIndex === index}
              onHover={setHoveredIndex}
              onClick={handleSkillClick}
            />
          ))}

          {/* Proficiency orbs */}
          {selectedSkill && selectedSkillIndex !== null && (
            <ProficiencyOrbs
              skill={selectedSkill}
              x={skillPositions[selectedSkillIndex].x}
              y={skillPositions[selectedSkillIndex].y}
              nodeRadius={skillPositions[selectedSkillIndex].nodeRadius}
              selectedLevel={selectedProficiencyLevel}
              onSelectLevel={setSelectedProficiencyLevel}
            />
          )}
        </svg>
      </div>

      {/* Right sidebar - Legend and Skill Info */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3">
        {/* Legend */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Proficiency Levels</p>
          <div className="flex flex-col gap-1.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} className="flex items-center gap-2">
                {/* Color indicator circle */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                  style={{
                    backgroundColor: proficiencyLabels[level].color,
                    borderColor: proficiencyLabels[level].color
                  }}
                />
                <div className="px-2 py-0.5 rounded bg-slate-200 border border-slate-300 flex items-center justify-center min-w-[40px]">
                  <span className="text-[9px] font-mono font-bold text-slate-600">{proficiencyLabels[level].short}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{proficiencyLabels[level].full}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Skill info panel */}
        {selectedSkill && !selectedProficiencyLevel && (
          <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700">
            <div className="flex items-start justify-between mb-2">
              <p className="font-mono font-bold text-sm uppercase tracking-wide flex-1">{selectedSkill.name}</p>
              <button
                onClick={() => {
                  setSelectedSkill(null);
                  setSelectedSkillIndex(null);
                  setSelectedProficiencyLevel(null);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1 rounded transition-colors ml-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-400 text-xs font-mono leading-relaxed">{selectedSkill.description}</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono">
              <span className="text-slate-500">Required:</span>
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold">
                {proficiencyLabels[selectedSkill.expected_proficiency]?.short}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] font-mono mt-2 border-t border-slate-700 pt-2">Click the orbs to see each level</p>
          </div>
        )}

        {/* Proficiency level info */}
        {selectedProficiencyLevel !== null && selectedSkill && (
          <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                {proficiencyLabels[selectedProficiencyLevel]?.short}
              </span>
              <span className="text-slate-400 text-[10px] font-mono">
                {proficiencyLabels[selectedProficiencyLevel]?.tag}
              </span>
            </div>
            <p className="font-mono font-bold text-sm">
              {selectedSkill.proficiency_levels.find(l => l.level === selectedProficiencyLevel)?.name}
            </p>
            <p className="text-slate-400 text-xs mt-1 font-mono leading-relaxed">
              {selectedSkill.proficiency_levels.find(l => l.level === selectedProficiencyLevel)?.description}
            </p>
          </div>
        )}

        {/* Placeholder when nothing selected */}
        {!selectedSkill && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg px-4 py-6 text-center">
            <p className="text-xs text-slate-400 font-mono">Click a skill to see details</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .skill-glow-ring {
          stroke-dashoffset: 0;
          animation: dashSpin 3s linear infinite;
        }
        @keyframes dashSpin {
          to { stroke-dashoffset: -24; }
        }
      `}</style>
    </div>
  );
};

export default SkillsGraph;
