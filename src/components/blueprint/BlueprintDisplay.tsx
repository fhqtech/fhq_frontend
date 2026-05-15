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
    <div className="blueprint-display space-y-6 relative bg-paper p-6 rounded-lg border border-rule shadow-1">

      <BlueprintHeader />
      <MissionSection mission={data.mission} />
      <EvaluationPillarsSection pillars={data.evaluation_pillars} />
      <ResponsibilitiesSection responsibilities={data.key_responsibilities} questions={data.qualifying_questions} />
      <CandidateProfileSection profile={data.ideal_candidate_profile} />
    </div>
  );
};

const BlueprintHeader = () => (
  <div className="text-center py-4 bg-paper-2 rounded-lg border border-rule">
    <h1 className="text-2xl font-bold text-ink mb-2">
      Interview Blueprint
    </h1>
    <p className="text-sm text-muted">
      AI-Powered Evaluation Framework
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

const EvaluationPillarsSection = ({ pillars }: { pillars: string[] }) => (
  <div>
    <h2 className="text-base font-semibold mb-2 text-ink">
      Evaluation Pillars
    </h2>
    <div className="flex flex-wrap gap-2">
      {pillars.map((pillar, index) => (
        <Card key={index} className="border border-rule hover:shadow-1 transition-shadow">
          <CardContent className="p-2">
            <h3 className="text-sm font-medium text-ink whitespace-nowrap">
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
        <h2 className="text-lg font-semibold mb-3 text-ink">
          Key Responsibilities
        </h2>
        <Card className="bg-blue-100/40 backdrop-blur-xs border border-blue-300/90 shadow-1">
          <CardContent className="p-4">
            <div className="bg-paper/40 backdrop-blur-xs rounded-lg p-3 border border-white/60">
              <ul className="space-y-2">
                {parsedResponsibilities.slice(0, Math.ceil(parsedResponsibilities.length / 2)).map((responsibility: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-blue-200/95 backdrop-blur-xs text-blue-800 font-medium rounded-full flex items-center justify-center shrink-0 text-xs border border-blue-400/90">
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

      <div>
        <h2 className="text-lg font-semibold mb-3 text-ink">
          Qualifying Questions
        </h2>
        <div className="space-y-2">
          {questions.slice(0, 3).map((question: string, index: number) => (
            <Card key={index} className="bg-blue-100/40 backdrop-blur-xs border border-blue-300/90 shadow-1">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-blue-200/95 backdrop-blur-xs text-blue-800 font-medium rounded-full flex items-center justify-center shrink-0 text-xs border border-blue-400/90">
                    Q{index + 1}
                  </div>
                  <p className="text-sm text-ink-soft leading-relaxed">
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
  <Card className="bg-paper border border-rule shadow-1">
    <CardHeader className="pb-3">
      <span className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
        Ideal applicant
      </span>
      <CardTitle className="text-lg font-semibold text-ink mt-1">
        Profile
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="bg-paper-2 rounded-md p-4 border border-rule">
        <p className="text-base text-ink-soft leading-relaxed">
          "{profile}"
        </p>
      </div>
    </CardContent>
  </Card>
);

export default BlueprintDisplay;