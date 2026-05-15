import React, { useState, useMemo } from 'react';
import { BlueprintSkill, SkillLayout } from '@/services/templateApi';

export type SkillCategory = 'strong_match' | 'developing' | 'gap' | 'transferable' | 'not_assessed' | 'target_role';

export interface GraphBlueprintSkill extends BlueprintSkill {
    findings?: string[];
    category: SkillCategory;
}

interface ReviewerSkillsGraphProps {
    roleTitle: string;
    skills: GraphBlueprintSkill[];
    skillLayout?: SkillLayout;
    size?: number;
}

interface SkillPosition {
    x: number;
    y: number;
    connectsTo: number[];
    connectsToCenter: boolean;
}

// Category styles matching the Applicant Skill Analysis chart.
const categoryStyles: Record<SkillCategory, { label: string; color: string; bgColor: string; borderColor: string }> = {
    strong_match: {
        label: 'Strong Match',
        color: '#22c55e', // Green-500
        bgColor: '#dcfce7', // Green-100
        borderColor: '#16a34a' // Green-600
    },
    developing: {
        label: 'Developing',
        color: '#f59e0b', // Amber-500
        bgColor: '#fef3c7', // Amber-100
        borderColor: '#d97706' // Amber-600
    },
    gap: {
        label: 'Gap/Missing',
        color: '#ef4444', // Red-500
        bgColor: '#fee2e2', // Red-100
        borderColor: '#dc2626' // Red-600
    },
    transferable: {
        label: 'Transferable Skill',
        color: '#a855f7', // Purple-500
        bgColor: '#f3e8ff', // Purple-100
        borderColor: '#9333ea' // Purple-600
    },
    not_assessed: {
        label: 'Not Assessed',
        color: '#94a3b8', // Slate-400
        bgColor: '#f1f5f9', // Slate-100
        borderColor: '#cbd5e1' // Slate-300
    },
    target_role: {
        label: 'Target Role',
        color: '#1e293b', // Slate-800
        bgColor: '#1e293b',
        borderColor: '#0f172a'
    }
};

// Default positions for 10 skills - Organic/Scattered layout
const DEFAULT_POSITIONS: { x: number; y: number }[] = [
    { x: 28, y: 28 },   // 0 - upper left
    { x: 50, y: 5 },    // 1 - top center
    { x: 78, y: 22 },   // 2 - upper right
    { x: 95, y: 50 },   // 3 - far right
    { x: 95, y: 5 },    // 4 - top right corner
    { x: 5, y: 5 },     // 5 - top left corner
    { x: 78, y: 85 },   // 6 - bottom right
    { x: 2, y: 50 },    // 7 - far left
    { x: 35, y: 95 },   // 8 - bottom center-left
    { x: 8, y: 78 },    // 9 - bottom left
];

const generateLayoutFromData = (skills: BlueprintSkill[], skillLayout?: SkillLayout): SkillPosition[] => {
    const skillIdToIndex = new Map<string, number>();
    skills.forEach((skill, index) => {
        skillIdToIndex.set(skill.skill_id, index);
    });

    if (!skillLayout) {
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

interface SkillNodeProps {
    skill: GraphBlueprintSkill;
    x: number;
    y: number;
    index: number;
    isHovered: boolean;
    isSelected: boolean;
    onHover: (index: number | null) => void;
    onClick: (skill: GraphBlueprintSkill, index: number) => void;
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
    const words = skill.shortName.split(' ');
    const maxWordLength = Math.max(...words.map(w => w.length));
    const numWords = words.length;
    // Compact node sizing
    const nodeRadius = Math.max(18, 14 + maxWordLength * 1.8 + (numWords > 1 ? 3 : 0));
    const fontSize = maxWordLength > 6 ? 6 : maxWordLength > 4 ? 7 : 8;

    const style = categoryStyles[skill.category];

    return (
        <g
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(skill, index)}
            style={{ cursor: 'pointer' }}
            className="transition-transform duration-150"
        >
            {/* Glow effect for selected */}
            {isSelected && (
                <circle
                    cx={x}
                    cy={y}
                    r={nodeRadius + 6}
                    fill="none"
                    stroke={style.color}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    className="skill-glow-ring"
                />
            )}

            {/* Main node */}
            <circle
                cx={x}
                cy={y}
                r={nodeRadius}
                fill={isSelected ? '#1e293b' : isHovered ? '#334155' : style.bgColor}
                stroke={style.borderColor}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-150"
                transform={isSelected ? `scale(1.08)` : isHovered ? `scale(1.04)` : ''}
                style={{ transformOrigin: `${x}px ${y}px` }}
            />

            {/* Skill Name */}
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isSelected || isHovered ? 'white' : '#1e293b'}
                fontSize={fontSize}
                fontWeight="700"
                fontFamily="monospace"
                style={{ pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.2px' }}
            >
                {words.map((word, i, arr) => (
                    <tspan
                        key={i}
                        x={x}
                        dy={i === 0 ? `${-0.5 * (arr.length - 1)}em` : '1.1em'}
                    >
                        {word}
                    </tspan>
                ))}
            </text>
        </g>
    );
};

export const ReviewerSkillsGraph: React.FC<ReviewerSkillsGraphProps> = ({
    roleTitle,
    skills,
    skillLayout,
    size = 500
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<GraphBlueprintSkill | null>(null);
    const [selectedSkillIndex, setSelectedSkillIndex] = useState<number | null>(null);

    const centerX = size / 2;
    const centerY = size / 2;
    const centerRadius = 35; // Compact hub

    const layout = useMemo(() => generateLayoutFromData(skills, skillLayout), [skills, skillLayout]);

    const calculateNodeRadius = (skill: BlueprintSkill) => {
        const words = skill.shortName.split(' ');
        const maxWordLength = Math.max(...words.map(w => w.length));
        const numWords = words.length;
        return Math.max(18, 14 + maxWordLength * 1.8 + (numWords > 1 ? 3 : 0));
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

    const handleSkillClick = (skill: GraphBlueprintSkill, index: number) => {
        if (selectedSkill?.skill_id === skill.skill_id) {
            setSelectedSkill(null);
            setSelectedSkillIndex(null);
        } else {
            setSelectedSkill(skill);
            setSelectedSkillIndex(index);
        }
    };

    const connections: { from: { x: number; y: number }; to: { x: number; y: number }; key: string; color: string; dashArray?: string; width: number }[] = [];
    const addedConnections = new Set<string>();

    skillPositions.forEach((pos, index) => {
        const skillStyle = categoryStyles[pos.skill.category];
        const lineColor = skillStyle.borderColor;

        // Determine line style based on category
        let dashArray: string | undefined = undefined;
        let width = 2;

        if (pos.skill.category === 'gap') {
            dashArray = "5 5"; // Dashed for gaps
            width = 2;
        } else if (pos.skill.category === 'transferable') {
            dashArray = "3 3"; // Dotted for transferable
            width = 2;
        } else if (pos.skill.category === 'strong_match') {
            width = 3; // Thicker for strong matches
        } else if (pos.skill.category === 'not_assessed') {
            width = 1.5; // Thinner for not assessed
        }

        if (pos.connectsToCenter) {
            connections.push({
                from: { x: pos.x, y: pos.y },
                to: { x: centerX, y: centerY },
                key: `center-${index}`,
                color: lineColor,
                dashArray,
                width
            });
        }
        pos.connectsTo.forEach(targetIndex => {
            const connectionKey = [Math.min(index, targetIndex), Math.max(index, targetIndex)].join('-');
            if (!addedConnections.has(connectionKey) && skillPositions[targetIndex]) {
                addedConnections.add(connectionKey);
                connections.push({
                    from: { x: pos.x, y: pos.y },
                    to: { x: skillPositions[targetIndex].x, y: skillPositions[targetIndex].y },
                    key: `skill-${connectionKey}`,
                    color: lineColor,
                    dashArray,
                    width
                });
            }
        });
    });

    return (
        <div className="relative w-full flex flex-col gap-2">

            {/* 1. TOP LEGEND */}
            <div className="w-full bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {(Object.keys(categoryStyles) as SkillCategory[])
                    .filter(k => k !== 'target_role')
                    .map((cat) => (
                        <div key={cat} className="flex items-center gap-1.5">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: categoryStyles[cat].color }}
                            />
                            <span className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-tighter">
                                {categoryStyles[cat].label}
                            </span>
                        </div>
                    ))}
            </div>

            {/* 2. MAIN GRAPH */}
            <div className="flex-1 flex justify-center w-full">
                <svg
                    width="100%"
                    height="auto"
                    viewBox={`-40 -40 ${size + 80} ${size + 80}`}
                    className="overflow-visible max-w-[360px]"
                >
                    {/* Connection lines */}
                    {connections.map(({ from, to, key, color, dashArray, width }, index) => (

                        <line
                            key={key}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke={color}
                            strokeWidth={width}
                            strokeDasharray={dashArray}
                            className="transition-all duration-300 opacity-80"
                        />
                    ))}

                    {/* Center Hub */}
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={centerRadius}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth={4}
                    />
                    <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                        style={{ pointerEvents: 'none' }}
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
                </svg>
            </div>

            {/* Evidence Display - Modern minimal design */}
            <div className="w-full px-2 mt-3">
                {selectedSkill ? (
                    <div className="border-l-2 pl-3 py-2" style={{ borderColor: categoryStyles[selectedSkill.category].color }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm text-slate-800">{selectedSkill.name}</span>
                            <span
                                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{
                                    backgroundColor: categoryStyles[selectedSkill.category].bgColor,
                                    color: categoryStyles[selectedSkill.category].borderColor
                                }}
                            >
                                {categoryStyles[selectedSkill.category].label}
                            </span>
                        </div>

                        {/* Findings List */}
                        {selectedSkill.findings && selectedSkill.findings.length > 0 ? (
                            <div className="space-y-1.5 mt-2">
                                {selectedSkill.findings.map((finding, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div
                                            className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                                            style={{ backgroundColor: categoryStyles[selectedSkill.category].color }}
                                        />
                                        <p className="text-[11px] text-slate-700 leading-relaxed font-mono">
                                            {finding}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-400 italic mt-1">No specific findings recorded.</p>
                        )}
                    </div>
                ) : (
                    <div className="h-10 flex items-center justify-center border-t border-slate-100 pt-2">
                        <span className="text-[9px] text-slate-400 font-mono">Click any skill to view evidence</span>
                    </div>
                )}
            </div>

            <style>{`
        .skill-glow-ring { stroke-dashoffset: 0; animation: dashSpin 3s linear infinite; }
        @keyframes dashSpin { to { stroke-dashoffset: -24; } }
      `}</style>
        </div>
    );
};
