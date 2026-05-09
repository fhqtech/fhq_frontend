import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlueprintData } from '@/data/mockBlueprintData';
import { BarChart3, Shield, TrendingUp, Target, Users, CheckCircle, MessageCircle, Award } from 'lucide-react';

interface BlueprintDisplayProps {
  data: BlueprintData;
}

const BlueprintDisplay = ({ data }: BlueprintDisplayProps) => {
  console.log('🎯 BlueprintDisplay rendering with data:', data);
  return (
    <div className="blueprint-display space-y-6 relative bg-white p-6 rounded-lg border border-gray-200 shadow-sm">

      <BlueprintHeader />
      <MissionSection mission={data.mission} />
      <EvaluationPillarsSection pillars={data.evaluation_pillars} />
      <ResponsibilitiesSection responsibilities={data.key_responsibilities} questions={data.qualifying_questions} />
      <CandidateProfileSection profile={data.ideal_candidate_profile} />
    </div>
  );
};

const BlueprintHeader = () => (
  <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
    <h1 className="text-2xl font-bold text-gray-900 mb-2">
      Interview Blueprint
    </h1>
    <p className="text-sm text-gray-600">
      AI-Powered Evaluation Framework
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

const EvaluationPillarsSection = ({ pillars }: { pillars: string[] }) => (
  <div>
    <h2 className="text-base font-semibold mb-2 text-gray-900">
      Evaluation Pillars
    </h2>
    <div className="flex flex-wrap gap-2">
      {pillars.map((pillar, index) => (
        <Card key={index} className="border border-gray-200 hover:shadow-sm transition-shadow">
          <CardContent className="p-2">
            <h3 className="text-sm font-medium text-gray-800 whitespace-nowrap">
              {pillar}
            </h3>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const ResponsibilitiesSection = ({ responsibilities, questions }: { responsibilities: string; questions: string[] }) => {
  const parsedResponsibilities = JSON.parse(responsibilities);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-3 text-gray-900">
          Key Responsibilities
        </h2>
        <Card className="bg-blue-100/40 backdrop-blur-sm border border-blue-300/90 shadow-sm">
          <CardContent className="p-4">
            <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/60">
              <ul className="space-y-2">
                {parsedResponsibilities.slice(0, Math.ceil(parsedResponsibilities.length / 2)).map((responsibility: string, index: number) => (
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

      <div>
        <h2 className="text-lg font-semibold mb-3 text-gray-900">
          Qualifying Questions
        </h2>
        <div className="space-y-2">
          {questions.slice(0, 3).map((question: string, index: number) => (
            <Card key={index} className="bg-blue-100/40 backdrop-blur-sm border border-blue-300/90 shadow-sm">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-blue-200/95 backdrop-blur-sm text-blue-800 font-medium rounded-full flex items-center justify-center flex-shrink-0 text-xs border border-blue-400/90">
                    Q{index + 1}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {question}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const QualifyingQuestionsSection = ({ questions }: { questions: string[] }) => null;

const CandidateProfileSection = ({ profile }: { profile: string }) => (
  <Card className="bg-green-100/40 backdrop-blur-sm border border-green-300/90 shadow-sm border-l-4 border-l-green-500">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg font-semibold text-gray-900">
        Ideal Candidate Profile
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-white/60">
        <p className="text-base text-gray-700 leading-relaxed">
          "{profile}"
        </p>
      </div>
    </CardContent>
  </Card>
);

export default BlueprintDisplay;