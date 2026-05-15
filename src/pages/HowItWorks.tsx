// How It Works Page - Blueprint Showcase
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X, Award, Wrench, RefreshCw, Globe, Lock } from 'lucide-react';

// Mock Blueprint Data for showcase (matching the actual API structure with all 10 skills)
const SHOWCASE_BLUEPRINT = {
  role: "Junior Python Developer",
  type: "screening",
  duration: 10,
  experience_range: "2-4 Years",
  description: "First-round screening to assess foundational competencies for a Junior Python Developer role, focusing on core Python skills, API development, database interaction, and basic Gen AI knowledge.",
  skills: [
    { skill_id: "skill-1", name: "Python Fundamentals", shortName: "Python", expected_proficiency: 3, description: "Understanding of core Python concepts, syntax, data structures, and standard library usage." },
    { skill_id: "skill-2", name: "REST API Development", shortName: "API Dev", expected_proficiency: 2, description: "Ability to build and interact with REST APIs using frameworks like Flask or FastAPI." },
    { skill_id: "skill-3", name: "SQL and Databases", shortName: "SQL", expected_proficiency: 2, description: "Knowledge of SQL for querying relational databases like PostgreSQL or MS SQL." },
    { skill_id: "skill-4", name: "Git Version Control", shortName: "Git", expected_proficiency: 3, description: "Proficiency in using Git for source code management, including branching, merging, and pull requests." },
    { skill_id: "skill-5", name: "Unit Testing", shortName: "Pytest", expected_proficiency: 2, description: "Understanding the importance of unit tests and the ability to write them using frameworks like pytest." },
    { skill_id: "skill-6", name: "Data Processing", shortName: "Pandas", expected_proficiency: 2, description: "Familiarity with using libraries like Pandas for data manipulation and analysis." },
    { skill_id: "skill-7", name: "Generative AI Concepts", shortName: "Gen AI", expected_proficiency: 2, description: "Hands-on experience with Gen AI solutions, including prompt engineering and RAG." },
    { skill_id: "skill-8", name: "Containerization", shortName: "Docker", expected_proficiency: 2, description: "Basic understanding of containers and how to use Docker to build and run applications." },
    { skill_id: "skill-9", name: "Cloud Concepts", shortName: "Cloud", expected_proficiency: 2, description: "Basic familiarity with cloud computing concepts and services on platforms like AWS or Azure." },
    { skill_id: "skill-10", name: "Communication Skills", shortName: "Comms", expected_proficiency: 3, description: "Ability to clearly articulate technical concepts and collaborate effectively." },
  ],
  skill_layout: {
    core_skills: ["skill-1", "skill-3", "skill-4", "skill-7", "skill-10"],
    derived_skills: [
      { skill_id: "skill-2", derives_from: "skill-1" },  // API Dev derives from Python
      { skill_id: "skill-5", derives_from: "skill-1" },  // Pytest derives from Python
      { skill_id: "skill-6", derives_from: "skill-3" },  // Pandas derives from SQL
      { skill_id: "skill-8", derives_from: "skill-1" },  // Docker derives from Python
      { skill_id: "skill-9", derives_from: "skill-4" },  // Cloud derives from Git
    ]
  },
  tools: [
    { name: "FastAPI / Flask", category: "API Framework" },
    { name: "Pandas", category: "Data Library" },
    { name: "Pytest", category: "Testing" },
    { name: "Docker", category: "Containerization" },
    { name: "LangChain", category: "Gen AI Framework" },
  ],
  certifications: [
    "Python Institute Certified Associate (PCAP)",
    "AWS Certified Cloud Practitioner",
    "Microsoft Certified: Azure Fundamentals"
  ],
};

// Proficiency level config (matching SkillsGraph; S2.7 finance-trust copy)
const proficiencyConfig: Record<number, { short: string; full: string; color: string }> = {
  1: { short: 'L1', full: 'Beginner', color: '#14b8a6' },
  2: { short: 'L2', full: 'Basic', color: '#3b82f6' },
  3: { short: 'L3', full: 'Intermediate', color: '#8b5cf6' },
  4: { short: 'L4', full: 'Advanced', color: '#ec4899' },
  5: { short: 'L5', full: 'Expert', color: '#ef4444' },
};

// Dark Proficiency Orbs component - shows 5 proficiency level orbs around selected skill (display only)
const DarkProficiencyOrbs = ({
  x,
  y,
  nodeRadius,
  expectedProficiency
}: {
  x: number;
  y: number;
  nodeRadius: number;
  expectedProficiency: number;
}) => {
  const orbitRadius = nodeRadius + 28;
  const numLevels = 5;

  return (
    <g>
      {[1, 2, 3, 4, 5].map((level, i) => {
        const startAngle = -Math.PI / 2;
        const angle = startAngle + (i * (2 * Math.PI) / numLevels);
        const orbX = x + Math.cos(angle) * orbitRadius;
        const orbY = y + Math.sin(angle) * orbitRadius;
        const isExpected = expectedProficiency === level;
        const config = proficiencyConfig[level];

        return (
          <g key={level} className="transition-transform duration-200">
            {/* Expected proficiency indicator - outer glow ring */}
            {isExpected && (
              <rect
                x={orbX - 21}
                y={orbY - 13}
                width={42}
                height={26}
                rx={4}
                fill="none"
                stroke={config.color}
                strokeWidth={2}
                className="animate-pulse"
              />
            )}
            {/* Square orb - highlighted if expected */}
            <rect
              x={orbX - 18}
              y={orbY - 10}
              width={36}
              height={20}
              rx={3}
              fill={isExpected ? config.color : 'rgba(0,0,0,0.6)'}
              stroke={isExpected ? config.color : 'rgba(255,255,255,0.2)'}
              strokeWidth={2}
              className="transition-all duration-100"
            />
            {/* Level label */}
            <text
              x={orbX}
              y={orbY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isExpected ? 'white' : 'rgba(255,255,255,0.4)'}
              fontSize="8"
              fontWeight="700"
              fontFamily="monospace"
              style={{ pointerEvents: 'none', letterSpacing: '0.3px' }}
            >
              {config.short}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// Dark-themed Skill Node for landing page
const DarkSkillNode = ({
  skill,
  x,
  y,
  isSelected,
  onSelect
}: {
  skill: typeof SHOWCASE_BLUEPRINT.skills[0];
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const words = skill.shortName.split(' ');
  const maxWordLength = Math.max(...words.map(w => w.length));
  const nodeRadius = Math.max(28, 20 + maxWordLength * 2.5 + (words.length > 1 ? 5 : 0));
  const fontSize = maxWordLength > 6 ? 7 : maxWordLength > 4 ? 8 : 9;
  const color = proficiencyConfig[skill.expected_proficiency]?.color || '#8b5cf6';

  return (
    <g onClick={onSelect} style={{ cursor: 'pointer' }}>
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={nodeRadius + 8}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 4"
          className="animate-spin"
          style={{ animationDuration: '3s', transformOrigin: `${x}px ${y}px` }}
        />
      )}
      {/* Main circle - fill with proficiency color */}
      <circle
        cx={x}
        cy={y}
        r={nodeRadius}
        fill={color}
        stroke={isSelected ? 'white' : color}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-all duration-200"
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="monospace"
        style={{ pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.3px' }}
      >
        {words.map((word, i, arr) => (
          <tspan key={i} x={x} dy={i === 0 ? `${-0.5 * (arr.length - 1)}em` : '1.15em'}>
            {word}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Fixed positions for 10 skills spread around the canvas (matching original SkillsGraph)
const SKILL_POSITIONS: { x: number; y: number }[] = [
  { x: 30, y: 15 },   // 0 - Python - upper left
  { x: 50, y: 5 },    // 1 - API Dev - top center
  { x: 88, y: 32 },   // 2 - SQL - upper right
  { x: 95, y: 50 },   // 3 - Git - far right
  { x: 95, y: 5 },    // 4 - Pytest - top right corner
  { x: 5, y: 5 },     // 5 - Pandas - top left corner
  { x: 78, y: 85 },   // 6 - Gen AI - bottom right
  { x: 2, y: 50 },    // 7 - Docker - far left
  { x: 35, y: 78 },   // 8 - Cloud - bottom center-left
  { x: 8, y: 78 },    // 9 - Comms - bottom left
];

// Dark-themed Skills Graph for landing page
const DarkSkillsGraph = ({
  skills,
  skillLayout,
  roleTitle,
  selectedSkill,
  onSelectSkill
}: {
  skills: typeof SHOWCASE_BLUEPRINT.skills;
  skillLayout: typeof SHOWCASE_BLUEPRINT.skill_layout;
  roleTitle: string;
  selectedSkill: typeof SHOWCASE_BLUEPRINT.skills[0] | null;
  onSelectSkill: (skill: typeof SHOWCASE_BLUEPRINT.skills[0] | null) => void;
}) => {
  const size = 520;
  const centerX = size / 2;
  const centerY = size / 2;
  const centerRadius = 45;

  // Build skill ID to index map
  const skillIdToIndex = new Map<string, number>();
  skills.forEach((skill, index) => {
    skillIdToIndex.set(skill.skill_id, index);
  });

  // Build derived skills map (skill_id -> parent_skill_id)
  const derivedMap = new Map<string, string>();
  skillLayout.derived_skills.forEach(derived => {
    derivedMap.set(derived.skill_id, derived.derives_from);
  });

  // Check if a skill is a core skill
  const coreSkillIds = new Set(skillLayout.core_skills);

  // Calculate positions
  const positions = skills.map((_, index) => ({
    x: (SKILL_POSITIONS[index]?.x ?? 50) / 100 * size,
    y: (SKILL_POSITIONS[index]?.y ?? 50) / 100 * size,
  }));

  // Build connections
  const connections: { from: { x: number; y: number }; to: { x: number; y: number }; key: string }[] = [];

  skills.forEach((skill, index) => {
    const isCore = coreSkillIds.has(skill.skill_id);
    const derivesFrom = derivedMap.get(skill.skill_id);

    if (isCore) {
      // Core skills connect to center
      connections.push({
        from: positions[index],
        to: { x: centerX, y: centerY },
        key: `center-${index}`
      });
    }

    if (derivesFrom) {
      // Derived skills connect to their parent
      const parentIndex = skillIdToIndex.get(derivesFrom);
      if (parentIndex !== undefined) {
        connections.push({
          from: positions[index],
          to: positions[parentIndex],
          key: `skill-${index}-${parentIndex}`
        });
      }
    }
  });

  return (
    <svg width="100%" height={size} viewBox={`-20 -20 ${size + 40} ${size + 40}`} className="overflow-visible">
      {/* Connection lines */}
      {connections.map(({ from, to, key }) => (
        <line
          key={key}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1.5}
        />
      ))}

      {/* Center hub - outer ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r={centerRadius + 5}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={2}
        strokeDasharray="6 4"
        className="animate-spin"
        style={{ animationDuration: '20s', transformOrigin: `${centerX}px ${centerY}px` }}
      />
      {/* Center hub - black fill */}
      <circle cx={centerX} cy={centerY} r={centerRadius} fill="#000000" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="8"
        fontWeight="700"
        fontFamily="monospace"
        style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
      >
        {roleTitle.split(' ').slice(0, 2).map((word, i, arr) => (
          <tspan key={i} x={centerX} dy={i === 0 ? `${-0.5 * (arr.length - 1)}em` : '1.2em'}>
            {word}
          </tspan>
        ))}
      </text>

      {/* Skill nodes */}
      {skills.map((skill, i) => (
        <DarkSkillNode
          key={skill.skill_id}
          skill={skill}
          x={positions[i].x}
          y={positions[i].y}
          isSelected={selectedSkill?.skill_id === skill.skill_id}
          onSelect={() => {
            if (selectedSkill?.skill_id === skill.skill_id) {
              onSelectSkill(null);
            } else {
              onSelectSkill(skill);
            }
          }}
        />
      ))}

      {/* Proficiency orbs around selected skill */}
      {selectedSkill && (() => {
        const selectedIndex = skills.findIndex(s => s.skill_id === selectedSkill.skill_id);
        if (selectedIndex === -1) return null;
        const pos = positions[selectedIndex];
        const words = selectedSkill.shortName.split(' ');
        const maxWordLength = Math.max(...words.map(w => w.length));
        const nodeRadius = Math.max(28, 20 + maxWordLength * 2.5 + (words.length > 1 ? 5 : 0));

        return (
          <DarkProficiencyOrbs
            x={pos.x}
            y={pos.y}
            nodeRadius={nodeRadius}
            expectedProficiency={selectedSkill.expected_proficiency}
          />
        );
      })()}
    </svg>
  );
};

// Carousel-style Edit Blueprint Showcase (2 slides with horizontal transition)
const BlueprintShowcase = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<typeof SHOWCASE_BLUEPRINT.skills[0] | null>(null);

  // Editable state (local only - no API calls)
  const [editTitle, setEditTitle] = useState(SHOWCASE_BLUEPRINT.role);
  const [editTopics, setEditTopics] = useState(SHOWCASE_BLUEPRINT.description);
  const [editDuration, setEditDuration] = useState(SHOWCASE_BLUEPRINT.duration);
  const [editType, setEditType] = useState<'screening' | 'fitment'>(SHOWCASE_BLUEPRINT.type as 'screening' | 'fitment');
  const [editScope, setEditScope] = useState<'global' | 'private'>('global');
  const [editSkills, setEditSkills] = useState(SHOWCASE_BLUEPRINT.skills);
  const [editTools, setEditTools] = useState(SHOWCASE_BLUEPRINT.tools);
  const [editCertifications, setEditCertifications] = useState(SHOWCASE_BLUEPRINT.certifications);

  // Add new item states
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState(3);
  const [newToolName, setNewToolName] = useState('');
  const [newToolCategory, setNewToolCategory] = useState('');
  const [newCertification, setNewCertification] = useState('');

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill = { skill_id: `skill-${Date.now()}`, name: newSkillName.trim(), shortName: newSkillName.trim().substring(0, 6).toUpperCase(), expected_proficiency: newSkillProficiency, description: `Custom skill: ${newSkillName}` };
    setEditSkills(prev => [...prev, newSkill]);
    setNewSkillName('');
    setNewSkillProficiency(3);
    console.log('[BlueprintShowcase] Skill added (demo mode):', newSkill);
  };

  const handleRemoveSkill = (skillId: string) => {
    setEditSkills(prev => prev.filter(s => s.skill_id !== skillId));
    console.log('[BlueprintShowcase] Skill removed (demo mode):', skillId);
  };

  const handleUpdateSkillProficiency = (skillId: string, newLevel: number) => {
    setEditSkills(prev => prev.map(s =>
      s.skill_id === skillId ? { ...s, expected_proficiency: newLevel } : s
    ));
    console.log('[BlueprintShowcase] Skill proficiency updated (demo mode):', skillId, 'to L' + newLevel);
  };

  const handleAddTool = () => {
    if (!newToolName.trim()) return;
    const newTool = { name: newToolName.trim(), category: newToolCategory.trim() || 'General' };
    setEditTools(prev => [...prev, newTool]);
    setNewToolName('');
    setNewToolCategory('');
    console.log('[BlueprintShowcase] Tool added (demo mode):', newTool);
  };

  const handleRemoveTool = (index: number) => {
    setEditTools(prev => prev.filter((_, i) => i !== index));
    console.log('[BlueprintShowcase] Tool removed (demo mode):', index);
  };

  const handleAddCertification = () => {
    if (!newCertification.trim()) return;
    setEditCertifications(prev => [...prev, newCertification.trim()]);
    setNewCertification('');
    console.log('[BlueprintShowcase] Certification added (demo mode):', newCertification);
  };

  const handleRemoveCertification = (index: number) => {
    setEditCertifications(prev => prev.filter((_, i) => i !== index));
    console.log('[BlueprintShowcase] Certification removed (demo mode):', index);
  };

  return (
    <div className="relative bg-ink py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header - Changes based on slide */}
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-light text-paper tracking-wide mb-3 transition-opacity duration-300">
            {currentSlide === 0 ? (
              <>How Flowy <span className="text-ink  bg-paper-2  ">Evaluates</span></>
            ) : (
              <>Flowy Can Be <span className="text-ink  bg-paper-2  ">Configured</span></>
            )}
          </h2>
          <p className="text-paper/50 text-lg uppercase tracking-wide">
            {currentSlide === 0
              ? "All you need is the description/topics to generate a blueprint"
              : "Define custom blueprints with skills, proficiency levels, tools, and certifications."}
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          <div className="absolute -inset-1 bg-paper-2 /20 /20 /20 rounded-2xl blur-xl opacity-50" />

          {/* Left Arrow - Only visible on slide 2 */}
          {currentSlide === 1 && (
            <button
              onClick={() => setCurrentSlide(0)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 p-3 rounded-full bg-paper/10 border border-white/20 backdrop-blur-xs transition-all hover:bg-paper/20"
            >
              <ChevronLeft className="w-6 h-6 text-paper" />
            </button>
          )}

          {/* Right Arrow - Only visible on slide 1 */}
          {currentSlide === 0 && (
            <button
              onClick={() => setCurrentSlide(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 p-3 rounded-full bg-paper/10 border border-white/20 backdrop-blur-xs transition-all hover:bg-paper/20"
            >
              <ChevronRight className="w-6 h-6 text-paper" />
            </button>
          )}

          <div className="relative bg-paper-2 from-white/8 /[0.02] border border-white/10 rounded-2xl overflow-hidden">
            {/* Slides Container */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {/* Slide 1: Overview View */}
                <div className="w-full shrink-0">
                  {/* Header with Blueprint Title */}
                  <div className="px-6 py-4 border-b border-white/10 bg-paper/2">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-mono font-bold text-lg text-paper uppercase tracking-wide">{editTitle}</h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded uppercase bg-purple-500/20 text-purple-300">
                          {editType}
                        </span>
                        <span className="bg-paper/10 text-paper/70 text-[10px] font-mono font-bold px-2 py-1 rounded uppercase">
                          skill tree
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-paper/10 text-paper/70 text-xs font-mono rounded-full">
                          {editDuration} min
                        </span>
                        <span className="px-3 py-1 bg-paper/10 text-paper/70 text-xs font-mono rounded-full">
                          {SHOWCASE_BLUEPRINT.experience_range}
                        </span>
                      </div>
                    </div>
                    <p className="text-paper/50 text-sm font-mono mt-2 max-w-3xl">{editTopics}</p>
                  </div>

                  <div className="flex flex-col lg:flex-row min-h-[420px]">
                    {/* Left Sidebar - Certs & Tools */}
                    <div className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-paper/2 p-4 flex flex-row lg:flex-col gap-4">
                      <div className="flex-1 lg:flex-none bg-paper/5 border border-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-4 h-4 text-amber-400" />
                          <p className="text-[10px] font-mono font-bold text-paper/40 uppercase tracking-wider">certs</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {editCertifications.map((cert, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <span className="text-[10px] font-mono text-paper/60 leading-tight">{cert}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 lg:flex-none bg-paper/5 border border-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Wrench className="w-4 h-4 text-blue-400" />
                          <p className="text-[10px] font-mono font-bold text-paper/40 uppercase tracking-wider">tools</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {editTools.map((tool, i) => (
                            <div key={i} className="flex flex-col">
                              <span className="text-[10px] font-mono font-bold text-paper/70">{tool.name}</span>
                              <span className="text-[9px] font-mono text-paper/40">{tool.category}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Center - Skills Graph */}
                    <div className="flex-1 p-6 flex items-center justify-center">
                      <DarkSkillsGraph
                        skills={editSkills}
                        skillLayout={SHOWCASE_BLUEPRINT.skill_layout}
                        roleTitle={editTitle}
                        selectedSkill={selectedSkill}
                        onSelectSkill={setSelectedSkill}
                      />
                    </div>

                    {/* Right Sidebar - Legend & Skill Info */}
                    <div className="w-full lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-paper/2 p-4 flex flex-col gap-3">
                      <div className="bg-paper/5 border border-white/10 rounded-lg p-3">
                        <p className="text-[10px] font-mono font-bold text-paper/40 uppercase tracking-wider mb-3">Proficiency Levels</p>
                        <div className="flex flex-col gap-1.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div key={level} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: proficiencyConfig[level].color }} />
                              <div className="px-2 py-0.5 rounded bg-paper/10 border border-white/10 flex items-center justify-center min-w-[40px]">
                                <span className="text-[9px] font-mono font-bold text-paper/70">{proficiencyConfig[level].short}</span>
                              </div>
                              <span className="text-[10px] font-mono text-paper/50">{proficiencyConfig[level].full}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectedSkill ? (
                        <div className="bg-paper/10 border border-white/20 rounded-lg p-4 flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-mono font-bold text-sm text-paper uppercase tracking-wide flex-1">{selectedSkill.name}</p>
                            <button onClick={() => setSelectedSkill(null)} className="bg-paper/10 hover:bg-paper/20 text-paper/60 p-1 rounded transition-colors ml-2">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-paper/50 text-xs font-mono leading-relaxed">{selectedSkill.description}</p>
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-2">
                              <span className="text-paper/40 text-[10px] font-mono">Required Level:</span>
                              <span className="px-2 py-0.5 text-paper rounded font-bold text-[10px] font-mono" style={{ backgroundColor: proficiencyConfig[selectedSkill.expected_proficiency]?.color }}>
                                {proficiencyConfig[selectedSkill.expected_proficiency]?.short}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-paper/5 border-2 border-dashed border-white/10 rounded-lg px-4 py-6 text-center flex-1 flex items-center justify-center">
                          <p className="text-xs text-paper/30 font-mono">Click a skill to see details</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slide 2: Edit View */}
                <div className="w-full shrink-0">
                  <div className="flex flex-col lg:flex-row min-h-[450px]">
                    {/* Left Column - Edit Form */}
                    <div className="w-full lg:w-2/5 p-6 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto flex flex-col">
                      <div className="space-y-4 flex-1 flex flex-col">
                        <div>
                          <label className="block text-xs font-bold text-paper/50 uppercase mb-2">Blueprint Title / Target Role</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-paper/5 border border-white/20 rounded-lg text-paper text-sm outline-hidden focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
                            placeholder="e.g. Senior Frontend Developer"
                          />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <label className="block text-xs font-bold text-paper/50 uppercase mb-2">Interview Topics / Description</label>
                          <textarea
                            value={editTopics}
                            onChange={e => setEditTopics(e.target.value)}
                            className="w-full flex-1 min-h-[120px] px-4 py-3 bg-paper/5 border border-white/20 rounded-lg text-paper text-sm outline-hidden focus:ring-2 focus:ring-gold focus:border-transparent resize-none transition-all"
                            placeholder="e.g. React, TypeScript, System Design..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-paper/50 uppercase mb-2">Duration</label>
                            <select
                              value={editDuration}
                              onChange={e => setEditDuration(Number(e.target.value))}
                              className="w-full px-4 py-2.5 bg-paper/5 border border-white/20 rounded-lg text-paper text-sm outline-hidden focus:ring-2 focus:ring-gold"
                            >
                              <option value={10} className="bg-ink">10 minutes</option>
                              <option value={20} className="bg-ink">20 minutes</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-paper/50 uppercase mb-2">Type</label>
                            <div className="flex bg-paper/5 rounded-lg p-1 border border-white/10">
                              <button
                                onClick={() => setEditType('screening')}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${editType === 'screening' ? 'bg-emerald-500/30 text-emerald-300' : 'text-paper/60 hover:text-paper'}`}
                              >
                                Screening
                              </button>
                              <button
                                onClick={() => setEditType('fitment')}
                                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${editType === 'fitment' ? 'bg-blue-500/30 text-blue-300' : 'text-paper/60 hover:text-paper'}`}
                              >
                                Fitment
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-paper/50 uppercase mb-2">Visibility</label>
                          <div className="flex bg-paper/5 rounded-lg p-1 border border-white/10">
                            <button
                              onClick={() => setEditScope('global')}
                              className={`flex-1 px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 ${editScope === 'global' ? 'bg-indigo-500/30 text-indigo-300' : 'text-paper/60 hover:text-paper'}`}
                            >
                              <Globe className="w-3 h-3" /> Global
                            </button>
                            <button
                              onClick={() => setEditScope('private')}
                              className={`flex-1 px-4 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 ${editScope === 'private' ? 'bg-amber-500/30 text-amber-300' : 'text-paper/60 hover:text-paper'}`}
                            >
                              <Lock className="w-3 h-3" /> Private
                            </button>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                          <div className="w-full py-3 px-4 bg-paper/5 border border-white/10 text-paper/60 font-medium rounded-lg flex items-center justify-center gap-2 text-sm">
                            <Lock className="w-4 h-4" />
                            Preview only — sign up to edit and regenerate
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Skills, Tools, Certs */}
                    <div className="w-full lg:w-3/5 p-4 bg-paper/2 overflow-y-auto flex flex-col">
                      <div className="flex-1 flex flex-col gap-3">
                        {/* Skills Section - Takes most space */}
                        <div className="bg-paper/5 border border-white/10 rounded-lg p-4 flex-1 flex flex-col min-h-0">
                          <h4 className="text-xs font-bold text-paper/50 uppercase mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            Skills ({editSkills.length})
                          </h4>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={newSkillName}
                              onChange={(e) => setNewSkillName(e.target.value)}
                              placeholder="Add skill..."
                              className="flex-1 px-3 py-1.5 bg-paper/5 border border-white/20 rounded-lg text-paper text-xs outline-hidden focus:ring-2 focus:ring-gold"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                            />
                            <select
                              value={newSkillProficiency}
                              onChange={(e) => setNewSkillProficiency(Number(e.target.value))}
                              className="px-3 py-1.5 bg-ink border border-white/20 rounded-lg text-paper text-xs outline-hidden focus:ring-2 focus:ring-gold"
                              style={{ minWidth: '60px' }}
                            >
                              {[1, 2, 3, 4, 5].map(l => (
                                <option key={l} value={l} className="bg-ink text-paper">L{l}</option>
                              ))}
                            </select>
                            <button
                              onClick={handleAddSkill}
                              disabled={!newSkillName.trim()}
                              aria-label="Add skill"
                              className="px-3 py-1.5 bg-gold text-ink rounded-lg text-xs disabled:opacity-50 hover:bg-gold/90 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-1.5">
                            {editSkills.map((skill) => (
                              <div key={skill.skill_id} className="flex items-center justify-between p-2 bg-paper/5 rounded-lg group">
                                <span className="text-xs text-paper truncate flex-1 mr-2">{skill.name}</span>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={skill.expected_proficiency}
                                    onChange={(e) => handleUpdateSkillProficiency(skill.skill_id, Number(e.target.value))}
                                    className="px-2 py-1 rounded text-[10px] font-bold outline-hidden cursor-pointer transition-colors"
                                    style={{
                                      backgroundColor: proficiencyConfig[skill.expected_proficiency]?.color + '30',
                                      color: proficiencyConfig[skill.expected_proficiency]?.color,
                                      border: `1px solid ${proficiencyConfig[skill.expected_proficiency]?.color}40`
                                    }}
                                  >
                                    {[1, 2, 3, 4, 5].map(l => (
                                      <option key={l} value={l} className="bg-ink text-paper">L{l}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleRemoveSkill(skill.skill_id)} className="p-0.5 text-paper/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tools & Certs Row */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Tools Section */}
                          <div className="bg-paper/5 border border-white/10 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-paper/50 uppercase mb-2 flex items-center gap-2">
                              <Wrench className="w-3 h-3 text-blue-400" />
                              Tools ({editTools.length})
                            </h4>
                            <div className="flex gap-2 mb-2">
                              <input type="text" value={newToolName} onChange={(e) => setNewToolName(e.target.value)} placeholder="Tool name..." className="flex-1 px-2 py-1 bg-paper/5 border border-white/20 rounded text-paper text-[10px] outline-hidden focus:ring-1 focus:ring-gold" onKeyDown={(e) => e.key === 'Enter' && handleAddTool()} />
                              <button
                                onClick={handleAddTool}
                                disabled={!newToolName.trim()}
                                aria-label="Add tool"
                                className="px-2 py-1 bg-info text-paper rounded text-[10px] disabled:opacity-50 hover:bg-info/90 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                              {editTools.map((tool, index) => (
                                <div key={index} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded group">
                                  <span className="text-[9px] text-blue-300">{tool.name}</span>
                                  <button onClick={() => handleRemoveTool(index)} className="text-blue-300/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="w-2 h-2" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Certifications Section */}
                          <div className="bg-paper/5 border border-white/10 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-paper/50 uppercase mb-2 flex items-center gap-2">
                              <Award className="w-3 h-3 text-amber-400" />
                              Certs ({editCertifications.length})
                            </h4>
                            <div className="flex gap-2 mb-2">
                              <input type="text" value={newCertification} onChange={(e) => setNewCertification(e.target.value)} placeholder="Add cert..." className="flex-1 px-2 py-1 bg-paper/5 border border-white/20 rounded text-paper text-[10px] outline-hidden focus:ring-1 focus:ring-amber-500" onKeyDown={(e) => e.key === 'Enter' && handleAddCertification()} />
                              <button
                                onClick={handleAddCertification}
                                disabled={!newCertification.trim()}
                                aria-label="Add certification"
                                className="px-2 py-1 bg-gold text-ink rounded text-[10px] disabled:opacity-50 hover:bg-gold/90 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
                              {editCertifications.map((cert, index) => (
                                <div key={index} className="flex items-center justify-between group">
                                  <div className="flex items-start gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-amber-400 mt-1 shrink-0" />
                                    <span className="text-[9px] text-paper/60 leading-tight">{cert}</span>
                                  </div>
                                  <button onClick={() => handleRemoveCertification(index)} className="p-0.5 text-paper/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="w-2 h-2" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dot Indicators */}
            <div className="flex items-center justify-center gap-3 py-4 border-t border-white/10 bg-paper/2">
              <button
                onClick={() => setCurrentSlide(0)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentSlide === 0 ? 'bg-purple-500 w-8' : 'bg-paper/20 hover:bg-paper/40'}`}
              />
              <button
                onClick={() => setCurrentSlide(1)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentSlide === 1 ? 'bg-purple-500 w-8' : 'bg-paper/20 hover:bg-paper/40'}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Navigation header - same as landing page
const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 w-full z-20 flex justify-between items-center p-6 md:p-8 bg-ink/80 backdrop-blur-xs">
      <div className="flex items-center">
        <button onClick={() => navigate('/')} className="flex flex-col hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold text-ink  bg-paper-2 from-white /40 tracking-tighter">
            FunnelHQ
          </span>
        </button>
      </div>
      <div className="hidden md:flex space-x-8 text-sm font-medium text-paper/70">
        <button onClick={() => navigate('/')} className="hover:text-paper transition-colors">Home</button>
        <a href="/#features" className="hover:text-paper transition-colors">Features</a>
        <a href="/#meet-flowy" className="hover:text-paper transition-colors">See Me In Action</a>
        <a href="/#pricing" className="hover:text-paper transition-colors">Pricing</a>
      </div>
      <button
        onClick={() => navigate('/product-landing')}
        className="px-4 py-2 text-sm font-medium text-paper/80 hover:text-paper border border-white/20 rounded-full hover:bg-paper/10 transition-all"
      >
        Sign In
      </button>
    </nav>
  );
};

const HowItWorks = () => {
  return (
    <div className="relative w-full min-h-dvh bg-ink selection:bg-blue-500 selection:text-paper">
      <Navigation />

      {/* Main Content with padding for fixed nav */}
      <div className="pt-24">
        <BlueprintShowcase />
      </div>
    </div>
  );
};

export default HowItWorks;
