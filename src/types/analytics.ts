// Analytics-specific type definitions
export interface AnalyticsCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  profilePicture?: string;

  // Interview stage info
  stage: 'screening' | 'prelims' | 'fitment' | 'final' | 'selected' | 'rejected';

  // Scores from interviews
  scores: {
    screening?: number;
    prelims?: number;
    fitment?: number;
    overall?: number;
  };

  // Skills data (if available)
  skills?: {
    [key: string]: number; // skill name to proficiency (0-100)
  };

  // Basic info
  experience?: number;
  location?: string;
  availability?: string;
  starred?: boolean;
  eligibleForRoles?: string[];

  // Dates
  appliedDate?: string;
  lastUpdated?: string;

  // Optional rich data
  notes?: string;
  socials?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    linkedinInsights?: {
      endorsements: string[];
      recommendations: {
        name: string;
        title: string;
        relationship: string;
        quote: string;
      }[];
      activityScore: number;
      followerCount?: number;
      influenceLevel?: string;
    };
    githubInsights?: {
      contributions: number;
      topLanguages: string[];
      starredRepos: number;
      influence: string;
    };
  };

  // Interview insights (to be populated later)
  smartInsights?: {
    personality?: string[];
    strengths?: string[];
    potentialChallenges?: string[];
    culturalFit?: string;
  };

  interviewInsights?: {
    communicationStyle?: string;
    problemSolvingApproach?: string;
    leadershipPotential?: string;
    keyQuotes?: string[];
  };

  interviewReports?: {
    round: string;
    date: string;
    interviewer?: string;
    summary?: string;
    recommendation?: 'strong-yes' | 'yes' | 'maybe' | 'no';
  }[];

  psychAssessment?: {
    animal: 'lion' | 'owl' | 'dolphin' | 'fox';
    color: 'red' | 'blue' | 'green' | 'yellow';
    environment: 'mountain' | 'beach' | 'forest' | 'city';
    symbol: 'compass' | 'bridge' | 'tree' | 'puzzle';
  };
}

// List with analytics
export interface AnalyticsList {
  id: string;
  name: string;
  description?: string;
  color?: string;
  totalCandidates: number;
  sourcesCount: number;
  starredCount?: number;
  createdAt: string;
  updatedAt: string;
  usedInInterviews?: string[];
  candidates?: AnalyticsCandidate[];
  sharedWith?: string[];
  topSkills?: Array<{
    name: string;
    count: number;
  }>;

  // Optional AI insights (future)
  aiInsights?: {
    summary?: string;
    topSkill?: string;
    diversityScore?: number;
    hiringVelocity?: string;
    recommendation?: string;
  };

  // Loading state for enhancement data
  isEnhancementLoading?: boolean;

  // Flag for qualified lists (manually curated)
  isQualified?: boolean;

  // Flag for shared lists (from other projects)
  isShared?: boolean;

  // Source project info for shared lists
  sourceProjectId?: string;
  sourceProjectName?: string;
}

// Stats for analytics
export interface CandidateListStats {
  total: number;
  byStage: {
    [key: string]: number;
  };
  topPerformers: number;
  eligible: number;
  averageScore: number;
  skillsDistribution?: {
    [key: string]: number;
  };
}

// Phase A workspace dashboard
export interface DashboardFunnel {
  invited: number;
  started: number;
  completed: number;
  strong_match: number;
}

export interface DashboardTopCandidate {
  session_id: string;
  candidate_id?: string | null;
  name?: string | null;
  email?: string | null;
  interview_id: string;
  interview_title?: string | null;
  overall_score?: number | null;
  recommendation?: string | null;
  completed_at?: string | null;
}

export interface DashboardInterviewRollup {
  id: string;
  title: string;
  type?: string | null;
  status?: string | null;
  invited: number;
  completed: number;
  avg_score?: number | null;
}

export interface DashboardThroughputBucket {
  date: string; // YYYY-MM-DD
  started: number;
  completed: number;
}

export interface ProjectDashboardResponse {
  success: boolean;
  funnel: DashboardFunnel;
  top_candidates: DashboardTopCandidate[];
  interviews_rollup: DashboardInterviewRollup[];
  throughput: DashboardThroughputBucket[];
}
