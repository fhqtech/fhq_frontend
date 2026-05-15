import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Network } from 'lucide-react';

import { EnhancedBlueprintData } from '@/types/blueprintTypes';
import { extractSkillNodes } from '@/utils/blueprintTransform';
import SkillMindMap from './SkillMindMap';

interface EnhancedBlueprintDisplayProps {
  data: EnhancedBlueprintData;
}

const EnhancedBlueprintDisplay: React.FC<EnhancedBlueprintDisplayProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const skillNodes = extractSkillNodes(data);

  if (!data || !data.evaluation_pillars) {
    return (
      <div className="enhanced-blueprint-display space-y-6 relative bg-paper p-6 rounded-lg border border-rule shadow-1">
        <p className="text-muted">Loading blueprint data...</p>
      </div>
    );
  }

  return (
    <div className="enhanced-blueprint-display space-y-6 relative bg-paper p-6 rounded-sm border border-rule" style={{ boxShadow: 'var(--shadow-clay)' }}>

      {/* Mission Statement - HIDDEN */}
      {/* <MissionSection mission={data.role_summary.mission} /> */}

      {/* Main Content Sections */}
      <div className="space-y-8">
        {/* Tab Buttons */}
        <div className="flex justify-center">
          <div className="flex bg-paper-3 rounded-sm p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-sm text-xs font-bold   transition-colors ${
                activeTab === 'overview'
                  ? 'bg-paper text-ink shadow-1'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('skilltree')}
              className={`px-4 py-2 rounded-sm text-xs font-bold   transition-colors ${
                activeTab === 'skilltree'
                  ? 'bg-paper text-ink shadow-1'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Skills Tree
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewSection data={data} />}
        {activeTab === 'skilltree' && <SkillMindMap nodes={skillNodes} pillars={data.evaluation_pillars} />}
      </div>
    </div>
  );
};

const BlueprintHeader = () => (
  <div className="text-center py-4 bg-paper-2 rounded-lg border border-rule">
    <h1 className="text-2xl font-bold text-ink mb-2">
      Enhanced Interview Blueprint
    </h1>
    <p className="text-sm text-muted">
      Comprehensive AI-powered evaluation framework with skill relationships
    </p>
  </div>
);

const MissionSection = ({ mission }: { mission: string }) => (
  <Card className="border border-rule">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-semibold text-ink">
        Mission Statement
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="bg-paper-2 rounded-lg p-4 border border-rule">
        <p className="text-base text-ink-soft leading-relaxed">
          "{mission}"
        </p>
      </div>
    </CardContent>
  </Card>
);

const OverviewSection = ({ data }: { data: EnhancedBlueprintData }) => (
  <div className="space-y-6">
    {/* Ideal Candidate Profile - MOVED UP */}
    <CandidateProfileSection profile={data.ideal_candidate_profile} />

    {/* Quick Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-sm p-6 bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
        <div className="flex items-center gap-4">
          <p className="text-5xl font-bold text-foreground">
            {data.evaluation_pillars.length}
          </p>
          <div className="text-sm text-muted uppercase text-xs tracking-wider leading-tight">
            <div>Evaluation</div>
            <div>Pillars</div>
          </div>
        </div>
      </div>
      <div className="rounded-sm p-6 bg-paper" style={{ boxShadow: 'var(--shadow-clay)' }}>
        <div className="flex items-center gap-4">
          <p className="text-5xl font-bold text-foreground">
            {data.evaluation_pillars.reduce((acc, p) => {
              const criteriaCount = (p.evaluation_criteria?.length || 0);
              const skillsCount = ((p as any).skills?.length || 0);
              return acc + (criteriaCount || skillsCount);
            }, 0)}
          </p>
          <div className="text-sm text-muted uppercase text-xs tracking-wider leading-tight">
            <div>Skills to</div>
            <div>Assess</div>
          </div>
        </div>
      </div>
    </div>

    {/* Key Responsibilities & Questions */}
    <div className="grid grid-cols-1 gap-6">
      {/* Key Responsibilities - HIDDEN */}
      {/* <ResponsibilitiesSection responsibilities={data.role_summary.key_responsibilities} /> */}
      <QualifyingQuestionsSection questions={data.qualifying_questions} />
    </div>
  </div>
);



const ResponsibilitiesSection = ({ responsibilities }: { responsibilities: string[] }) => (
  <div>
    <h2 className="text-lg font-semibold mb-3 text-ink">
      Key Responsibilities
    </h2>
    <Card className="bg-info-soft/40 backdrop-blur-xs border border-info/40 shadow-1">
      <CardContent className="p-4">
        <div className="bg-paper/40 backdrop-blur-xs rounded-lg p-3 border border-white/60">
          <ul className="space-y-2">
            {responsibilities.slice(0, Math.ceil(responsibilities.length / 2)).map((responsibility: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-6 h-6 bg-info-soft backdrop-blur-xs text-info font-medium rounded-full flex items-center justify-center shrink-0 text-xs border border-info/40">
                  {index + 1}
                </div>
                <span className="text-sm text-ink-soft leading-relaxed">
                  {responsibility}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
);

const QualifyingQuestionsSection = ({ questions }: { questions: string[] | string }) => {
  const topicsArray = Array.isArray(questions) ? questions : [];

  if (topicsArray.length === 0) {
    return null;
  }

  return (
    <div className="bg-paper rounded-sm border border-rule p-6" style={{ boxShadow: 'var(--shadow-clay)' }}>
      <h2 className="text-lg font-bold mb-4 text-ink">
        Qualifying Topics
      </h2>
      <div className="flex flex-wrap gap-2">
        {topicsArray.map((topic: string, index: number) => (
          <div
            key={index}
            className="inline-flex items-center px-3 py-2 bg-paper border border-rule-strong rounded-sm text-xs font-medium text-ink"
          >
            {topic}
          </div>
        ))}
      </div>
    </div>
  );
};

const CandidateProfileSection = ({ profile }: { profile: string }) => {
  if (!profile) {
    return null;
  }

  return (
    <div className="bg-success-soft/40 backdrop-blur-xs border border-success/30/90 rounded-sm p-6" style={{ boxShadow: 'var(--shadow-clay)' }}>
      <h3 className="text-lg font-bold text-ink mb-4">
        Ideal Candidate Profile
      </h3>
      <p className="text-xs text-ink-soft leading-relaxed">
        {profile}
      </p>
    </div>
  );
};

export default EnhancedBlueprintDisplay;