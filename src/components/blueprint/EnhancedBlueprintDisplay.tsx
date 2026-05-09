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
      <div className="enhanced-blueprint-display space-y-6 relative bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <p className="text-gray-500">Loading blueprint data...</p>
      </div>
    );
  }

  return (
    <div className="enhanced-blueprint-display space-y-6 relative bg-white p-6 rounded-sm border border-gray-200" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>

      {/* Mission Statement - HIDDEN */}
      {/* <MissionSection mission={data.role_summary.mission} /> */}

      {/* Main Content Sections */}
      <div className="space-y-8">
        {/* Tab Buttons */}
        <div className="flex justify-center">
          <div className="flex bg-gray-100 rounded-sm p-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('skilltree')}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'skilltree'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
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
  <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">
      Enhanced Interview Blueprint
    </h1>
    <p className="text-sm text-gray-600">
      Comprehensive AI-powered evaluation framework with skill relationships
    </p>
  </div>
);

const MissionSection = ({ mission }: { mission: string }) => (
  <Card className="border border-gray-200">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-semibold text-gray-900">
        Mission Statement
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <p className="text-base text-gray-700 leading-relaxed">
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
      <div className="rounded-sm p-6 bg-white" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
        <div className="flex items-center gap-4">
          <p className="text-5xl font-bold text-foreground">
            {data.evaluation_pillars.length}
          </p>
          <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
            <div>Evaluation</div>
            <div>Pillars</div>
          </div>
        </div>
      </div>
      <div className="rounded-sm p-6 bg-white" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
        <div className="flex items-center gap-4">
          <p className="text-5xl font-bold text-foreground">
            {data.evaluation_pillars.reduce((acc, p) => {
              const criteriaCount = (p.evaluation_criteria?.length || 0);
              const skillsCount = ((p as any).skills?.length || 0);
              return acc + (criteriaCount || skillsCount);
            }, 0)}
          </p>
          <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
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
    <h2 className="text-lg font-semibold mb-3 text-gray-900">
      Key Responsibilities
    </h2>
    <Card className="bg-blue-100/40 backdrop-blur-sm border border-blue-300/90 shadow-sm">
      <CardContent className="p-4">
        <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/60">
          <ul className="space-y-2">
            {responsibilities.slice(0, Math.ceil(responsibilities.length / 2)).map((responsibility: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-200/95 backdrop-blur-sm text-blue-800 font-medium rounded-full flex items-center justify-center flex-shrink-0 text-xs border border-blue-400/90">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-700 leading-relaxed">
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
    <div className="bg-white rounded-sm border border-gray-200 p-6" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
      <h2 className="text-lg font-bold uppercase tracking-wider mb-4 text-gray-900">
        Qualifying Topics
      </h2>
      <div className="flex flex-wrap gap-2">
        {topicsArray.map((topic: string, index: number) => (
          <div
            key={index}
            className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-sm text-xs font-medium text-gray-900"
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
    <div className="bg-green-100/40 backdrop-blur-sm border border-green-300/90 rounded-sm p-6" style={{ boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5' }}>
      <h3 className="text-lg font-bold uppercase tracking-wider text-gray-900 mb-4">
        Ideal Candidate Profile
      </h3>
      <p className="text-xs text-gray-700 leading-relaxed">
        {profile}
      </p>
    </div>
  );
};

export default EnhancedBlueprintDisplay;