import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Lightbulb, TrendingDown, MessageSquareQuote, ArrowLeft, Clock, RefreshCw } from "lucide-react";
import { RatingPanel } from "@/components/interview/RatingPanel";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { TalentAnalysisGraph, type TagGraphNode } from "@/components/tag/TalentAnalysisGraph";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

// --- INTERFACES matching Interview Reviewer Agent output ---
interface SkillScore {
  skill_id: string;
  skill_name: string;
  score: number;
  proficiency_level: string;
  evidence: string[];
  gaps: string[];
}

interface GraphNode {
  id: string;
  label: string;
  type: 'role' | 'skill' | 'transferable';
  score?: number;
  is_core?: boolean;
  required_proficiency?: string;
  demonstrated_proficiency?: string;
  proficiency_label?: string;
  evidence?: string[];
  transferable_from?: string;
}

interface CriticalGap {
  skill_id: string;
  skill_name: string;
  severity: string;
  impact: string;
  recommendation: string;
}

interface TransferableSkill {
  source: string;
  skill_demonstrated: string;
  relevance_to_role: string;
  score: number;
}

interface InterviewResultsData {
  session_id: string;
  interview_id: string;
  overall_score: number;
  recommendation: 'STRONG_HIRE' | 'ADVANCE_WITH_CONCERNS' | 'BORDERLINE' | 'REJECT';
  summary: string;
  skill_scores: SkillScore[];
  graph_data?: {
    nodes: GraphNode[];
    edges: any[];
    annotations: any[];
  };
  transferable_skills: TransferableSkill[];
  critical_gaps: CriticalGap[];
  strengths: string[];
  development_areas: string[];
  generated_at?: string;
  status?: string;
}

// --- LEGACY INTERFACE for backward compatibility ---
interface Competency {
  skill: string;
  score: number;
  strength: string;
  weakness: string;
  evaluation?: string;
}

interface EvaluationData {
  overall_summary: string;
  competencies: Competency[];
  hireability_recommendation: string;
  suggested_next_steps: string[];
}

// Transform Interview Reviewer Agent output to legacy format for existing UI
function transformToLegacyFormat(data: InterviewResultsData): EvaluationData {
  // Safely handle skill_scores array
  const skillScores = data.skill_scores || [];

  const competencies: Competency[] = skillScores.map(skill => {
    const evidence = skill.evidence || [];
    const gaps = skill.gaps || [];

    return {
      skill: skill.skill_name || 'Unknown Skill',
      score: skill.score || 0,
      strength: evidence.length > 0 ? evidence[0] : 'No evidence provided',
      weakness: gaps.length > 0 ? gaps[0] : 'No gaps identified',
      evaluation: evidence.join('. ') || 'No detailed evaluation available'
    };
  });

  // Map recommendation to human-readable format
  const recommendationMap: Record<string, string> = {
    'STRONG_HIRE': 'Strongly Recommend - Excellent fit for the role',
    'ADVANCE_WITH_CONCERNS': 'Recommend with Reservations - Strong skills but needs development in some areas',
    'BORDERLINE': 'Borderline - Requires deeper review before decision',
    'REJECT': 'Not Recommended - Significant gaps in required skills'
  };

  // Safely handle strengths and development_areas arrays
  const strengths = data.strengths || [];
  const developmentAreas = data.development_areas || [];

  return {
    overall_summary: data.summary || 'No summary available',
    competencies,
    hireability_recommendation: recommendationMap[data.recommendation] || data.recommendation || 'Pending Review',
    suggested_next_steps: [
      ...strengths.slice(0, 2).map(s => `Strength: ${s}`),
      ...developmentAreas.slice(0, 3).map(d => `Development: ${d}`)
    ]
  };
}

// --- Radar Chart Component ---
const SkillsRadarChart = ({ competencies }: { competencies: Competency[] }) => {
  const size = 500; // Further increased for label space
  const center = size / 2;
  const radius = 130; // Keep chart size reasonable while increasing SVG space
  
  const displaySkills = competencies.filter(comp => comp.skill);
  const numSides = Math.max(displaySkills.length, 3);
  
  const getPointOnCircle = (index: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / numSides - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, angle };
  };
  
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPaths = gridLevels.map(level => {
    const points = Array.from({ length: numSides }, (_, i) => {
      const point = getPointOnCircle(i, (radius * level) / 100);
      return `${point.x},${point.y}`;
    });
    return `M${points.join('L')}Z`;
  });
  
  const axisLines = Array.from({ length: numSides }, (_, i) => {
    const outerPoint = getPointOnCircle(i, radius);
    return {
      x1: center,
      y1: center,
      x2: outerPoint.x,
      y2: outerPoint.y
    };
  });
  
  const dataPoints = displaySkills.map((skill, index) => {
    const score = skill.score;
    const dataRadius = (radius * Math.max(score, 1)) / 100;
    return getPointOnCircle(index, dataRadius);
  });
  
  const dataPath = dataPoints.length > 0 
    ? `M${dataPoints.map(p => `${p.x},${p.y}`).join('L')}Z`
    : '';
  
  const labelPoints = displaySkills.map((skill, index) => {
    const point = getPointOnCircle(index, radius + 50); // Further increased for more space
    const name = skill.skill || '';
    const score = skill.score;
    return { ...point, name, score };
  });
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="mb-4">
        <defs>
          <radialGradient id="skillsGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        
        {/* Background grid */}
        {gridPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="rgb(148, 163, 184)"
            strokeWidth="1"
            strokeOpacity={0.3}
          />
        ))}
        
        {/* Axis lines */}
        {axisLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgb(148, 163, 184)"
            strokeWidth="1"
            strokeOpacity={0.4}
          />
        ))}
        
        {/* Score labels on axes */}
        {gridLevels.map((level) => (
          <text
            key={level}
            x={center}
            y={center - (radius * level) / 100 - 5}
            textAnchor="middle"
            fontSize="10"
            fill="rgb(100, 116, 139)"
          >
            {level}
          </text>
        ))}
        
        {/* Data area */}
        {dataPath && (
          <path
            d={dataPath}
            fill="url(#skillsGradient)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            fillOpacity="0.6"
          />
        )}
        
        {/* Data points */}
        {dataPoints.map((point, index) => {
          const skill = displaySkills[index];
          const score = skill.score;
          if (score === 0) return null;
          
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="rgb(59, 130, 246)"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Skill labels with multi-line support */}
        {labelPoints.map((point, index) => {
          const skill = displaySkills[index];
          if (!skill.skill) return null;
          
          const fullName = point.name || '';
          
          // Split long names into multiple lines
          const words = fullName.split(' ');
          let lines = [];
          
          if (words.length === 1) {
            // Single word - split if too long
            if (fullName.length > 12) {
              const mid = Math.ceil(fullName.length / 2);
              lines = [fullName.slice(0, mid), fullName.slice(mid)];
            } else {
              lines = [fullName];
            }
          } else if (words.length === 2) {
            // Two words - one per line
            lines = words;
          } else {
            // Multiple words - group smartly
            const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
            lines = [firstLine, secondLine];
          }
          
          // Calculate rectangle dimensions with better sizing
          const maxLineLength = Math.max(...lines.map(line => line.length));
          const charWidth = 7; // Increased for better readability
          const padding = 20; // More padding
          const rectWidth = Math.max(maxLineLength * charWidth + padding, 80);
          const lineHeight = 13; // Slightly more line height
          const rectHeight = lines.length * lineHeight + 12; // More top/bottom padding
          
          // Ensure rectangle stays within bounds
          const rectX = Math.max(10, Math.min(point.x - rectWidth / 2, size - rectWidth - 10));
          const rectY = Math.max(10, Math.min(point.y - rectHeight / 2 - 15, size - rectHeight - 30));
          
          return (
            <g key={index}>
              {/* Background rectangle with bounds checking */}
              <rect
                x={rectX}
                y={rectY}
                width={rectWidth}
                height={rectHeight}
                fill="rgba(255, 255, 255, 0.95)"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1.5"
                rx="8"
                className="drop-shadow-md"
              />
              
              {/* Multi-line text */}
              {lines.map((line, lineIndex) => (
                <text
                  key={lineIndex}
                  x={rectX + rectWidth / 2}
                  y={rectY + 18 + (lineIndex * lineHeight)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="rgb(15, 23, 42)"
                  className="select-none"
                >
                  {line}
                </text>
              ))}
              
              {/* Score badge */}
              <g>
                <rect
                  x={rectX + rectWidth / 2 - 18}
                  y={rectY + rectHeight + 2}
                  width="36"
                  height="18"
                  fill="rgb(59, 130, 246)"
                  stroke="white"
                  strokeWidth="2"
                  rx="9"
                  className="drop-shadow-md"
                />
                
                <text
                  x={rectX + rectWidth / 2}
                  y={rectY + rectHeight + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="white"
                  className="select-none"
                >
                  {point.score}
                </text>
              </g>
            </g>
          );
        })}
        
        <circle
          cx={center}
          cy={center}
          r="3"
          fill="rgb(59, 130, 246)"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      
      <div className="text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">Skills Assessment Overview</h3>
        <p className="text-xs text-muted-foreground">
          {displaySkills.length} competencies evaluated
        </p>
      </div>
    </div>
  );
};

export default function InterviewResults() {
  const { interviewId, sessionId } = useParams();
  const navigate = useNavigate();
  const { getIdToken } = useAuth();
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [rawResults, setRawResults] = useState<InterviewResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isResultsPending, setIsResultsPending] = useState(false);

  // Scroll to top immediately when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Fetch real data from API
  const fetchResults = useCallback(async () => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const token = await getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/results/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        // Results not yet available - agent might still be processing
        setIsResultsPending(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.results) {
        const resultsData = data.results as InterviewResultsData;
        setRawResults(resultsData);

        // Transform to legacy format for existing UI
        const legacyFormat = transformToLegacyFormat(resultsData);
        setEvaluation(legacyFormat);
        setIsResultsPending(false);
        setError(null);

        // Scroll to top when results load
        window.scrollTo(0, 0);
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }, 50);
      } else {
        throw new Error('Invalid results format');
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getIdToken]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-retry for pending results (poll every 10 seconds, max 6 times = 1 minute)
  useEffect(() => {
    if (isResultsPending && retryCount < 6) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsLoading(true);
        fetchResults();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isResultsPending, retryCount, fetchResults]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    fetchResults();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="mb-8 flex items-center justify-center">
            <Spinner size="lg" variant="brand" label="Processing" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4 animate-pulse">
            Analyzing Interview Results
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Processing competency assessments and generating comprehensive evaluation...
          </p>

          <div className="w-full max-w-md mb-6">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-blue-600 h-3 rounded-full transition-all duration-300 ease-out animate-pulse"
                style={{ width: '75%' }}
              ></div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground opacity-75">
            Generating detailed competency analysis...
          </p>
        </div>
      </div>
    );
  }

  // Show pending state - results being generated
  if (isResultsPending) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="mb-8 flex items-center justify-center">
            <Spinner size="lg" variant="brand" label="Processing" />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4">
            Generating Interview Results
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Our AI is analyzing the interview conversation and generating a detailed skill assessment...
          </p>

          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-300">
              Checking again in {10 - (retryCount % 10)} seconds... (Attempt {retryCount + 1}/6)
            </span>
          </div>

          <Button
            variant="outline"
            className="mt-6"
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Now
          </Button>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/interviews/manage`)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview Results</h1>
        </div>

        <Card>
          <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Results</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry loading results
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/interviews/manage`)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview Results</h1>
        </div>

        <Card>
          <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
              <p className="text-muted-foreground mb-4">Unable to load evaluation data</p>
              <Button onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry loading results
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { overall_summary, competencies, hireability_recommendation, suggested_next_steps } = evaluation;

  const getBadgeClass = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return "bg-red-100 text-red-800 border-red-300";
    if (lowerDecision.includes("reservations")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (lowerDecision.includes("recommend")) return "bg-green-100 text-green-800 border-green-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  const getIcon = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return <TrendingDown className="w-5 h-5 text-red-600" />;
    if (lowerDecision.includes("reservations")) return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    if (lowerDecision.includes("recommend")) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <main className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate(`/interviews/${interviewId}`)}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Interview
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Interview Results</h1>
                <p className="text-sm text-muted-foreground">Session: {sessionId}</p>
              </div>
            </div>
            
{rawResults?.generated_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  Generated {new Date(rawResults.generated_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </header>

        <Card className="p-4 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <MessageSquareQuote className="w-5 h-5 mr-2 text-primary" />
            Overall Summary
          </h2>
          <p className="text-foreground/80 leading-relaxed text-sm">{overall_summary}</p>
        </Card>

        <Card className="p-4 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-3">Hireability Recommendation</h2>
          <div className="flex items-start space-x-4">
            {getIcon(hireability_recommendation)}
            <div>
              <Badge variant="outline" className={`text-base font-semibold ${getBadgeClass(hireability_recommendation)}`}>
                {hireability_recommendation}
              </Badge>
            </div>
          </div>
        </Card>

        {/* T2: Talent Analysis Graph — interactive radial view of the
            reviewer's graph_data. Always rendered when graph_data exists
            (which is the post-S3 LangGraph default). */}
        {rawResults?.graph_data?.nodes && rawResults.graph_data.nodes.length > 0 && (
          <Card className="p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-foreground">
                Talent Analysis Graph
              </h2>
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Click any node for evidence
              </span>
            </div>
            <TalentAnalysisGraph
              roleTitle={(rawResults as any).role || "Role"}
              nodes={rawResults.graph_data.nodes as TagGraphNode[]}
            />
          </Card>
        )}

        {/* Skills Chart + Stats Layout */}
        <div className="grid gap-6 lg:grid-cols-4 items-start mb-6">
          {/* Left Side - Skills Radar Chart */}
          <div className="lg:col-span-3">
            <Card className="p-4 shadow-lg flex items-center justify-center">
              <SkillsRadarChart competencies={competencies} />
            </Card>
          </div>

          {/* Right Side - Stats and Next Steps */}
          <div className="space-y-4">
            {/* Performance Metrics */}
            <Card className="p-3 shadow-lg">
              <h3 className="text-base font-semibold text-foreground mb-3 flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2"></div>
                Performance
              </h3>
              <div className="space-y-4">
                {(() => {
                  const scores = competencies.map(c => c.score);
                  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                  const maxScore = Math.max(...scores);
                  const minScore = Math.min(...scores);
                  const strongSkills = scores.filter(s => s >= 70).length;
                  
                  return (
                    <>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-2xl font-bold text-primary mb-1">{avgScore.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Average</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                          <span className="text-xs text-muted-foreground">Highest</span>
                          <span className="text-sm font-bold text-green-600">{maxScore}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                          <span className="text-xs text-muted-foreground">Lowest</span>
                          <span className="text-sm font-bold text-orange-600">{minScore}</span>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-lg font-bold text-blue-600">{strongSkills}<span className="text-sm text-muted-foreground">/{scores.length}</span></div>
                        <div className="text-xs text-muted-foreground">Strong (70+)</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-3 shadow-lg">
              <h3 className="text-base font-semibold text-foreground mb-3 flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-2"></div>
                What next?
              </h3>
              <ul className="space-y-3">
                {suggested_next_steps.slice(0, 2).map((step, index) => (
                  <li key={index} className="flex items-start group">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">{index + 1}</span>
                    </div>
                    <span className="text-xs text-foreground/80 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Competencies Section */}
        <Card className="p-4 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-4 text-center flex items-center justify-center">
            <div className="w-2 h-6 bg-gradient-to-b from-primary to-blue-600 rounded-full mr-3"></div>
            Core Competencies Breakdown
            <div className="w-2 h-6 bg-gradient-to-b from-primary to-blue-600 rounded-full ml-3"></div>
          </h2>
          
          <div className="grid gap-4 lg:grid-cols-2">
            {competencies.map((comp, index) => {
              const scoreNum = comp.score;
              
              const getScoreColor = (score: number) => {
                if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/20 border-green-300';
                if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300';
                if (score >= 40) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 border-orange-300';
                return 'text-red-600 bg-red-100 dark:bg-red-900/20 border-red-300';
              };

              return (
                <div key={index} className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-foreground">{comp.skill}</h3>
                    <span className={`font-bold text-sm px-3 py-1 rounded-full border-2 ${getScoreColor(scoreNum)}`}>
                      {scoreNum}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary via-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 relative"
                      style={{ width: `${scoreNum}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Compact Details */}
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-1">
                      {comp.strength && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border-l-3 border-green-500">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">Strength: </span>
                          <span className="text-xs text-muted-foreground">{comp.strength}</span>
                        </div>
                      )}
                      {comp.weakness && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2 border-l-3 border-amber-500">
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Growth: </span>
                          <span className="text-xs text-muted-foreground">{comp.weakness}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recruiter Rating Section */}
        {sessionId && (
          <div className="mt-8">
            <RatingPanel sessionId={sessionId} />
          </div>
        )}

        <div className="mt-6 text-center">
          <Button onClick={() => navigate(`/interviews/manage`)}>
            Back to Interviews
          </Button>
        </div>
      </main>
    </div>
  );
}