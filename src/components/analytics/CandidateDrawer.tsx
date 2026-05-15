import { useState, useEffect } from "react";
import { AnalyticsCandidate } from "@/types/analytics";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Download,
  Share2,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  ThumbsUp,
  Brain,
  Code,
  Award,
  GraduationCap,
  Briefcase,
  FileText,
  ExternalLink,
  Linkedin,
  Globe,
  Clock
} from "lucide-react";

interface CandidateDrawerProps {
  candidate: AnalyticsCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stageLabels: Record<string, string> = {
  screening: 'Screening',
  prelims: 'Preliminary',
  fitment: 'Fitment',
  final: 'Final Review',
  selected: 'Selected',
  rejected: 'Rejected'
};

interface OverviewData {
  candidate: {
    email: string;
    name: string;
    phone: string;
    role: string;
    experience: number;
    location: string;
    profilePicture: string;
    stage: string;
    starred: boolean;
  };
  scores: {
    screening: number;
    preliminary: number;
    fitment: number;
    overall: number;
  };
  eligibleForRoles: string[];
  lists: any[];
}

interface AIInsightsData {
  personalityTraits: string[];
  keyStrengths: string[];
  areasForDevelopment: string[];
  culturalFit: {
    score: number;
    assessment: string;
  };
  interviewAnalysis: {
    communicationStyle: string;
    problemSolving: string;
    leadershipPotential: string;
    notableQuotes: string[];
  };
  hasData: boolean;
}

interface PsychData {
  hasAssessment: boolean;
  assessment: {
    animalChoice: string | null;
    colorChoice: string | null;
    environmentChoice: string | null;
    symbolChoice: string | null;
    interpretation: any;
    completedAt: string | null;
  };
}

interface InterviewData {
  totalInterviews: number;
  interviews: Array<{
    sessionId: string;
    interviewName: string;
    type: string;
    status: string;
    startTime: string;
    endTime: string;
    duration: number;
    scores: any;
  }>;
}

interface SkillsData {
  technicalSkills: any[];
  softSkills: any[];
  certifications: any[];
  education: any[];
  workExperience: any[];
  hasData: boolean;
}

interface FullProfileData {
  success: boolean;
  profile: {
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    location: string | null;
    linkedin: string | null;
    portfolioUrl: string | null;
    experienceYears: number | null;
    experienceMonths: number | null;
    availability: string | null;
  };
  psychAssessment: {
    color: string | null;
    environment: string | null;
    symbol: string | null;
    animal: string | null;
    vibe: string | null;
  } | null;
  resumes: Array<{
    fileName: string;
    fileSize: number;
    uploadDate: string;
    isActive: boolean;
  }>;
}

export function CandidateDrawer({ candidate, open, onOpenChange }: CandidateDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [aiInsightsData, setAIInsightsData] = useState<AIInsightsData | null>(null);
  const [psychData, setPsychData] = useState<PsychData | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [skillsData, setSkillsData] = useState<SkillsData | null>(null);
  const [fullProfileData, setFullProfileData] = useState<FullProfileData | null>(null);

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingPsych, setLoadingPsych] = useState(false);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [loadingFullProfile, setLoadingFullProfile] = useState(false);

  // Error states
  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);
  const [errorPsych, setErrorPsych] = useState<string | null>(null);
  const [errorInterviews, setErrorInterviews] = useState<string | null>(null);
  const [errorSkills, setErrorSkills] = useState<string | null>(null);
  const [errorFullProfile, setErrorFullProfile] = useState<string | null>(null);

  const candidateEmail = candidate?.email;

  // Fetch overview data
  const fetchOverview = async () => {
    if (!candidateEmail) return;
    setLoadingOverview(true);
    setErrorOverview(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/candidate/profile/overview/${encodeURIComponent(candidateEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setOverviewData(data);
      } else {
        setErrorOverview(data.error || 'Failed to load overview');
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
      setErrorOverview('Failed to load overview data');
    } finally {
      setLoadingOverview(false);
    }
  };

  // Fetch AI insights
  const fetchAIInsights = async () => {
    if (!candidateEmail) return;
    setLoadingInsights(true);
    setErrorInsights(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/candidate/profile/ai-insights/${encodeURIComponent(candidateEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setAIInsightsData(data);
      } else {
        setErrorInsights(data.error || 'Failed to load AI insights');
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setErrorInsights('Failed to load AI insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  // Fetch psych assessment
  const fetchPsych = async () => {
    if (!candidateEmail) return;
    setLoadingPsych(true);
    setErrorPsych(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/candidate/profile/psych/${encodeURIComponent(candidateEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setPsychData(data);
      } else {
        setErrorPsych(data.error || 'Failed to load psych data');
      }
    } catch (error) {
      console.error('Error fetching psych data:', error);
      setErrorPsych('Failed to load psych assessment');
    } finally {
      setLoadingPsych(false);
    }
  };

  // Fetch interviews
  const fetchInterviews = async () => {
    if (!candidateEmail) return;
    setLoadingInterviews(true);
    setErrorInterviews(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/candidate/profile/interviews/${encodeURIComponent(candidateEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setInterviewData(data);
      } else {
        setErrorInterviews(data.error || 'Failed to load interviews');
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setErrorInterviews('Failed to load interviews');
    } finally {
      setLoadingInterviews(false);
    }
  };

  // Fetch skills
  const fetchSkills = async () => {
    if (!candidateEmail) return;
    setLoadingSkills(true);
    setErrorSkills(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/candidate/profile/skills/${encodeURIComponent(candidateEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSkillsData(data);
      } else {
        setErrorSkills(data.error || 'Failed to load skills');
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      setErrorSkills('Failed to load skills data');
    } finally {
      setLoadingSkills(false);
    }
  };

  // Fetch full profile data
  const fetchFullProfile = async () => {
    if (!candidate?.id) return;
    setLoadingFullProfile(true);
    setErrorFullProfile(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/candidates/${encodeURIComponent(candidate.id)}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        console.log('Full Profile Data:', data);
        console.log('Candidate jobTitle:', data.candidate?.jobTitle);
        console.log('Candidate experience:', data.candidate?.experience);
        console.log('Candidate availableIn:', data.candidate?.availableIn);
        setFullProfileData(data);
      } else {
        setErrorFullProfile(data.error || 'Failed to load full profile');
      }
    } catch (error) {
      console.error('Error fetching full profile:', error);
      setErrorFullProfile('Failed to load full profile data');
    } finally {
      setLoadingFullProfile(false);
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (!open || !candidateEmail) return;

    if (activeTab === 'overview') {
      if (!overviewData) {
        fetchOverview();
      }
      if (!fullProfileData && candidate?.id) {
        fetchFullProfile();
      }
    } else if (activeTab === 'insights' && !aiInsightsData) {
      fetchAIInsights();
    } else if (activeTab === 'psych' && !psychData) {
      fetchPsych();
    } else if (activeTab === 'interviews' && !interviewData) {
      fetchInterviews();
    } else if (activeTab === 'skills' && !skillsData) {
      fetchSkills();
    }
  }, [activeTab, open, candidateEmail, candidate]);

  // Reset all data when drawer closes
  useEffect(() => {
    if (!open) {
      setOverviewData(null);
      setAIInsightsData(null);
      setPsychData(null);
      setInterviewData(null);
      setSkillsData(null);
      setFullProfileData(null);
      setActiveTab('overview');
    }
  }, [open]);

  // Early return after all hooks
  if (!candidate) return null;

  const initials = candidate.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  // Helper function to format experience
  const formatExperience = (years: number | null, months: number | null): string => {
    if (years === null && months === null) return 'Not specified';
    const y = years || 0;
    const m = months || 0;
    return `${y} year${y !== 1 ? 's' : ''} ${m} month${m !== 1 ? 's' : ''}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col p-0">
        {/* Fixed header section */}
        <div className="shrink-0 px-6 pt-6 pb-2">
          <SheetHeader>
            <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={candidate.profilePicture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candidate.name)}`}
                alt={candidate.name}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-2xl flex items-center gap-2">
                {candidate.name}
                {candidate.starred && (
                  <Star className="h-5 w-5 text-accent fill-accent" />
                )}
              </SheetTitle>
              <SheetDescription className="text-base mt-1">
                {overviewData?.candidate?.jobTitle || candidate.role} • {overviewData?.candidate?.experience || `${candidate.experience} years experience`}
              </SheetDescription>
              {overviewData?.candidate && (overviewData.candidate.linkedin || overviewData.candidate.portfolioUrl) && (
                <div className="flex gap-2 mt-2">
                  {overviewData.candidate.linkedin && (
                    <a href={overviewData.candidate.linkedin} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {overviewData.candidate.portfolioUrl && (
                    <a href={overviewData.candidate.portfolioUrl} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors">
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {candidate.scores?.overall || '-'}
              </div>
              <div className="text-sm text-muted-foreground">Overall</div>
              <Badge className="mt-2">{stageLabels[candidate.stage] || candidate.stage}</Badge>
            </div>
          </div>
        </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          {/* Fixed tabs navigation */}
          <div className="shrink-0 px-6 pt-2 border-b">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="psych">Psych</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable tab content */}
          <div className="flex-1 overflow-y-auto px-6">

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {loadingOverview ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" variant="gold" />
              </div>
            ) : errorOverview ? (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{errorOverview}</p>
              </Card>
            ) : overviewData ? (
              <>
                {/* Contact Information */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    {overviewData.candidate.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${overviewData.candidate.email}`} className="text-primary hover:underline">
                          {overviewData.candidate.email}
                        </a>
                      </div>
                    )}
                    {overviewData.candidate.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{overviewData.candidate.phone}</span>
                      </div>
                    )}
                    {overviewData.candidate.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{overviewData.candidate.location}</span>
                      </div>
                    )}
                    {overviewData.candidate.availableIn && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Available: {overviewData.candidate.availableIn}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Resume Information */}
                {fullProfileData && fullProfileData.resumes && fullProfileData.resumes.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Resume Information
                    </h3>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="font-medium">Total Resumes:</span>{' '}
                        <span>{fullProfileData.resumes.length}</span>
                      </div>
                      {fullProfileData.resumes.find(r => r.isActive) && (
                        <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">Active Resume</span>
                            <Badge variant="default" className="text-xs">Active</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {fullProfileData.resumes.find(r => r.isActive)?.fileName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Size: {formatFileSize(fullProfileData.resumes.find(r => r.isActive)?.fileSize || 0)}
                          </div>
                        </div>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <FileText className="h-4 w-4 mr-2" />
                            View All Resumes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>All Resumes</DialogTitle>
                            <DialogDescription>
                              Complete resume history for {fullProfileData.profile.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 mt-4">
                            {fullProfileData.resumes.map((resume, index) => (
                              <div key={index} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-sm">{resume.fileName}</span>
                                  </div>
                                  {resume.isActive && (
                                    <Badge variant="default" className="text-xs">Active</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>Size: {formatFileSize(resume.fileSize)}</div>
                                  <div>Uploaded: {new Date(resume.uploadDate).toLocaleDateString()}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                )}

                {/* Assessment Scores */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3">Assessment scores</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-md bg-paper-2 border border-rule text-center">
                      <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-1">Screening</div>
                      <div className="text-2xl font-bold text-ink font-mono tabular-nums">
                        {overviewData?.scores?.screening || 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-md bg-paper-2 border border-rule text-center">
                      <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-1">Preliminary</div>
                      <div className="text-2xl font-bold text-ink font-mono tabular-nums">
                        {overviewData?.scores?.preliminary || 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-md bg-paper-2 border border-rule text-center">
                      <div className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-1">Fitment</div>
                      <div className="text-2xl font-bold text-ink font-mono tabular-nums">
                        {overviewData?.scores?.fitment || 0}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Eligible For */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3">Eligible For</h3>
                  {overviewData.eligibleForRoles && overviewData.eligibleForRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {overviewData.eligibleForRoles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No roles specified</p>
                  )}
                </Card>

                {/* List Memberships */}
                {overviewData.lists && overviewData.lists.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-lg mb-3">List Memberships</h3>
                    <div className="space-y-2">
                      {overviewData.lists.map((list: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                          <span className="text-sm font-medium">{list.listName}</span>
                          {list.isQualified && (
                            <Badge variant="default" className="text-xs">Curated</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>

          {/* AI INSIGHTS TAB */}
          <TabsContent value="insights" className="space-y-6 mt-6">
            {loadingInsights ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" variant="gold" />
              </div>
            ) : errorInsights ? (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{errorInsights}</p>
              </Card>
            ) : aiInsightsData ? (
              <>
                {/* Personality Traits */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    Personality Traits
                  </h3>
                  {aiInsightsData.personalityTraits.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {aiInsightsData.personalityTraits.map((trait, i) => (
                        <Badge key={i} variant="outline">{trait}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not yet evaluated</p>
                  )}
                </Card>

                {/* Key Strengths */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Key Strengths
                  </h3>
                  {aiInsightsData.keyStrengths.length > 0 ? (
                    <ul className="space-y-1">
                      {aiInsightsData.keyStrengths.map((strength, i) => (
                        <li key={i} className="text-sm">• {strength}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not yet evaluated</p>
                  )}
                </Card>

                {/* Areas for Development */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Areas for Development
                  </h3>
                  {aiInsightsData.areasForDevelopment.length > 0 ? (
                    <ul className="space-y-1">
                      {aiInsightsData.areasForDevelopment.map((area, i) => (
                        <li key={i} className="text-sm">• {area}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not yet evaluated</p>
                  )}
                </Card>

                {/* Cultural Fit */}
                <Card className="p-4 bg-accent/5 border-accent/20">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-accent" />
                    Cultural Fit Assessment
                  </h3>
                  <p className="text-sm">{aiInsightsData.culturalFit.assessment}</p>
                </Card>

                {/* Interview Analysis */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Interview Analysis
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Communication Style</h4>
                      <p className="text-sm">{aiInsightsData.interviewAnalysis.communicationStyle}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Problem Solving</h4>
                      <p className="text-sm">{aiInsightsData.interviewAnalysis.problemSolving}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Leadership Potential</h4>
                      <p className="text-sm">{aiInsightsData.interviewAnalysis.leadershipPotential}</p>
                    </div>
                    {aiInsightsData.interviewAnalysis.notableQuotes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Notable Quotes</h4>
                        {aiInsightsData.interviewAnalysis.notableQuotes.map((quote, i) => (
                          <p key={i} className="text-sm italic border-l-2 border-primary pl-3 mb-2">"{quote}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* PSYCH TAB */}
          <TabsContent value="psych" className="space-y-6 mt-6">
            {loadingPsych ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" variant="gold" />
              </div>
            ) : errorPsych ? (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{errorPsych}</p>
              </Card>
            ) : psychData ? (
              <>
                {/* Assessment Info */}
                <Card className="p-4 bg-accent/5 border-accent/20">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent" />
                    Personality Assessment
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {psychData.hasAssessment
                      ? "Completed 4-question psychological assessment revealing work style and personality traits."
                      : "Psychological assessment not yet completed."}
                  </p>
                </Card>

                {psychData.hasAssessment ? (
                  <>
                    {/* Color Preference */}
                    {psychData.assessment.colorChoice && (
                      <Card className="p-4">
                        <h4 className="font-semibold mb-3">Color Preference</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-12 h-12 rounded-full border-2 border-rule flex items-center justify-center"
                            style={{
                              backgroundColor: psychData.assessment.colorChoice === 'Blue' ? '#3B82F6' :
                                             psychData.assessment.colorChoice === 'Red' ? '#EF4444' :
                                             psychData.assessment.colorChoice === 'Green' ? '#10B981' :
                                             psychData.assessment.colorChoice === 'Yellow' ? '#F59E0B' : '#9CA3AF'
                            }}
                          />
                          <div>
                            <p className="text-lg font-medium">{psychData.assessment.colorChoice}</p>
                            <p className="text-xs text-muted-foreground">
                              {psychData.assessment.colorChoice === 'Red' && 'Passionate - High energy, action-oriented, results-driven'}
                              {psychData.assessment.colorChoice === 'Blue' && 'Calm - Steady, reliable, emotionally intelligent'}
                              {psychData.assessment.colorChoice === 'Green' && 'Balanced - Harmonious, adaptable, mediator'}
                              {psychData.assessment.colorChoice === 'Yellow' && 'Optimistic - Positive, creative, enthusiastic'}
                            </p>
                          </div>
                        </div>
                        {psychData.assessment.interpretation?.color && (
                          <p className="text-sm text-muted-foreground">{psychData.assessment.interpretation.color}</p>
                        )}
                      </Card>
                    )}

                    {/* Environment Choice */}
                    {psychData.assessment.environmentChoice && (
                      <Card className="p-4">
                        <h4 className="font-semibold mb-3">Environment Choice</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-4xl">
                            {(psychData.assessment.environmentChoice.toLowerCase() === 'mountain' || psychData.assessment.environmentChoice.toLowerCase() === 'mountains') ? '🏔️' :
                             (psychData.assessment.environmentChoice.toLowerCase() === 'ocean' || psychData.assessment.environmentChoice.toLowerCase() === 'beach') ? '🌊' :
                             psychData.assessment.environmentChoice.toLowerCase() === 'forest' ? '🌲' :
                             psychData.assessment.environmentChoice.toLowerCase() === 'city' ? '🏙️' : '🌍'}
                          </div>
                          <div>
                            <p className="text-lg font-medium">{psychData.assessment.environmentChoice}</p>
                            <p className="text-xs text-muted-foreground">
                              {(psychData.assessment.environmentChoice.toLowerCase() === 'mountain' || psychData.assessment.environmentChoice.toLowerCase() === 'mountains') && 'Challenge-seeker - Thrives on obstacles, goal-oriented'}
                              {(psychData.assessment.environmentChoice.toLowerCase() === 'ocean' || psychData.assessment.environmentChoice.toLowerCase() === 'beach') && 'Go-with-the-flow - Adaptable, flexible, collaborative'}
                              {psychData.assessment.environmentChoice.toLowerCase() === 'forest' && 'Grounded - Stable, focused, detail-oriented'}
                              {psychData.assessment.environmentChoice.toLowerCase() === 'city' && 'Fast-paced - Energetic, multitasker, competitive'}
                            </p>
                          </div>
                        </div>
                        {psychData.assessment.interpretation?.environment && (
                          <p className="text-sm text-muted-foreground">{psychData.assessment.interpretation.environment}</p>
                        )}
                      </Card>
                    )}

                    {/* Symbol Choice */}
                    {psychData.assessment.symbolChoice && (
                      <Card className="p-4">
                        <h4 className="font-semibold mb-3">Symbol Choice</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-4xl">
                            {psychData.assessment.symbolChoice === 'Star' ? '⭐' :
                             psychData.assessment.symbolChoice === 'Moon' ? '🌙' :
                             psychData.assessment.symbolChoice === 'Sun' ? '☀️' :
                             psychData.assessment.symbolChoice === 'Lightning' ? '⚡' : '📐'}
                          </div>
                          <div>
                            <p className="text-lg font-medium">{psychData.assessment.symbolChoice}</p>
                            <p className="text-xs text-muted-foreground">
                              {psychData.assessment.symbolChoice === 'Star' && 'Achiever - Recognition-driven, ambitious, goal-focused'}
                              {psychData.assessment.symbolChoice === 'Moon' && 'Reflective - Introspective, thoughtful, long-term thinker'}
                              {psychData.assessment.symbolChoice === 'Sun' && 'Energizer - Positive, motivating, momentum-builder'}
                              {psychData.assessment.symbolChoice === 'Lightning' && 'Innovator - Creative, disruptive, rapid executor'}
                            </p>
                          </div>
                        </div>
                        {psychData.assessment.interpretation?.symbol && (
                          <p className="text-sm text-muted-foreground">{psychData.assessment.interpretation.symbol}</p>
                        )}
                      </Card>
                    )}

                    {/* Animal Choice */}
                    {psychData.assessment.animalChoice && (
                      <Card className="p-4">
                        <h4 className="font-semibold mb-3">Animal Choice</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-4xl">
                            {psychData.assessment.animalChoice.toLowerCase() === 'lion' ? '🦁' :
                             psychData.assessment.animalChoice.toLowerCase() === 'eagle' ? '🦅' :
                             psychData.assessment.animalChoice.toLowerCase() === 'dolphin' ? '🐬' :
                             psychData.assessment.animalChoice.toLowerCase() === 'owl' ? '🦉' : '🐾'}
                          </div>
                          <div>
                            <p className="text-lg font-medium">{psychData.assessment.animalChoice}</p>
                            <p className="text-xs text-muted-foreground">
                              {psychData.assessment.animalChoice.toLowerCase() === 'lion' && 'Leader - Bold, decisive, natural at taking charge'}
                              {psychData.assessment.animalChoice.toLowerCase() === 'eagle' && 'Visionary - Strategic, big-picture, opportunity-spotter'}
                              {psychData.assessment.animalChoice.toLowerCase() === 'dolphin' && 'Team Player - Social, collaborative, empathetic'}
                              {psychData.assessment.animalChoice.toLowerCase() === 'owl' && 'Analytical - Detail-oriented, methodical, data-driven'}
                            </p>
                          </div>
                        </div>
                        {psychData.assessment.interpretation?.animal && (
                          <p className="text-sm text-muted-foreground">{psychData.assessment.interpretation.animal}</p>
                        )}
                      </Card>
                    )}

                    {/* Vibe Choice */}
                    {psychData.assessment.vibeChoice && (
                      <Card className="p-4">
                        <h4 className="font-semibold mb-3">Vibe</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-4xl">
                            {psychData.assessment.vibeChoice === 'Energetic' ? '⚡' :
                             psychData.assessment.vibeChoice === 'Calm' ? '🧘' :
                             psychData.assessment.vibeChoice === 'Focused' ? '🎯' :
                             psychData.assessment.vibeChoice === 'Creative' ? '🎨' : '✨'}
                          </div>
                          <div>
                            <p className="text-lg font-medium">{psychData.assessment.vibeChoice}</p>
                            <p className="text-xs text-muted-foreground">Work vibe</p>
                          </div>
                        </div>
                        {psychData.assessment.interpretation?.vibe && (
                          <p className="text-sm text-muted-foreground">{psychData.assessment.interpretation.vibe}</p>
                        )}
                      </Card>
                    )}

                    {/* Legacy Vibe from fullProfileData (remove after migration) */}
                    {!psychData.assessment.vibeChoice && fullProfileData?.psychAssessment?.vibe && (
                      <Card className="p-4">
                        <h4 className="font-semibold mb-3">Vibe</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-4xl">
                            {fullProfileData.psychAssessment.vibe === 'Energetic' ? '⚡' :
                             fullProfileData.psychAssessment.vibe === 'Calm' ? '🧘' :
                             fullProfileData.psychAssessment.vibe === 'Focused' ? '🎯' :
                             fullProfileData.psychAssessment.vibe === 'Creative' ? '🎨' : '✨'}
                          </div>
                          <div>
                            <p className="text-lg font-medium">{fullProfileData.psychAssessment.vibe}</p>
                            <p className="text-xs text-muted-foreground">Work vibe</p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Assessment not completed. This will be part of profile activities.
                    </p>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>

          {/* INTERVIEWS TAB */}
          <TabsContent value="interviews" className="space-y-6 mt-6">
            {loadingInterviews ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" variant="gold" />
              </div>
            ) : errorInterviews ? (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{errorInterviews}</p>
              </Card>
            ) : interviewData ? (
              <>
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Interview Reports ({interviewData.totalInterviews})
                  </h3>
                  {interviewData.interviews.length > 0 ? (
                    <div className="space-y-3">
                      {interviewData.interviews.map((interview) => (
                        <div key={interview.sessionId} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{interview.interviewName}</h4>
                            <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                              {interview.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>Type: {interview.type}</div>
                            <div>Duration: {Math.floor(interview.duration / 60)}min</div>
                            {interview.startTime && (
                              <div className="col-span-2">
                                Date: {new Date(interview.startTime).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No interview reports available yet</p>
                  )}
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* SKILLS TAB */}
          <TabsContent value="skills" className="space-y-6 mt-6">
            {loadingSkills ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" variant="gold" />
              </div>
            ) : errorSkills ? (
              <Card className="p-4 bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{errorSkills}</p>
              </Card>
            ) : skillsData ? (
              <>
                {/* Technical Skills */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Technical Skills
                  </h3>
                  {skillsData.technicalSkills && skillsData.technicalSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsData.technicalSkills.map((skill: any, i: number) => (
                        <Badge key={i} variant="secondary">{skill.name || skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No technical skills data</p>
                  )}
                </Card>

                {/* Soft Skills */}
                <Card className="p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" />
                    Soft Skills
                  </h3>
                  {skillsData.softSkills && skillsData.softSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsData.softSkills.map((skill: any, i: number) => (
                        <Badge key={i} variant="outline">{skill.name || skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No soft skills data</p>
                  )}
                </Card>

                {/* Education */}
                {skillsData.education && skillsData.education.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Education
                    </h3>
                    <div className="space-y-2">
                      {skillsData.education.map((edu: any, i: number) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium">{edu.degree || edu.name}</p>
                          {edu.institution && <p className="text-muted-foreground">{edu.institution}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Work Experience */}
                {skillsData.workExperience && skillsData.workExperience.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Work Experience
                    </h3>
                    <div className="space-y-3">
                      {skillsData.workExperience.map((exp: any, i: number) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium">{exp.title || exp.position}</p>
                          {exp.company && <p className="text-muted-foreground">{exp.company}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>

        </div>
        </Tabs>

        {/* Fixed Actions at bottom */}
        <div className="shrink-0 flex gap-2 px-6 py-4 border-t bg-background">
          <Button className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download Profile
          </Button>
          <Button variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share with Client
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
