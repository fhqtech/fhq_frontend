import { AnalyticsCandidate } from "@/types/analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin,
  Clock,
  Star,
  Calendar,
  Briefcase,
  Plus,
  List,
  Award
} from "lucide-react";

interface CandidateCardProps {
  candidate: AnalyticsCandidate;
  onViewDetails: (candidate: AnalyticsCandidate) => void;
  onToggleStar?: (candidateId: string) => void;
  onAddToList?: (candidateId: string, listType: 'existing' | 'new') => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (candidateId: string) => void;
}

const getPerformanceLevel = (score: number) => {
  if (score >= 90) return { 
    label: "Top Star", 
    colorClass: "bg-success/10 text-success border-success/30"
  };
  if (score >= 80) return { 
    label: "High Performer", 
    colorClass: "bg-primary/10 text-primary border-primary/30"
  };
  if (score >= 70) return { 
    label: "Good", 
    colorClass: "bg-accent/10 text-accent border-accent/30"
  };
  if (score >= 60) return { 
    label: "Average", 
    colorClass: "bg-warning/10 text-warning border-warning/30"
  };
  return { 
    label: "Below Average", 
    colorClass: "bg-muted/50 text-muted-foreground border-muted"
  };
};

const stageColors: Record<string, string> = {
  screening: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  prelims: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  fitment: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  final: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  selected: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20'
};

const stageLabels: Record<string, string> = {
  screening: 'Screening',
  prelims: 'Preliminary',
  fitment: 'Fitment',
  final: 'Final Review',
  selected: 'Selected',
  rejected: 'Rejected'
};

const psychIcons = {
  lion: '🦁',
  owl: '🦉',
  dolphin: '🐬',
  fox: '🦊',
  mountain: '⛰️',
  beach: '🏖️',
  forest: '🌲',
  city: '🏙️'
};

export function CandidateCard({ candidate, onViewDetails, onToggleStar, onAddToList, isMultiSelectMode, isSelected, onToggleSelect }: CandidateCardProps) {
  const topSkills = candidate.skills ? Object.entries(candidate.skills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3) : [];

  const initials = candidate.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const overallScore = candidate.scores?.overall || 0;
  const performanceLevel = getPerformanceLevel(overallScore);

  // Check if candidate has assessment data
  const hasAssessmentData = candidate.scores && (candidate.scores.overall || candidate.scores.screening || candidate.scores.prelims || candidate.scores.fitment);

  // Format location to show only city and country
  const formatLocation = (location: string | undefined) => {
    if (!location) return '';
    // Split by comma and get first and last parts (city and country)
    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[parts.length - 1]}`;
    }
    return location;
  };

  const handleCardClick = () => {
    if (isMultiSelectMode) {
      onToggleSelect?.(candidate.id);
    } else {
      onViewDetails(candidate);
    }
  };

  return (
    <Card
      className={`p-4 hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm relative ${
        isMultiSelectMode && isSelected ? 'border-primary border-2 bg-primary/5' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Checkbox Overlay for Multi-Select Mode */}
      {isMultiSelectMode && (
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.(candidate.id)}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Header - Clean & Spacious */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="h-12 w-12 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
          <AvatarImage 
            src={candidate.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candidate.name)}`} 
            alt={candidate.name} 
          />
          <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate mb-1">
                {candidate.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">{candidate.role || 'N/A'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar?.(candidate.id);
              }}
            >
              <Star className={`h-4 w-4 transition-all ${candidate.starred ? 'fill-warning text-warning scale-110' : 'text-muted-foreground/50'}`} />
            </Button>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {candidate.experience && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {typeof candidate.experience === 'string' && candidate.experience.includes('year')
                  ? candidate.experience.split(' ')[0] + ' years'
                  : candidate.experience + ' years'}
              </span>
            )}
            {candidate.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {formatLocation(candidate.location)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Performance Score - Hero Element */}
      <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{hasAssessmentData ? overallScore : 0}</span>
              <Badge className={`${hasAssessmentData ? performanceLevel.colorClass : 'bg-muted/50 text-muted-foreground border-muted'} font-medium border-0 text-xs px-2 py-0.5`}>
                {hasAssessmentData ? performanceLevel.label : 'Unevaluated'}
              </Badge>
            </div>
          </div>
          <div className="h-16 w-16 rounded-full border-4 flex items-center justify-center" style={{
            borderColor: hasAssessmentData ? (
              overallScore >= 90 ? 'hsl(var(--success))' :
              overallScore >= 80 ? 'hsl(var(--primary))' :
              overallScore >= 70 ? 'hsl(var(--accent))' :
              overallScore >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--muted))'
            ) : 'hsl(var(--muted))',
            background: hasAssessmentData ? `conic-gradient(${
              overallScore >= 90 ? 'hsl(var(--success))' :
              overallScore >= 80 ? 'hsl(var(--primary))' :
              overallScore >= 70 ? 'hsl(var(--accent))' :
              overallScore >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--muted))'
            } ${overallScore * 3.6}deg, hsl(var(--muted)) 0deg)` : 'conic-gradient(hsl(var(--muted)) 0deg, hsl(var(--muted)) 0deg)'
          }}>
            <div className="h-14 w-14 rounded-full bg-card flex items-center justify-center">
              <Award className="h-6 w-6" style={{
                color: hasAssessmentData ? (
                  overallScore >= 90 ? 'hsl(var(--success))' :
                  overallScore >= 80 ? 'hsl(var(--primary))' :
                  overallScore >= 70 ? 'hsl(var(--accent))' :
                  overallScore >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--muted))'
                ) : 'hsl(var(--muted))'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Breakdown - Minimal & Clean */}
      <div className="mb-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Assessment Breakdown</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <p className="text-xs text-muted-foreground mb-1">Screen</p>
            <p className="text-lg font-bold text-foreground">{hasAssessmentData && candidate.scores.screening ? candidate.scores.screening : 0}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <p className="text-xs text-muted-foreground mb-1">Prelims</p>
            <p className="text-lg font-bold text-foreground">{hasAssessmentData && candidate.scores.prelims ? candidate.scores.prelims : 0}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <p className="text-xs text-muted-foreground mb-1">Fitment</p>
            <p className="text-lg font-bold text-foreground">{hasAssessmentData && candidate.scores.fitment ? candidate.scores.fitment : 0}</p>
          </div>
        </div>
      </div>

      {/* Top Skills - Visual & Minimal */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Key Strengths</p>
        <div className="flex gap-2">
          {topSkills.length > 0 ? (
            topSkills.slice(0, 3).map(([skill, score]) => (
              <div key={skill} className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate mb-1">{skill}</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{score}%</div>
              </div>
            ))
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate mb-1">Key Strength 1</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: '0%' }} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">0%</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate mb-1">Key Strength 2</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: '0%' }} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">0%</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate mb-1">Key Strength 3</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: '0%' }} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">0%</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Eligible Roles - Clean Pills */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Matched Roles</p>
        <div className="flex flex-wrap gap-1.5">
          {candidate.eligibleForRoles && candidate.eligibleForRoles.length > 0 ? (
            <>
              {candidate.eligibleForRoles.slice(0, 3).map((role) => (
                <Badge key={role} variant="secondary" className="text-xs font-normal px-2.5 py-0.5 bg-muted/50 hover:bg-muted transition-colors">
                  {role}
                </Badge>
              ))}
              {candidate.eligibleForRoles.length > 3 && (
                <Badge variant="secondary" className="text-xs font-normal px-2.5 py-0.5 bg-primary/10 text-primary">
                  +{candidate.eligibleForRoles.length - 3}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="secondary" className="text-xs font-normal px-2.5 py-0.5 bg-muted/50 text-muted-foreground">
              None
            </Badge>
          )}
        </div>
      </div>

      {/* Divider */}
      {!isMultiSelectMode && <div className="h-px bg-border/50 my-4" />}

      {/* Actions - Spacious & Clear */}
      {!isMultiSelectMode && (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onAddToList?.(candidate.id, 'existing');
          }}
        >
          <List className="h-3.5 w-3.5 mr-1.5" />
          Add to List
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9 hover:bg-accent/5 hover:text-accent hover:border-accent/30 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onAddToList?.(candidate.id, 'new');
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New List
        </Button>
      </div>
      )}
    </Card>
  );
}
