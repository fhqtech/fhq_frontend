import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RippleLoader from "@/components/RippleLoader";
import {
  Loader2,
  User,
  Briefcase,
  Phone,
  MapPin,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Edit,
  Linkedin,
  FileText,
  Building2,
  Timer,
  Activity,
  History,
  Star,
  ArrowRight,
  Pause,
  Square,
  Globe,
  Brain,
  Target,
  X,
  LogOut,
  Settings,
  ChevronDown,
  Upload,
  Download
} from "lucide-react";
import { getInterviewStatus } from '@/services/interviewControlService';
import { getFitmentInterviewStatus } from '@/services/fitmentInterviewControlService';
import InterviewStatusModal from '@/components/modals/InterviewStatusModal';

interface Interview {
  interviewId: string;
  invitationToken: string;
  status: string;
  result: string | null;
  addedAt: string;
  type?: string;
}

interface Resume {
  id: string;
  filename: string;
  gcsPath: string;
  uploadedAt: string;
  fileSize: number;
  isActive: boolean;
  usedInInterviews: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  resume_url?: string;
  resumes?: Resume[];
  jobTitle?: string;
  experience?: string;
  availableIn?: string;
  portfolioUrl?: string;
  psychAssessment?: {
    animal?: string;
    color?: string;
    environment?: string;
    symbol?: string;
  };
  currentInterviewId: string;
  interviews: Interview[];
  createdAt: string;
  updatedAt: string;
}

interface InterviewDetails {
  id: string;
  title: string;
  description: string;
  duration: number;
  type?: string;
  applicant_count?: number;
}

interface PortalData {
  candidate: Candidate;
  interview: InterviewDetails;
  interview_details?: Record<string, InterviewDetails>;
  success: boolean;
}

interface EnhancedInterview extends Interview {
  interviewDetails?: InterviewDetails;
  uniqueId: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'bg-green-500 hover:bg-green-600';
    case 'in-progress': return 'bg-blue-500 hover:bg-blue-600';
    case 'scheduling': return 'bg-purple-500 hover:bg-purple-600';
    case 'applied': return 'bg-purple-500 hover:bg-purple-600';
    case 'failed': return 'bg-red-500 hover:bg-red-600';
    default: return 'bg-gray-500 hover:bg-gray-600';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'failed': return <AlertCircle className="w-4 h-4" />;
    case 'in-progress': return <Play className="w-4 h-4" />;
    case 'scheduling': return <Clock className="w-4 h-4" />;
    case 'applied': return <Clock className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const getDisplayStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'scheduling': return 'Ready';
    case 'applied': return 'Ready'; 
    case 'in-progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    default: return status;
  }
};

const getPriorityLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'in-progress': return 'High';
    case 'scheduling': return 'Medium';
    case 'applied': return 'Normal';
    case 'completed': return 'Done';
    default: return 'Normal';
  }
};

const calculateProfileCompletion = (candidate: Candidate) => {
  let completed = 0;
  const total = 9; // 6 mandatory + 3 optional psych questions (excluding LinkedIn, resume, portfolio)

  // Mandatory fields (6 total)
  if (candidate.phone) completed++;
  if (candidate.location) completed++;
  if (candidate.jobTitle) completed++;
  if (candidate.experience) completed++;
  if (candidate.availableIn) completed++;
  if (candidate.psychAssessment?.animal) completed++;

  // Optional psych questions (3 total) - LinkedIn, resume, portfolio not counted
  if (candidate.psychAssessment?.color) completed++;
  if (candidate.psychAssessment?.environment) completed++;
  if (candidate.psychAssessment?.symbol) completed++;

  return Math.round((completed / total) * 100);
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatUploadDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    // Show time if uploaded today
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const truncateFilename = (filename: string, maxLength: number = 25): string => {
  if (filename.length <= maxLength) return filename;

  const extension = filename.split('.').pop() || '';
  const nameWithoutExt = filename.substring(0, filename.length - extension.length - 1);
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);

  return `${truncatedName}...${extension}`;
};


export default function CandidatePortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [enhancedInterviews, setEnhancedInterviews] = useState<EnhancedInterview[]>([]);
  const [showProfileBanner, setShowProfileBanner] = useState(true);
  const [missingField, setMissingField] = useState<any>(null);
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [bannerAnimating, setBannerAnimating] = useState(false);

  // Interview status modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<'paused' | 'stopped'>('paused');
  const [modalInterviewTitle, setModalInterviewTitle] = useState<string>('');
  const [startingInterviewId, setStartingInterviewId] = useState<string | null>(null);

  // Edit profile modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    jobTitle: '',
    location: '',
    linkedin: '',
    portfolioUrl: '',
    experienceYears: '',
    experienceMonths: '',
    availableIn: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Location autocomplete state for edit modal
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Resume upload state
  const [uploadingResume, setUploadingResume] = useState(false);
  const [settingActiveId, setSettingActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resume modal state
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPortalData(token);
    }
  }, [token]);

  // Refresh data when page becomes visible (e.g., returning from interview)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        console.log('[Portal] Page became visible - refreshing data');
        fetchPortalData(token);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  // Periodic status checking
  useEffect(() => {
    if (enhancedInterviews.length > 0) {
      // Initial check after interviews are loaded
      refreshInterviewStatuses();

      // Set up interval to check every 30 seconds
      const interval = setInterval(refreshInterviewStatuses, 30000);

      // Cleanup on unmount or dependency change
      return () => clearInterval(interval);
    }
  }, [enhancedInterviews.length]); // Only depends on length to avoid infinite loops

  // Fetch missing profile field question
  useEffect(() => {
    if (token && portalData) {
      fetchMissingFieldQuestion();
    }
  }, [token, portalData]);

  const fetchMissingFieldQuestion = async () => {
    if (!token) return;

    try {
      setFetchingQuestion(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidate-portal/${token}/next-profile-question`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.missing_field) {
          setMissingField(data.missing_field);
        } else {
          setMissingField(null); // Profile is complete
        }
      }
    } catch (error) {
      console.error('Error fetching missing field question:', error);
    } finally {
      setFetchingQuestion(false);
    }
  };

  // Color mapping for psychAssessment.color field
  const colorMap: Record<string, string> = {
    "Blue": "#3B82F6",
    "Red": "#EF4444",
    "Green": "#10B981",
    "Yellow": "#F59E0B"
  };

  // Animal emoji mapping for psychAssessment.animal field
  const animalEmojiMap: Record<string, string> = {
    "lion": "🦁",
    "eagle": "🦅",
    "dolphin": "🐬",
    "owl": "🦉"
  };

  // Environment emoji mapping for psychAssessment.environment field
  const environmentEmojiMap: Record<string, string> = {
    "Mountains": "🏔️",
    "Beach": "🏖️",
    "Forest": "🌲",
    "City": "🏙️"
  };

  // Symbol emoji mapping for psychAssessment.symbol field
  const symbolEmojiMap: Record<string, string> = {
    "Star": "⭐",
    "Circle": "⭕",
    "Triangle": "🔺",
    "Square": "🟥"
  };

  // Vibe emoji mapping for psychAssessment.vibe field
  const vibeEmojiMap: Record<string, string> = {
    "Energetic": "⚡",
    "Calm": "🧘",
    "Focused": "🎯",
    "Creative": "🎨"
  };

  // Handle quick answer submission from banner
  const handleQuickAnswer = async (field: string, value: string) => {
    console.log('🔵 handleQuickAnswer called:', { field, value });
    console.log('🔵 Initial checks:', {
      hasPortalData: !!portalData,
      hasToken: !!token,
      submittingAnswer,
      candidateId: portalData?.candidate?.id
    });

    if (!portalData || !token || submittingAnswer) {
      console.log('❌ Early return - missing requirements');
      return;
    }

    try {
      setSubmittingAnswer(true);
      setSelectedOption(value);

      // Optimistically update the local state
      const updatedCandidate = { ...portalData.candidate };

      // Handle nested fields (e.g., psychAssessment.color)
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        updatedCandidate[parent as keyof Candidate] = {
          ...updatedCandidate[parent as keyof Candidate],
          [child]: value
        } as any;
      } else {
        updatedCandidate[field as keyof Candidate] = value as any;
      }

      // Update local state immediately (optimistic update)
      setPortalData({
        ...portalData,
        candidate: updatedCandidate
      });

      // Prepare the payload for the API
      // Send dot-notation fields directly to backend (e.g., "psychAssessment.color": "Red")
      const payload: Record<string, any> = {
        [field]: value
      };

      console.log('🔵 Payload prepared:', payload);

      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidates/${portalData.candidate.id}/profile`;
      console.log('🔵 API URL:', apiUrl);

      // Send update to backend
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('🔵 Response status:', response.status);
      const result = await response.json();
      console.log('🔵 Response data:', result);

      if (response.ok && result.success) {
        console.log('✅ Success!');
        // Success! Show a subtle animation
        setBannerAnimating(true);

        // Show success toast
        toast({
          title: "Profile updated!",
          description: `Answer saved successfully`,
          duration: 2000,
        });

        // Wait for animation to complete
        setTimeout(async () => {
          // Fetch the next question
          await fetchMissingFieldQuestion();

          // If no more questions, hide banner after delay
          setTimeout(() => {
            setBannerAnimating(false);
            setSelectedOption(null);
          }, 300);
        }, 800);

      } else {
        console.log('❌ API returned error:', result);
        // Revert optimistic update on failure
        setPortalData(portalData);
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.log('❌ Exception caught:', error);
      // Revert optimistic update on error
      setPortalData(portalData);
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const fetchPortalData = async (portalToken: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidate-portal/${portalToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to registration endpoint if portal endpoint doesn't exist yet
        const fallbackResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/register/${portalToken}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!fallbackResponse.ok) {
          throw new Error('Invalid token');
        }

        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          const data = {
            candidate: fallbackData.candidate,
            interview: fallbackData.interview,
            success: true
          };
          setPortalData(data);
          await processInterviewsWithDetails(data);
        } else {
          throw new Error(fallbackData.error || 'Failed to load portal data');
        }
      } else {
        const data = await response.json();
        if (data.success) {
          setPortalData(data);
          await processInterviewsWithDetails(data);
        } else {
          throw new Error(data.error || 'Failed to load portal data');
        }
      }
    } catch (err) {
      console.error('Error fetching portal data:', err);
      setError("Failed to load your portal. Please check your invitation link.");
    } finally {
      setLoading(false);
    }
  };

  const processInterviewsWithDetails = async (data: PortalData) => {
    try {
      console.log('🔍 Processing interviews with details:', {
        candidateInterviews: data.candidate.interviews,
        interviewDetails: data.interview_details,
        mainInterview: data.interview
      });

      // Group interviews by unique combinations to avoid showing duplicates
      const uniqueInterviews = data.candidate.interviews.reduce((acc, interview) => {
        // Create a unique identifier based on interview details and time
        const uniqueId = `${interview.interviewId}-${interview.status}-${new Date(interview.addedAt).getTime()}`;

        const enhanced: EnhancedInterview = {
          ...interview,
          uniqueId,
          interviewDetails: data.interview_details?.[interview.interviewId] ||
                          (interview.interviewId === data.interview.id ? data.interview : undefined)
        };

        console.log('✅ Enhanced interview:', {
          interviewId: interview.interviewId,
          type: interview.type,
          hasDetails: !!enhanced.interviewDetails,
          detailsTitle: enhanced.interviewDetails?.title,
          fullDetails: enhanced.interviewDetails
        });

        // Only add if we don't already have this exact combination
        const existingIndex = acc.findIndex(existing =>
          existing.interviewId === interview.interviewId &&
          existing.status === interview.status &&
          Math.abs(new Date(existing.addedAt).getTime() - new Date(interview.addedAt).getTime()) < 60000 // within 1 minute
        );

        if (existingIndex === -1) {
          acc.push(enhanced);
        }

        return acc;
      }, [] as EnhancedInterview[]);

      // Sort by date (newest first)
      uniqueInterviews.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

      console.log('📋 Final enhanced interviews:', uniqueInterviews);

      setEnhancedInterviews(uniqueInterviews);
    } catch (err) {
      console.error('Error processing interviews:', err);
      // Fallback to showing all interviews
      const fallbackEnhanced = data.candidate.interviews.map((interview, index) => ({
        ...interview,
        uniqueId: `${interview.interviewId}-${index}`,
        interviewDetails: data.interview_details?.[interview.interviewId] || 
                        (interview.interviewId === data.interview.id ? data.interview : undefined)
      }));
      setEnhancedInterviews(fallbackEnhanced);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatClosingDate = (dateString: string) => {
    const addedDate = new Date(dateString);
    const closingDate = new Date(addedDate);
    closingDate.setDate(closingDate.getDate() + 7); // Add 7 days
    return closingDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to refresh interview statuses
  const refreshInterviewStatuses = async () => {
    try {
      const updatedInterviews = await Promise.all(
        enhancedInterviews.map(async (interview) => {
          try {
            // Only check status for interviews that could have been paused/stopped/resumed
            if (['scheduling', 'active', 'paused', 'stopped'].includes(interview.status.toLowerCase())) {
              // Call appropriate status endpoint based on interview type
              const statusResponse = interview.interviewDetails?.type === 'fitment'
                ? await getFitmentInterviewStatus(interview.interviewId)
                : await getInterviewStatus(interview.interviewId);

              return {
                ...interview,
                status: statusResponse.status
              };
            }
            return interview;
          } catch (error) {
            // If status check fails, keep original status
            console.warn(`Failed to check status for interview ${interview.interviewId}:`, error);
            return interview;
          }
        })
      );

      setEnhancedInterviews(updatedInterviews);
    } catch (error) {
      console.error('Failed to refresh interview statuses:', error);
    }
  };

  const getActiveInterviews = () => {
    return enhancedInterviews.filter(
      interview =>
        ['scheduling', 'applied', 'in-progress', 'active', 'paused'].includes(interview.status.toLowerCase()) &&
        !interview.interviewDetails?.completed_session
    );
  };

  const getCompletedInterviews = () => {
    return enhancedInterviews.filter(
      interview =>
        ['completed', 'failed', 'stopped'].includes(interview.status.toLowerCase()) ||
        !!interview.interviewDetails?.completed_session
    );
  };

  const getCurrentInterview = () => {
    if (!portalData) return null;
    return enhancedInterviews.find(
      interview => interview.interviewId === portalData.candidate.currentInterviewId
    );
  };

  const handleStartInterview = async (interview: EnhancedInterview) => {
    // Check current interview status before proceeding
    setStartingInterviewId(interview.interviewId);
    try {
      const statusResponse = await getInterviewStatus(interview.interviewId);
      const currentStatus = statusResponse.status.toLowerCase();

      // Show appropriate popup based on status
      if (currentStatus === 'paused') {
        setModalStatus('paused');
        setModalInterviewTitle(interview.interviewDetails?.title || 'Interview');
        setStatusModalOpen(true);
        setStartingInterviewId(null);
        return;
      }

      if (currentStatus === 'stopped') {
        setModalStatus('stopped');
        setModalInterviewTitle(interview.interviewDetails?.title || 'Interview');
        setStatusModalOpen(true);
        setStartingInterviewId(null);
        return;
      }

      // Proceed with normal interview flow if status is active
      navigate(`/interview/${interview.interviewId}/pre-check`, {
        state: {
          candidateToken: token, // Pass the candidate token through
          candidateData: {
            id: portalData?.candidate.id,
            name: portalData?.candidate.name,
            email: portalData?.candidate.email,
            resumes: portalData?.candidate.resumes
          },
          interviewData: {
            id: interview.interviewId,
            title: interview.interviewDetails?.title || 'Interview',
            description: interview.interviewDetails?.description || 'AI Interview Assessment',
            duration: interview.interviewDetails?.duration || 30,
            type: interview.interviewDetails?.type || 'ai_interview',
            voiceSpeed: interview.interviewDetails?.voiceSpeed || 'normal',
            voiceAccent: interview.interviewDetails?.voiceAccent || 'indian'
          },
          activeSession: interview.interviewDetails?.active_session || null
        }
      });

      // Also store the token in sessionStorage as a backup
      if (token) {
        sessionStorage.setItem('candidateToken', token);
      }

    } catch (error) {
      console.error('Error checking interview status:', error);
      setStartingInterviewId(null);
      toast({
        title: "Error",
        description: "Unable to check interview status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const canStartInterview = (status: string, hasCompletedSession?: boolean) => {
    // Cannot start if session is already completed
    if (hasCompletedSession) {
      return false;
    }

    return ['applied', 'scheduling', 'active'].includes(status.toLowerCase())
      && !['paused', 'stopped'].includes(status.toLowerCase());
  };

  const getInterviewButtonText = (status: string, hasActiveSession?: boolean, hasCompletedSession?: boolean) => {
    // If session is completed, always show "Completed"
    if (hasCompletedSession) {
      return 'Completed';
    }

    switch (status.toLowerCase()) {
      case 'applied':
      case 'scheduling':
      case 'active':
        return hasActiveSession ? 'Continue Interview' : 'Start Interview';
      case 'paused':
        return 'Interview Paused';
      case 'stopped':
        return 'Interview Closed';
      case 'in-progress':
        return 'Continue Interview';
      case 'completed':
        return 'View Results';
      case 'failed':
        return 'Review';
      default:
        return 'View';
    }
  };

  const handleOpenEditModal = () => {
    if (portalData) {
      // Parse experience string to extract years and months
      const experience = portalData.candidate.experience || '';
      let years = '';
      let months = '';

      // Try to extract years and months from various formats
      const yearsMatch = experience.match(/(\d+)\s*(?:years?|yrs?)/i);
      const monthsMatch = experience.match(/(\d+)\s*(?:months?|mos?)/i);

      if (yearsMatch) years = yearsMatch[1];
      if (monthsMatch) months = monthsMatch[1];

      setEditFormData({
        jobTitle: portalData.candidate.jobTitle || '',
        location: portalData.candidate.location || '',
        linkedin: portalData.candidate.linkedin || '',
        portfolioUrl: portalData.candidate.portfolioUrl || '',
        experienceYears: years,
        experienceMonths: months,
        availableIn: portalData.candidate.availableIn || ''
      });
      setIsEditModalOpen(true);
    }
  };

  // Fetch location suggestions for edit modal
  const fetchLocationSuggestions = async (query: string) => {
    try {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(
        `${backendUrl}/api/places/autocomplete?input=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.predictions && data.predictions.length > 0) {
          const suggestions = data.predictions.map((item: any) => item.description);
          setLocationSuggestions(suggestions.slice(0, 8));
          setShowLocationDropdown(true);
        }
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
    }
  };

  const handleLocationChange = (value: string) => {
    setEditFormData({ ...editFormData, location: value });

    if (value.length > 2) {
      fetchLocationSuggestions(value);
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  const selectLocation = (location: string) => {
    setEditFormData({ ...editFormData, location });
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  const updateProfile = async () => {
    if (!portalData || !token) return;

    try {
      setIsUpdating(true);

      // Construct experience string from years and months
      let experience = '';
      const years = editFormData.experienceYears?.trim();
      const months = editFormData.experienceMonths?.trim();

      if (years && months) {
        experience = `${years} years ${months} months`;
      } else if (years) {
        experience = `${years} years`;
      } else if (months) {
        experience = `${months} months`;
      }

      // Create payload with combined experience
      const payload = {
        jobTitle: editFormData.jobTitle,
        location: editFormData.location,
        linkedin: editFormData.linkedin,
        portfolioUrl: editFormData.portfolioUrl,
        experience: experience,
        availableIn: editFormData.availableIn
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidates/${portalData.candidate.id}/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });

        // Refresh portal data
        await fetchPortalData(token);

        // Refresh missing field question
        await fetchMissingFieldQuestion();

        // Close modal
        setIsEditModalOpen(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !portalData || !token) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOC, or DOCX file",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive"
      });
      event.target.value = '';
      return;
    }

    try {
      setUploadingResume(true);

      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidates/${portalData.candidate.id}/resumes`,
        {
          method: 'POST',
          body: formData
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Resume uploaded successfully!"
        });

        // Update only the resumes in portal data (no full page reload)
        if (result.resumes) {
          setPortalData({
            ...portalData,
            candidate: {
              ...portalData.candidate,
              resumes: result.resumes
            }
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload resume",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Error",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingResume(false);
      event.target.value = '';
    }
  };

  const handleSetActiveResume = async (resumeId: string) => {
    if (!portalData || !token) return;

    try {
      setSettingActiveId(resumeId);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/candidates/${portalData.candidate.id}/resumes/${resumeId}/set-active`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Resume set as active successfully!"
        });

        // Update only the resumes in portal data (no full page reload)
        if (result.resumes) {
          setPortalData({
            ...portalData,
            candidate: {
              ...portalData.candidate,
              resumes: result.resumes,
              activeResumeId: resumeId,
              resume_url: result.resumes.find((r: any) => r.id === resumeId)?.gcsPath || portalData.candidate.resume_url
            }
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to set active resume",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error setting active resume:', error);
      toast({
        title: "Error",
        description: "Failed to set active resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSettingActiveId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paused':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Pause className="w-3 h-3 mr-1" />
            Interview Paused
          </Badge>
        );
      case 'stopped':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <Square className="w-3 h-3 mr-1" />
            Interview Closed
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <Play className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'scheduling':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
            <Calendar className="w-3 h-3 mr-1" />
            Scheduling
          </Badge>
        );
      case 'draft':
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-300">
            <FileText className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            <Clock className="w-3 h-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <RippleLoader />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Loading your portal</h1>
            <p className="mt-2 text-sm text-foreground-muted max-w-md">
              We're pulling up your interview details. This usually takes a few seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Portal Access Error</h2>
            <p className="text-foreground-muted mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeInterviews = getActiveInterviews();
  const completedInterviews = getCompletedInterviews();
  const currentInterview = getCurrentInterview();

  const profileCompletion = calculateProfileCompletion(portalData.candidate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Logo and Profile - Full Width */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-8 py-2.5 overflow-hidden">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center relative h-10 -ml-4">
              <img
                src="/logo.png"
                alt="FunnelHQ"
                className="h-16 object-cover object-top -mt-2"
              />
              <div className="absolute left-14">
                <h1 className="text-xl font-bold text-slate-900 whitespace-nowrap">FunnelHQ</h1>
                <p className="text-[10px] text-slate-500 whitespace-nowrap">Candidate Portal</p>
              </div>
            </div>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-50">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-900">{portalData.candidate.name}</p>
                    <p className="text-xs text-slate-500">{portalData.candidate.email}</p>
                  </div>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(portalData.candidate.name)}`}
                    alt={portalData.candidate.name}
                    className="w-10 h-10 rounded-full shadow-md"
                  />
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast({ title: "Profile settings coming soon!" })}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: "Settings coming soon!" })}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Profile Completion Banner - Dynamic from API */}
      {showProfileBanner && missingField && (
        <div
          className={`bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 transition-all duration-500 ${
            bannerAnimating ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="w-full px-8 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm font-semibold text-amber-900">
                    {missingField.question}
                  </p>
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-0">
                    {profileCompletion}% Complete
                  </Badge>
                </div>

                {/* Special Color Question UI */}
                {missingField.field === 'psychAssessment.color' && missingField.type === 'options' && missingField.options ? (
                  <div className="flex flex-wrap gap-4">
                    {missingField.options.map((option: string) => {
                      const colorHex = colorMap[option];
                      const isSelected = selectedOption === option;
                      const isSubmitting = submittingAnswer && isSelected;

                      return (
                        <button
                          key={option}
                          onClick={() => handleQuickAnswer(missingField.field, option)}
                          disabled={submittingAnswer}
                          title={option}
                        >
                          <div
                            className={`w-6 h-6 rounded-full transition-all duration-300 cursor-pointer ${
                              isSubmitting
                                ? 'scale-95 opacity-50'
                                : 'hover:scale-125 hover:shadow-lg'
                            } ${
                              isSelected && !isSubmitting
                                ? 'ring-2 ring-offset-2 ring-amber-400'
                                : ''
                            } disabled:cursor-not-allowed relative`}
                            style={{ backgroundColor: colorHex }}
                          >
                            {isSubmitting && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-3 h-3 text-white animate-spin" />
                              </div>
                            )}
                            {isSelected && !isSubmitting && (
                              <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-200">
                                <CheckCircle className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : missingField.field === 'psychAssessment.environment' && missingField.type === 'options' && missingField.options ? (
                  /* Special Environment Question UI with Emojis */
                  <div className="flex flex-wrap gap-6">
                    {missingField.options.map((option: string) => {
                      const emoji = environmentEmojiMap[option];
                      const isSelected = selectedOption === option;
                      const isSubmitting = submittingAnswer && isSelected;

                      return (
                        <button
                          key={option}
                          onClick={() => handleQuickAnswer(missingField.field, option)}
                          disabled={submittingAnswer}
                          title={option}
                          className={`text-3xl transition-all duration-300 ${
                            isSubmitting
                              ? 'scale-95 opacity-50'
                              : 'hover:scale-125'
                          } ${
                            isSelected && !isSubmitting
                              ? 'ring-2 ring-offset-2 ring-amber-400 rounded-lg p-1'
                              : ''
                          } disabled:cursor-not-allowed relative`}
                        >
                          {isSubmitting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            </div>
                          )}
                          {!isSubmitting && emoji}
                          {isSelected && !isSubmitting && (
                            <div className="absolute -top-1 -right-1">
                              <CheckCircle className="w-4 h-4 text-green-600 bg-white rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : missingField.field === 'psychAssessment.symbol' && missingField.type === 'options' && missingField.options ? (
                  /* Special Symbol Question UI with Emojis */
                  <div className="flex flex-wrap gap-6">
                    {missingField.options.map((option: string) => {
                      const emoji = symbolEmojiMap[option];
                      const isSelected = selectedOption === option;
                      const isSubmitting = submittingAnswer && isSelected;

                      return (
                        <button
                          key={option}
                          onClick={() => handleQuickAnswer(missingField.field, option)}
                          disabled={submittingAnswer}
                          title={option}
                          className={`text-3xl transition-all duration-300 ${
                            isSubmitting
                              ? 'scale-95 opacity-50'
                              : 'hover:scale-125'
                          } ${
                            isSelected && !isSubmitting
                              ? 'ring-2 ring-offset-2 ring-amber-400 rounded-lg p-1'
                              : ''
                          } disabled:cursor-not-allowed relative`}
                        >
                          {isSubmitting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            </div>
                          )}
                          {!isSubmitting && emoji}
                          {isSelected && !isSubmitting && (
                            <div className="absolute -top-1 -right-1">
                              <CheckCircle className="w-4 h-4 text-green-600 bg-white rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : missingField.field === 'psychAssessment.vibe' && missingField.type === 'options' && missingField.options ? (
                  /* Special Vibe Question UI with Emojis */
                  <div className="flex flex-wrap gap-6">
                    {missingField.options.map((option: string) => {
                      const emoji = vibeEmojiMap[option];
                      const isSelected = selectedOption === option;
                      const isSubmitting = submittingAnswer && isSelected;

                      return (
                        <button
                          key={option}
                          onClick={() => handleQuickAnswer(missingField.field, option)}
                          disabled={submittingAnswer}
                          title={option}
                          className={`text-3xl transition-all duration-300 ${
                            isSubmitting
                              ? 'scale-95 opacity-50'
                              : 'hover:scale-125'
                          } ${
                            isSelected && !isSubmitting
                              ? 'ring-2 ring-offset-2 ring-amber-400 rounded-lg p-1'
                              : ''
                          } disabled:cursor-not-allowed relative`}
                        >
                          {isSubmitting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            </div>
                          )}
                          {!isSubmitting && emoji}
                          {isSelected && !isSubmitting && (
                            <div className="absolute -top-1 -right-1">
                              <CheckCircle className="w-4 h-4 text-green-600 bg-white rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Regular Options for other fields */
                  missingField.type === 'options' && missingField.options && (
                    <div className="flex flex-wrap gap-2">
                      {missingField.options.map((option: string) => {
                        const isSelected = selectedOption === option;
                        const isSubmitting = submittingAnswer && isSelected;

                        return (
                          <Button
                            key={option}
                            size="sm"
                            variant="outline"
                            disabled={submittingAnswer}
                            onClick={() => handleQuickAnswer(missingField.field, option)}
                            className={`bg-white border-amber-300 hover:bg-amber-100 hover:border-amber-400 text-amber-900 transition-all duration-300 ${
                              isSelected ? 'ring-2 ring-amber-500 bg-amber-100' : ''
                            }`}
                          >
                            {isSubmitting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {isSelected && !isSubmitting && <CheckCircle className="w-3 h-3 mr-1 text-green-600" />}
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileBanner(false)}
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 flex-shrink-0"
                disabled={submittingAnswer}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-[28fr_72fr] gap-6">
          {/* Profile Sidebar - Left */}
          <div className="space-y-4">
            {/* Hero Profile Card */}
            <Card className="overflow-hidden shadow-md border border-slate-200 bg-white rounded">
              <CardContent className="p-6">
                {/* Profile Header with Completion Ring Around Avatar */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {/* Avatar with Completion Ring */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 transform -rotate-90 absolute inset-0">
                        <circle
                          cx="40"
                          cy="40"
                          r="38"
                          stroke="rgba(251,191,36,0.2)"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="38"
                          stroke="url(#gradient)"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 38}`}
                          strokeDashoffset={`${2 * Math.PI * 38 * (1 - calculateProfileCompletion(portalData.candidate) / 100)}`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#D97706" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(portalData.candidate.name)}`}
                        alt={portalData.candidate.name}
                        className="w-16 h-16 rounded-full absolute inset-0 m-auto"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 capitalize">{portalData.candidate.name}</h2>
                      <p className="text-sm text-amber-800">{portalData.candidate.jobTitle || 'Professional'}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {calculateProfileCompletion(portalData.candidate)}% Complete
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:bg-amber-100"
                    onClick={handleOpenEditModal}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                {/* Vibes Section - Enhanced with Color Display */}
                {portalData.candidate.psychAssessment && (
                  portalData.candidate.psychAssessment.animal ||
                  portalData.candidate.psychAssessment.color ||
                  portalData.candidate.psychAssessment.environment ||
                  portalData.candidate.psychAssessment.symbol
                ) && (
                  <div className="flex items-center gap-3 mb-3 transition-all duration-500">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Vibes:</span>
                    <div className="flex gap-4 items-center">
                      {portalData.candidate.psychAssessment.animal && (
                        <span className="text-2xl" title={portalData.candidate.psychAssessment.animal}>
                          {animalEmojiMap[portalData.candidate.psychAssessment.animal] || '🦁'}
                        </span>
                      )}
                      {portalData.candidate.psychAssessment.color && (
                        <div
                          className="w-8 h-8 rounded-full shadow-md border-2 border-white transition-all duration-500 animate-in fade-in zoom-in"
                          style={{ backgroundColor: colorMap[portalData.candidate.psychAssessment.color] || '#94a3b8' }}
                          title={portalData.candidate.psychAssessment.color}
                        />
                      )}
                      {portalData.candidate.psychAssessment.environment && (
                        <span className="text-2xl" title={portalData.candidate.psychAssessment.environment}>
                          {environmentEmojiMap[portalData.candidate.psychAssessment.environment] || '🌍'}
                        </span>
                      )}
                      {portalData.candidate.psychAssessment.symbol && (
                        <span className="text-2xl" title={portalData.candidate.psychAssessment.symbol}>
                          {symbolEmojiMap[portalData.candidate.psychAssessment.symbol] || '⭐'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Contact Info */}
                <div className="space-y-2 mb-4">
                  {portalData.candidate.location && (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
                        <path d="M237.33,106.21,61.41,41l-.16-.05A16,16,0,0,0,40.9,61.25a1,1,0,0,0,.05.16l65.26,175.92A15.77,15.77,0,0,0,121.28,248h.3a15.77,15.77,0,0,0,15-11.29l.06-.2,21.84-78,78-21.84.2-.06a16,16,0,0,0,.62-30.38ZM149.84,144.3a8,8,0,0,0-5.54,5.54L121.3,232l-.06-.17L56,56l175.82,65.22.16.06Z"></path>
                      </svg>
                      <p className="text-sm font-medium text-black uppercase">
                        {(() => {
                          const parts = portalData.candidate.location.split(',').map(p => p.trim());
                          if (parts.length >= 3) {
                            // Format: City, State, Country -> Show City, Country
                            return `${parts[0]}, ${parts[parts.length - 1]}`;
                          }
                          return portalData.candidate.location;
                        })()}
                      </p>
                    </div>
                  )}
                  {portalData.candidate.experience && (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
                        <path d="M196.12,128c24.65-34.61,37.22-70.38,19.74-87.86S162.61,35.23,128,59.88C93.39,35.23,57.62,22.66,40.14,40.14S35.23,93.39,59.88,128c-24.65,34.61-37.22,70.38-19.74,87.86h0c5.63,5.63,13.15,8.14,21.91,8.14,18.48,0,42.48-11.17,66-27.88C151.47,212.83,175.47,224,194,224c8.76,0,16.29-2.52,21.91-8.14h0C233.34,198.38,220.77,162.61,196.12,128Zm8.43-76.55c7.64,7.64,2.48,32.4-18.52,63.28a300.33,300.33,0,0,0-21.19-23.57A300.33,300.33,0,0,0,141.27,70C172.15,49,196.91,43.8,204.55,51.45ZM176.29,128a289.14,289.14,0,0,1-22.76,25.53A289.14,289.14,0,0,1,128,176.29a289.14,289.14,0,0,1-25.53-22.76A289.14,289.14,0,0,1,79.71,128A298.62,298.62,0,0,1,128,79.71a289.14,289.14,0,0,1,25.53,22.76A289.14,289.14,0,0,1,176.29,128ZM51.45,51.45c2.2-2.21,5.83-3.35,10.62-3.35C73.89,48.1,92.76,55,114.72,70A304,304,0,0,0,91.16,91.16,300.33,300.33,0,0,0,70,114.73C49,83.85,43.81,59.09,51.45,51.45Zm0,153.1C43.81,196.91,49,172.15,70,141.27a300.33,300.33,0,0,0,21.19,23.57A304.18,304.18,0,0,0,114.73,186C83.85,207,59.09,212.2,51.45,204.55Zm153.1,0c-7.64,7.65-32.4,2.48-63.28-18.52a304.18,304.18,0,0,0,23.57-21.19A300.33,300.33,0,0,0,186,141.27C207,172.15,212.19,196.91,204.55,204.55ZM140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Z"></path>
                      </svg>
                      <p className="text-sm font-medium text-black uppercase">
                        {portalData.candidate.experience === '0' ||
                         portalData.candidate.experience === '0 years' ||
                         portalData.candidate.experience.toLowerCase().includes('0 months') ||
                         portalData.candidate.experience.toLowerCase().includes('0 years') ? 'Fresher' : portalData.candidate.experience}
                      </p>
                    </div>
                  )}
                  {portalData.candidate.availableIn && (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256">
                        <path d="M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.6A16.05,16.05,0,0,0,200,75.64ZM72,40H184V75.64L178.23,80H77.33L72,76Zm56,78L98.67,96h58.4Zm56,98H72V180l48-36v24a8,8,0,0,0,16,0V144.08l48,36.28Z"></path>
                      </svg>
                      <p className="text-sm font-medium text-black uppercase">{portalData.candidate.availableIn}</p>
                    </div>
                  )}
                </div>

                {/* Quick Links - Horizontal Pills */}
                <div className="flex flex-wrap gap-2">
                  {portalData.candidate.linkedin ? (
                    <a
                      href={portalData.candidate.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-full text-xs font-medium text-blue-700 transition-all hover:scale-105 shadow-sm"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-full text-xs font-medium text-slate-400 cursor-not-allowed opacity-60">
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </div>
                  )}
                  {portalData.candidate.portfolioUrl ? (
                    <a
                      href={portalData.candidate.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-full text-xs font-medium text-purple-700 transition-all hover:scale-105 shadow-sm"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Portfolio
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-full text-xs font-medium text-slate-400 cursor-not-allowed opacity-60">
                      <Globe className="w-3.5 h-3.5" />
                      Portfolio
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interviews Section */}
          <div className="space-y-4">

            {/* Stats Dashboard - Compact Grid */}
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                <Card className="shadow-md border border-slate-200 rounded">
                  <CardContent className="py-6 px-4">
                    <div className="flex items-center gap-4">
                      <p className="text-3xl font-bold text-foreground">{enhancedInterviews.length}</p>
                      <p className="text-sm text-foreground-muted uppercase">TOTAL</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-md border border-slate-200 rounded">
                  <CardContent className="py-6 px-4">
                    <div className="flex items-center gap-4">
                      <p className="text-3xl font-bold text-foreground">{activeInterviews.length}</p>
                      <p className="text-sm text-foreground-muted uppercase">ACTIVE</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-md border border-slate-200 rounded">
                  <CardContent className="py-6 px-4">
                    <div className="flex items-center gap-4">
                      <p className="text-3xl font-bold text-foreground">
                        {completedInterviews.length}
                      </p>
                      <p className="text-sm text-foreground-muted uppercase">DONE</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Active Interviews Section */}
            <div className="space-y-6">
              {activeInterviews.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 mt-8 uppercase tracking-wider">Active Interviews</h2>
                  <div className="space-y-4 max-w-4xl">
                    {activeInterviews.map((interview, index) => {
                        const isPreliminary = interview.type === 'regular';
                        const interviewTypeLabel = isPreliminary ? 'Preliminary Interview' : 'Fitment Interview';

                        return (
                          <div key={interview.uniqueId} className="relative rounded-none p-8 pb-16 bg-black border border-amber-600/20 shadow-2xl h-60 overflow-hidden">
                            {/* Live Indicator */}
                            {interview.status.toLowerCase() === 'active' && (
                              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                                <span className="text-green-500 text-xs font-semibold uppercase" style={{ letterSpacing: '0.3em' }}>LIVE</span>
                              </div>
                            )}

                            <div className="relative z-10 flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-shrink-0 p-1.5 rounded-full border-2 border-slate-300/40 bg-slate-200/10">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256">
                                        <path d="M101.66,122.34a8,8,0,0,1,0,11.32l-32,32A8,8,0,0,1,56,160V136H16a8,8,0,0,1,0-16H56V96a8,8,0,0,1,13.66-5.66ZM240,120H200V96a8,8,0,0,0-13.66-5.66l-32,32a8,8,0,0,0,0,11.32l32,32A8,8,0,0,0,200,160V136h40a8,8,0,0,0,0-16ZM128,32a8,8,0,0,0-8,8V216a8,8,0,0,0,16,0V40A8,8,0,0,0,128,32Z"></path>
                                      </svg>
                                    </div>
                                    <p className="text-slate-200 text-base font-medium uppercase tracking-widest">
                                      {interviewTypeLabel}
                                    </p>
                                  </div>
                                  {interview.interviewDetails?.title && (
                                    <p className="text-white text-4xl font-light uppercase tracking-widest mb-3">
                                      {interview.interviewDetails.title}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm text-slate-300">
                                    {interview.interviewDetails?.duration && (
                                      <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256" className="opacity-90">
                                          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"></path>
                                        </svg>
                                        <span>{interview.interviewDetails.duration}min</span>
                                      </div>
                                    )}
                                  </div>
                                  {interview.interviewDetails?.applicant_count !== undefined && (
                                    <div className="flex items-center gap-2 text-sm mt-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256" className="opacity-90">
                                        <path d="M120,56a32,32,0,1,1,32,32A32,32,0,0,1,120,56Zm103.28,74.08a8,8,0,0,0-10.6-4c-.25.12-26.71,10.72-72.18-20.19-52.29-35.54-88-7.77-89.51-6.57a8,8,0,1,0,10,12.48c.26-.21,25.12-19.5,64.07,3.27-4.25,13.35-12.76,31.82-25.25,47-18.56,22.48-41.11,32.56-67,30A8,8,0,0,0,31.2,208a92.29,92.29,0,0,0,9.34.47c27.38,0,52-12.38,71.63-36.18.57-.69,1.14-1.4,1.69-2.1C133.31,175.29,168,190.3,168,232a8,8,0,0,0,16,0c0-24.65-10.08-45.35-29.15-59.86a104.29,104.29,0,0,0-31.31-15.81A169.31,169.31,0,0,0,139,124c26.14,16.09,46.84,20,60.69,20,12.18,0,19.06-3,19.67-3.28A8,8,0,0,0,223.28,130.08Z"></path>
                                      </svg>
                                      <span className="text-white font-semibold">{interview.interviewDetails.applicant_count}</span>
                                      <span className="text-slate-300 font-light">Applicants</span>
                                    </div>
                                  )}

                                  {/* Warning Message */}
                                  <div className="flex items-center gap-2 mt-4 text-xs text-amber-400/90">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" className="flex-shrink-0">
                                      <path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM120,136V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
                                    </svg>
                                    <span className="whitespace-nowrap">Interview cannot be retaken, once you have started the interview</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Continue Button - Bottom Right */}
                            <div className="absolute bottom-4 right-4 z-20">
                              {canStartInterview(interview.status, !!interview.interviewDetails?.completed_session) ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStartInterview(interview)}
                                  disabled={startingInterviewId === interview.interviewId}
                                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md hover:shadow-lg transition-all"
                                >
                                  {startingInterviewId === interview.interviewId ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      {getInterviewButtonText(interview.status, !!interview.interviewDetails?.active_session?.session_id, !!interview.interviewDetails?.completed_session)}
                                      <ArrowRight className="w-4 h-4 ml-1" />
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" disabled className="text-slate-400">
                                  {getInterviewButtonText(interview.status, !!interview.interviewDetails?.active_session?.session_id, !!interview.interviewDetails?.completed_session)}
                                  <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Completed Interviews Section */}
              {completedInterviews.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-black mb-4 mt-8 uppercase tracking-wider">Completed Interviews</h2>
                  <div className="space-y-4 max-w-4xl">
                    {completedInterviews.map((interview, index) => {
                        const isPreliminary = interview.type === 'regular';
                        const interviewTypeLabel = isPreliminary ? 'Preliminary Interview' : 'Fitment Interview';

                        return (
                          <div key={interview.uniqueId} className="relative rounded-none p-8 pb-16 bg-black border border-slate-600/20 shadow-2xl h-60 overflow-hidden opacity-60">
                            <div className="relative z-10 flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div>
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-shrink-0 p-1.5 rounded-full border-2 border-slate-300/40 bg-slate-200/10">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256">
                                        <path d="M101.66,122.34a8,8,0,0,1,0,11.32l-32,32A8,8,0,0,1,56,160V136H16a8,8,0,0,1,0-16H56V96a8,8,0,0,1,13.66-5.66ZM240,120H200V96a8,8,0,0,0-13.66-5.66l-32,32a8,8,0,0,0,0,11.32l32,32A8,8,0,0,0,200,160V136h40a8,8,0,0,0,0-16ZM128,32a8,8,0,0,0-8,8V216a8,8,0,0,0,16,0V40A8,8,0,0,0,128,32Z"></path>
                                      </svg>
                                    </div>
                                    <p className="text-slate-200 text-base font-medium uppercase tracking-widest">
                                      {interviewTypeLabel}
                                    </p>
                                  </div>
                                  {interview.interviewDetails?.title && (
                                    <p className="text-white text-4xl font-light uppercase tracking-widest mb-3">
                                      {interview.interviewDetails.title}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm text-slate-300">
                                    {interview.interviewDetails?.duration && (
                                      <div className="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256" className="opacity-90">
                                          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"></path>
                                        </svg>
                                        <span>{interview.interviewDetails.duration}min</span>
                                      </div>
                                    )}
                                  </div>
                                  {interview.interviewDetails?.applicant_count !== undefined && (
                                    <div className="flex items-center gap-2 text-sm mt-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ffffff" viewBox="0 0 256 256" className="opacity-90">
                                        <path d="M120,56a32,32,0,1,1,32,32A32,32,0,0,1,120,56Zm103.28,74.08a8,8,0,0,0-10.6-4c-.25.12-26.71,10.72-72.18-20.19-52.29-35.54-88-7.77-89.51-6.57a8,8,0,1,0,10,12.48c.26-.21,25.12-19.5,64.07,3.27-4.25,13.35-12.76,31.82-25.25,47-18.56,22.48-41.11,32.56-67,30A8,8,0,0,0,31.2,208a92.29,92.29,0,0,0,9.34.47c27.38,0,52-12.38,71.63-36.18.57-.69,1.14-1.4,1.69-2.1C133.31,175.29,168,190.3,168,232a8,8,0,0,0,16,0c0-24.65-10.08-45.35-29.15-59.86a104.29,104.29,0,0,0-31.31-15.81A169.31,169.31,0,0,0,139,124c26.14,16.09,46.84,20,60.69,20,12.18,0,19.06-3,19.67-3.28A8,8,0,0,0,223.28,130.08Z"></path>
                                      </svg>
                                      <span className="text-white font-semibold">{interview.interviewDetails.applicant_count}</span>
                                      <span className="text-slate-300 font-light">Applicants</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Completed Button - Bottom Right */}
                            <div className="absolute bottom-4 right-4 z-20">
                              <Button variant="ghost" size="sm" disabled className="text-slate-400">
                                Completed
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      <InterviewStatusModal
        status={modalStatus}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        recruiterContact={portalData.candidate.recruiterEmail || portalData.recruiter?.email}
        interviewTitle={modalInterviewTitle}
      />

      {/* Resume Modal Dialog */}
      <Dialog open={resumeModalOpen} onOpenChange={setResumeModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Resumes</DialogTitle>
            <DialogDescription>
              Manage all your uploaded resumes
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                {portalData.candidate.resumes?.length || 0} resume{(portalData.candidate.resumes?.length || 0) !== 1 ? 's' : ''} uploaded
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUploadClick}
                disabled={uploadingResume}
                className="h-8 text-xs bg-white hover:bg-amber-50 border-amber-300 text-amber-700 hover:text-amber-800"
              >
                {uploadingResume ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 mr-1" />
                    Upload New
                  </>
                )}
              </Button>
            </div>

            {portalData.candidate.resumes && portalData.candidate.resumes.length > 0 ? (
              <div className="space-y-3">
                {[...portalData.candidate.resumes].sort((a, b) =>
                  new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
                ).map((resume) => (
                  <div
                    key={resume.id}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 shadow-sm border border-amber-200 hover:shadow-md hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p
                              className="text-sm font-medium text-slate-900 truncate"
                              title={resume.filename}
                            >
                              {resume.filename}
                            </p>
                            {resume.isActive && (
                              <Badge className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatUploadDate(resume.uploadedAt)}
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(resume.fileSize)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={resume.gcsPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white hover:bg-amber-50 border border-amber-300 rounded-md transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                            {!resume.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetActiveResume(resume.id)}
                                disabled={settingActiveId === resume.id}
                                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                {settingActiveId === resume.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Setting...
                                  </>
                                ) : (
                                  'Set Active'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-8 border border-slate-200 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No resumes uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload your first resume to get started</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResumeModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information. Name, email, and phone cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Read-only fields */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-slate-500">
                Name
              </Label>
              <Input
                id="name"
                value={portalData.candidate.name}
                className="col-span-3 bg-slate-50"
                disabled
                readOnly
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-slate-500">
                Email
              </Label>
              <Input
                id="email"
                value={portalData.candidate.email}
                className="col-span-3 bg-slate-50"
                disabled
                readOnly
              />
            </div>

            {portalData.candidate.phone && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right text-slate-500">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={portalData.candidate.phone}
                  className="col-span-3 bg-slate-50"
                  disabled
                  readOnly
                />
              </div>
            )}

            {/* Editable fields */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-slate-700 mb-4">Editable Information</p>

              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="jobTitle" className="text-right">
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  value={editFormData.jobTitle}
                  onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <div className="col-span-3 relative">
                  <Input
                    id="location"
                    value={editFormData.location}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full"
                    placeholder="City, State"
                  />
                  {showLocationDropdown && locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {locationSuggestions.map((location, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm"
                          onClick={() => selectLocation(location)}
                        >
                          {location}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label className="text-right">
                  Experience
                </Label>
                <div className="col-span-3 flex gap-3 items-start">
                  <div className="w-24">
                    <Label htmlFor="experienceYears" className="text-xs text-slate-500 mb-1.5 block">
                      Years
                    </Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min="0"
                      value={editFormData.experienceYears}
                      onChange={(e) => setEditFormData({ ...editFormData, experienceYears: e.target.value })}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor="experienceMonths" className="text-xs text-slate-500 mb-1.5 block">
                      Months
                    </Label>
                    <Input
                      id="experienceMonths"
                      type="number"
                      min="0"
                      max="11"
                      value={editFormData.experienceMonths}
                      onChange={(e) => setEditFormData({ ...editFormData, experienceMonths: e.target.value })}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="availableIn" className="text-right">
                  Availability
                </Label>
                <Select
                  value={editFormData.availableIn}
                  onValueChange={(value) => setEditFormData({ ...editFormData, availableIn: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Immediate">Immediate</SelectItem>
                    <SelectItem value="< 2 weeks">{"< 2 weeks"}</SelectItem>
                    <SelectItem value="< 1 month">{"< 1 month"}</SelectItem>
                    <SelectItem value="< 2 months">{"< 2 months"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-4">
                <Label htmlFor="linkedin" className="text-right">
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={editFormData.linkedin}
                  onChange={(e) => setEditFormData({ ...editFormData, linkedin: e.target.value })}
                  className="col-span-3"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="portfolioUrl" className="text-right">
                  Portfolio
                </Label>
                <Input
                  id="portfolioUrl"
                  value={editFormData.portfolioUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, portfolioUrl: e.target.value })}
                  className="col-span-3"
                  placeholder="https://yourportfolio.com (optional)"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={updateProfile}
              disabled={isUpdating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}