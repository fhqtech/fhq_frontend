import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Clock, Calendar, Phone, Mail, MessageSquare, UserCheck, Upload, FileText, Target, Eye, Search, Play, Pause, Square, AlertTriangle, Filter, Copy, Check, CheckCircle, FileCheck, Settings, RefreshCw, Mic, Video, ChevronDown, ChevronRight, ChevronLeft, Download, Loader2 } from "lucide-react";
import { CloudArrowDown, CaretLeft } from "phosphor-react";
import googleLogo from "@/assets/google_logo.png";
import aiAvatar from "@/assets/ai-avatar.png";
import mountainsBg from "@/assets/moutains.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, Status } from "@/components/dashboard/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { checkBlueprintExists } from "@/services/blueprintService";
import { X } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shimmer, ShimmerCard, ShimmerTable, ShimmerInterviewConfig } from "@/components/ui/shimmer";
import { ArrowsOut, CircleNotch, ClockCounterClockwise, ArrowsClockwise } from "phosphor-react";
import { pauseInterview, stopInterview, resumeInterview } from "@/services/interviewControlService";
import { listsApi } from "@/services/listsApi";
import { qualifiedListsApi } from "@/services/qualifiedListsApi";
import { SwipeQRSection } from "@/components/interview/SwipeQRSection";
import { ShortlistActionCard } from "@/components/interview/ShortlistActionCard";
import { CandidateCard } from "@/components/interview/CandidateCard";
import { cn } from "@/lib/utils";
import { BlueprintViewModal } from "@/components/views/BlueprintViewModal";
import { NextBestActionCard } from "@/components/dashboard/NextBestActionCard";
import { computeInterviewNBA, type InterviewSnapshot, type InterviewStats as NBAStats } from "@/lib/nextBestAction";

// Counter animation component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let currentValue = 0;
    const duration = 800; // 800ms total animation
    const steps = Math.min(value, 20); // Max 20 steps
    const increment = value / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      currentValue += increment;
      if (currentValue >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(currentValue));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue}{suffix}</>;
}


// API functions for backend integration
const fetchInterviewData = async (workspaceId: string, projectId: string, interviewId: string) => {
  const data = await interviewApi.getInterviewConfiguration(workspaceId, projectId, interviewId);
  return data.interview || null;
};

const fetchCandidates = async (workspaceId: string, projectId: string, interviewId: string, page: number = 1, limit: number = 20) => {
  try {
    const data = await interviewApi.getInterviewCandidates(workspaceId, projectId, interviewId, page, limit);
    return {
      candidates: data.candidates || [],
      totalCandidates: data.totalCandidates || 0,
      totalPages: data.totalPages || 0,
      page: data.page || 1,
      limit: data.limit || 20
    };
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return {
      candidates: [],
      totalCandidates: 0,
      totalPages: 0,
      page: 1,
      limit: 20
    };
  }
};

const fetchInterviewStats = async (workspaceId: string, projectId: string, interviewId: string) => {
  try {
    const stats = await interviewApi.getInterviewStats(workspaceId, projectId, interviewId);
    console.log('📊 Stats API response:', stats);
    console.log('📊 Total candidates from stats:', stats?.totalCandidates);
    return stats || {};
  } catch (error) {
    console.error('❌ Stats API failed:', error);
    return {};
  }
};


// ViewResultButton component - Demo Mode
const ViewResultButton = ({ candidate, interviewId }: { candidate: any; interviewId: string }) => {
  const navigate = useNavigate();

  const handleViewDemoResult = () => {
    // Use candidate ID as session ID for demo navigation
    navigate(`/interview/${interviewId}/results/${candidate.id || 'demo-session'}`);
  };

  // Show demo result button for any candidate with an ID
  if (!candidate.id) {
    return <span className="text-foreground-muted text-sm">-</span>;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleViewDemoResult}
      className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
    >
      <Eye className="w-4 h-4" />
    </Button>
  );
};

// Helper function to format date in "21 September 2025" format
const formatCreatedDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

export default function InterviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

  // Main table filters
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState("");
  const [tableScoreFilter, setTableScoreFilter] = useState("");

  // Backend data state
  const [interview, setInterview] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [duplicateRecords, setDuplicateRecords] = useState<number>(0);
  // Separate loading states for each section
  const [loadingInterview, setLoadingInterview] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSources, setLoadingSources] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bumps on every SSE 'update' event from the backend; triggers a refetch
  // of interview + stats so the NBA card recomputes live.
  const [liveRevision, setLiveRevision] = useState(0);

  // Live updates via Server-Sent Events. Backend emits an 'update' event
  // whenever the interview's status / blueprintStatus / candidate counts /
  // participation rate change. We bump liveRevision to retrigger refetch.
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
    const url = `${apiBase}/api/interviews/${id}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.addEventListener('update', () => setLiveRevision((r) => r + 1));
    es.addEventListener('not_found', () => es.close());
    es.onerror = () => {
      // EventSource auto-reconnects on transient failures; close to avoid loops
      // if the server explicitly closes the stream (e.g. 401 / 404).
      if (es.readyState === EventSource.CLOSED) {
        // already closed
      }
    };
    return () => es.close();
  }, [id]);

  // Start interview modal states (similar to ManageInterviewsEnhanced)
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [startingProgress, setStartingProgress] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCandidates, setTotalCandidates] = useState(0);

  // Blueprint modal state
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);

  // Copy state for invitation links
  const [copiedCandidateId, setCopiedCandidateId] = useState<number | null>(null);

  // Expanded rows state for showing attempts
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Candidate sources state for sync feature
  const [candidateSources, setCandidateSources] = useState<any[]>([]);
  const [hasSharedLists, setHasSharedLists] = useState(false);
  const [hasQualifiedLists, setHasQualifiedLists] = useState(false);
  const [loadingCandidateSources, setLoadingCandidateSources] = useState(true);
  const [checkingSourceIds, setCheckingSourceIds] = useState<Set<string>>(new Set());
  const [syncingSourceIds, setSyncingSourceIds] = useState<Set<string>>(new Set());
  const [sourceUpdates, setSourceUpdates] = useState<Record<string, any>>({});

  // Helper function to format duration from seconds to mm:ss
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle row expansion
  const toggleRowExpansion = (candidateId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId);
    } else {
      newExpanded.add(candidateId);
    }
    setExpandedRows(newExpanded);
  };

  // Refresh candidates data
  const refreshCandidates = async () => {
    if (!id || !interview || interview.status === 'draft' || !currentWorkspace || !currentProject) return;

    try {
      setLoadingCandidates(true);
      const result = await fetchCandidates(currentWorkspace.id, currentProject.id, id, currentPage, pageSize);

      const mappedCandidates = result.candidates.map((candidate: any, index: number) => {
        console.log('🔍 Candidate data:', candidate);
        console.log('🔍 Attempts:', candidate.attempts);
        return {
          id: (currentPage - 1) * pageSize + index + 1,
          candidateId: candidate.candidateId || candidate.id,
          name: candidate.name || 'Unknown',
          email: candidate.email || '',
          phone: candidate.phone || '',
          status: mapBackendStatus(candidate.status),
          score: candidate.score !== undefined && candidate.score !== null ? candidate.score : null,
          humanScore: candidate.human_score !== undefined && candidate.human_score !== null ? candidate.human_score : null,
          completedAt: candidate.assessment_completed ? candidate.created_at : null,
          duration: candidate.duration || null,
          invitation_token: candidate.invitation_token || '',
          invitationLink: candidate.invitation_token ? `${import.meta.env.VITE_FRONTEND_BASE_URL || 'http://localhost:8080'}/register/${candidate.invitation_token}` : null,
          sessionId: candidate.session_id,
          attempts: candidate.attempts || [],
          // Profile fields
          jobTitle: candidate.jobTitle || '',
          role: candidate.role || '',
          experience: candidate.experience || '',
          location: candidate.location || '',
          availableIn: candidate.availableIn || '',
          linkedin: candidate.linkedin || '',
          portfolioUrl: candidate.portfolioUrl || '',
          profilePicture: candidate.profilePicture || '',
          session_status: candidate.session_status || 'no_session',
          swipe_decision: candidate.swipe_decision || null
        };
      });

      setCandidates(mappedCandidates);
      setTotalCandidates(result.totalCandidates);

      // Auto-expand rows with multiple attempts
      const candidatesWithAttempts = new Set(
        mappedCandidates
          .filter((c: any) => c.attempts && c.attempts.length > 0)
          .map((c: any) => c.id)
      );
      setExpandedRows(candidatesWithAttempts);

      toast({
        title: "Candidates Refreshed",
        description: "Candidate data has been updated successfully"
      });
    } catch (err) {
      console.error('Error refreshing candidates:', err);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh candidate data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Blueprint state management
  const [blueprintExists, setBlueprintExists] = useState<boolean | null>(null);
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [isCheckingBlueprint, setIsCheckingBlueprint] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [blueprintStatus, setBlueprintStatus] = useState<string | null>(null); // "generating" | "completed" | "failed"
  const [blueprintError, setBlueprintError] = useState<string | null>(null);

  // Load interview data
  useEffect(() => {
    const loadInterviewData = async () => {
      if (!id || !currentWorkspace || !currentProject) return;

      try {
        setLoadingInterview(true);
        setError(null);

        const interviewData = await fetchInterviewData(currentWorkspace.id, currentProject.id, id);

        if (interviewData) {
          const mappedInterview = {
            id: interviewData.id || id,
            title: interviewData.title || 'Interview',
            type: interviewData.type || 'General',
            created: interviewData.createdAt ? formatCreatedDate(interviewData.createdAt) : formatCreatedDate(new Date().toISOString()),
            status: interviewData.status || 'draft',
            duration: interviewData.duration ? `${interviewData.duration} min` : '30 min',
            voiceType: interviewData.voiceType || 'Professional',
            description: interviewData.description || 'Interview assessment',
            candidateCount: interviewData.candidateCount || interviewData.candidates || 0,
            lists: interviewData.lists || interviewData.listIds || [],
            template_id: interviewData.templateId, // Template ID from backend
            template_source: interviewData.template_source, // Track if template is from control_tower or project
            communications: {
              email: interviewData.communications?.email || false,
              phone: interviewData.communications?.phone || false,
              sms: interviewData.communications?.sms || false
            }
          };

          setInterview(mappedInterview);

          // Extract blueprint status from interview data
          if (interviewData.blueprintStatus) {
            setBlueprintStatus(interviewData.blueprintStatus);
            setBlueprintError(interviewData.blueprintError || null);
            console.log('Blueprint status:', interviewData.blueprintStatus, 'Error:', interviewData.blueprintError);
          }
        } else {
          setError('Interview not found');
        }
      } catch (err) {
        console.error('Error loading interview:', err);
        setError('Failed to load interview data');
      } finally {
        setLoadingInterview(false);
      }
    };

    loadInterviewData();
  }, [id, currentWorkspace, currentProject, liveRevision]);

  // Load stats data
  useEffect(() => {
    const loadStatsData = async () => {
      if (!id || !currentWorkspace || !currentProject) return;

      try {
        setLoadingStats(true);
        const statsData = await fetchInterviewStats(currentWorkspace.id, currentProject.id, id);
        console.log('📊 Setting stats state to:', statsData);
        setStats(statsData);
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStatsData();
  }, [id, currentWorkspace, currentProject, liveRevision]);



  // Load candidate sources for this interview
  useEffect(() => {
    const loadCandidateSources = async () => {
      if (!interview) {
        setLoadingCandidateSources(false);
        return;
      }

      try {
        setLoadingCandidateSources(true);
        const token = localStorage.getItem('auth_token');

        // Use list IDs from interview object (already loaded from first API call)
        const listIds = interview.lists || [];
        console.log('📋 Using list IDs from interview state:', listIds);

        if (listIds.length === 0) {
          console.log('⚠️ No listIds found in interview');
          setCandidateSources([]);
          setLoadingCandidateSources(false);
          return;
        }

        if (!currentWorkspace || !currentProject) {
          console.log('⚠️ No workspace or project selected');
          setCandidateSources([]);
          setLoadingCandidateSources(false);
          return;
        }

        // For each list, get its sources
        const allSources: any[] = [];
        let foundSharedList = false;
        let foundQualifiedList = false;

        for (const listId of listIds) {
          try {
            // First, try to get the list from regular lists
            const sources = await listsApi.getListSources(currentWorkspace.id, currentProject.id, listId);
            const googleSheetSources = sources.filter((s: any) => s.type === 'google_sheet');

            allSources.push(...googleSheetSources.map((s: any) => ({ ...s, listId })));

            // If no sources found but interview has candidates, check if it's a qualified or shared list
            if (sources.length === 0 && interview?.candidateCount > 0) {
              // Try to fetch from qualified lists
              try {
                await qualifiedListsApi.getQualifiedList(currentWorkspace.id, currentProject.id, listId);
                foundQualifiedList = true;
                console.log(`📋 List ${listId} is a qualified/curated list`);
              } catch (qualifiedErr) {
                // Not a qualified list, must be a shared list
                foundSharedList = true;
                console.log(`📋 List ${listId} is a shared list`);
              }
            }
          } catch (err) {
            console.error(`Error loading sources for list ${listId}:`, err);
            // If API call fails, try to determine if it's qualified or shared
            if (interview?.candidateCount > 0) {
              try {
                await qualifiedListsApi.getQualifiedList(currentWorkspace.id, currentProject.id, listId);
                foundQualifiedList = true;
              } catch {
                foundSharedList = true;
              }
            }
          }
        }

        setHasSharedLists(foundSharedList);
        setHasQualifiedLists(foundQualifiedList);
        setCandidateSources(allSources);
        console.log('✅ Loaded candidate sources:', allSources, 'Has shared lists:', foundSharedList, 'Has qualified lists:', foundQualifiedList);
      } catch (error) {
        console.error('❌ Error loading candidate sources:', error);
        setCandidateSources([]);
      } finally {
        setLoadingCandidateSources(false);
      }
    };

    console.log('🔍 Loading candidate sources - Interview status:', interview?.status, 'Interview ID:', id);
    loadCandidateSources();
  }, [id, interview]);

  // Handler to check for new candidates
  const handleCheckForNewCandidates = async (source: any) => {
    if (!currentWorkspace || !currentProject) return null;

    try {
      setCheckingSourceIds(prev => new Set(prev).add(source.id));

      const result = await listsApi.checkSourceForNewCandidatesProjectList(currentWorkspace.id, currentProject.id, source.listId, source.id);

      setSourceUpdates(prev => ({
        ...prev,
        [source.id]: result
      }));

      if (result.hasNew) {
        toast({
          title: "Updates Available",
          description: `${result.newRows} new candidates found in sheet`
        });
      } else {
        toast({
          title: "No Updates",
          description: "Sheet is up to date"
        });
      }

      return result; // Return result for chaining
    } catch (error: any) {
      console.error('Error checking for new candidates:', error);
      toast({
        title: "Check Failed",
        description: error.message || "Failed to check for updates",
        variant: "destructive"
      });
      return null;
    } finally {
      setCheckingSourceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(source.id);
        return newSet;
      });
    }
  };

  // Handler to sync new candidates
  const handleSyncNewCandidates = async (source: any) => {
    if (!currentWorkspace || !currentProject) return;

    try {
      setSyncingSourceIds(prev => new Set(prev).add(source.id));

      const result = await listsApi.syncNewCandidatesFromProjectListSource(currentWorkspace.id, currentProject.id, source.listId, source.id);

      // Clear the update status for this source
      setSourceUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[source.id];
        return newUpdates;
      });

      console.log('✅ Sync result:', result);

      toast({
        title: "Sync Complete",
        description: result.message
      });

      // Refresh all data to update counts everywhere
      if (result.addedCandidates > 0 && id) {
        console.log(`🔄 Refreshing data after adding ${result.addedCandidates} candidates...`);

        // Wait for Firestore to complete the update (5 seconds for eventual consistency)
        console.log('⏳ Waiting 5 seconds for Firestore to sync...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('🔄 Reloading page...');
        window.location.reload();
        return; // Exit early since page will reload

        if (!currentWorkspace || !currentProject) {
          throw new Error('No workspace or project selected');
        }

        const token = localStorage.getItem('auth_token');

        // Reload interview data to update candidateCount
        const interviewData = await fetchInterviewData(currentWorkspace.id, currentProject.id, id);
        console.log('📊 Reloaded interview data:', interviewData);
        if (interviewData) {
          setInterview({
            id: interviewData.id,
            candidateCount: interviewData.candidateCount || interviewData.candidates || 0,
            communications: interviewData.communications || { email: false, phone: false, sms: false },
            status: interviewData.status || 'draft',
            type: interviewData.type,
            voiceType: interviewData.voiceType,
            duration: interviewData.duration,
            blueprintStatus: interviewData.blueprintStatus,
            listIds: interviewData.listIds || []
          });
        }

        // Reload stats
        const statsData = await fetchInterviewStats(currentWorkspace.id, currentProject.id, id);
        console.log('📈 Reloaded stats:', statsData);
        setStats(statsData);

        // Update total candidates count
        if (statsData?.totalCandidates) {
          console.log(`✅ Setting totalCandidates from stats: ${statsData.totalCandidates}`);
          setTotalCandidates(statsData.totalCandidates);
        } else if (interviewData?.candidateCount) {
          console.log(`✅ Setting totalCandidates from interview: ${interviewData.candidateCount}`);
          setTotalCandidates(interviewData.candidateCount);
        }

        // Reload candidate sources to update counts
        try {
          if (currentWorkspace && currentProject) {
            const listIds = interviewData?.listIds || interview?.listIds || [];
            const allSources: any[] = [];
            for (const listId of listIds) {
              try {
                const sources = await listsApi.getListSources(currentWorkspace.id, currentProject.id, listId);
                const googleSheetSources = sources.filter((s: any) => s.type === 'google_sheet');
                allSources.push(...googleSheetSources.map((s: any) => ({ ...s, listId })));
              } catch (err) {
                console.error(`Error loading sources for list ${listId}:`, err);
              }
            }
            setCandidateSources(allSources);
          }
        } catch (err) {
          console.error('Error reloading candidate sources:', err);
        }

        // Refresh candidates table if interview is active
        if (interviewData?.status !== 'draft') {
          await refreshCandidates();
        }
      }
    } catch (error: any) {
      console.error('Error syncing new candidates:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync new candidates",
        variant: "destructive"
      });
    } finally {
      setSyncingSourceIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(source.id);
        return newSet;
      });
    }
  };

  // Check if blueprint exists
  useEffect(() => {
    const checkBlueprint = async () => {
      if (!id || !currentWorkspace || !currentProject) return;

      try {
        setIsCheckingBlueprint(true);
        const result = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
        setBlueprintExists(result.exists);
        if (result.exists && result.blueprint) {
          setBlueprintData(result.blueprint);
        }
      } catch (err) {
        console.error('Error checking blueprint:', err);
        setBlueprintExists(false); // Assume doesn't exist on error
      } finally {
        setIsCheckingBlueprint(false);
      }
    };

    checkBlueprint();
  }, [id, currentWorkspace, currentProject, liveRevision]);

  // Auto-refresh blueprint status when generating
  useEffect(() => {
    if (blueprintStatus !== 'generating' || !id) return;

    console.log('📡 Starting auto-refresh for blueprint status (generating)');

    const pollInterval = setInterval(async () => {
      try {
        if (!currentWorkspace || !currentProject) return;

        console.log('🔄 Polling blueprint status...');
        const interviewData = await fetchInterviewData(currentWorkspace.id, currentProject.id, id);

        if (interviewData && interviewData.blueprintStatus) {
          const newStatus = interviewData.blueprintStatus;
          console.log('📊 Blueprint status update:', newStatus);

          setBlueprintStatus(newStatus);
          setBlueprintError(interviewData.blueprintError || null);

          // Stop polling when status changes to completed or failed
          if (newStatus === 'completed' || newStatus === 'failed') {
            console.log('✅ Blueprint generation finished:', newStatus);
            clearInterval(pollInterval);

            // Show toast notification
            if (newStatus === 'completed') {
              toast({
                title: "Blueprint Ready",
                description: "Interview blueprint has been generated successfully!",
              });
              // Refresh blueprint data
              if (!currentWorkspace || !currentProject) return;
              const result = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
              setBlueprintExists(result.exists);
              if (result.exists && result.blueprint) {
                setBlueprintData(result.blueprint);
              }
            } else if (newStatus === 'failed') {
              toast({
                title: "Blueprint Generation Failed",
                description: "Please update the job description with more specific details and try again.",
                variant: "destructive",
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling blueprint status:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Cleanup on unmount or status change
    return () => {
      console.log('🛑 Stopping blueprint status polling');
      clearInterval(pollInterval);
    };
  }, [blueprintStatus, id]);

  // Check blueprint again (retry)
  const handleCheckBlueprint = async () => {
    if (!id || !currentWorkspace || !currentProject) return;

    try {
      setIsCheckingBlueprint(true);
      const result = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
      setBlueprintExists(result.exists);
      if (result.exists && result.blueprint) {
        setBlueprintData(result.blueprint);
      }
    } catch (err) {
      console.error('Error checking blueprint:', err);
      setBlueprintExists(false);
    } finally {
      setIsCheckingBlueprint(false);
    }
  };

  // Regenerate blueprint handler
  const [isRegeneratingBlueprint, setIsRegeneratingBlueprint] = useState(false);

  const handleRegenerateBlueprint = async () => {
    if (!id || !interview || !currentWorkspace || !currentProject) return;

    // Confirm before regenerating
    const confirmed = window.confirm('Regenerate blueprint? This will replace the existing blueprint.');
    if (!confirmed) return;

    try {
      setIsRegeneratingBlueprint(true);

      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

      const response = await fetch(`${API_BASE_URL}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/generate-blueprint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: interview.id,
          title: interview.title,
          description: interview.description || '',
          type: interview.type || 'General Assessment',
          duration: interview.duration?.replace(' min', '') || '45'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate blueprint');
      }

      toast({
        title: "Blueprint Regenerated",
        description: "Interview blueprint has been successfully regenerated.",
      });

      // Refresh blueprint data
      await handleCheckBlueprint();

    } catch (error) {
      console.error('Blueprint regeneration error:', error);
      toast({
        title: "Regeneration Failed",
        description: error instanceof Error ? error.message : 'Failed to regenerate blueprint',
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingBlueprint(false);
    }
  };

  // Load candidates data with pagination - only when interview starts
  useEffect(() => {
    const loadCandidatesData = async () => {
      if (!id || !interview || interview.status === 'draft' || !currentWorkspace || !currentProject) {
        setLoadingCandidates(false);
        return;
      }

      try {
        setLoadingCandidates(true);
        const result = await fetchCandidates(currentWorkspace.id, currentProject.id, id, currentPage, pageSize);

        const mappedCandidates = result.candidates.map((candidate: any, index: number) => {
          console.log('🔍 Candidate data (loadCandidatesData):', candidate);
          console.log('🔍 Attempts:', candidate.attempts);
          if (candidate.attempts && candidate.attempts.length > 0) {
            candidate.attempts.forEach((attempt: any, idx: number) => {
              console.log(`🔍 Attempt ${idx + 1} data:`, attempt);
              console.log(`🔍 Attempt ${idx + 1} rating:`, attempt.rating);
            });
          }
          return {
            id: (currentPage - 1) * pageSize + index + 1,
            candidateId: candidate.candidateId || candidate.id,
            name: candidate.name || 'Unknown',
            email: candidate.email || '',
            phone: candidate.phone || '',
            status: mapBackendStatus(candidate.status),
            score: candidate.score !== undefined && candidate.score !== null ? candidate.score : null,
            humanScore: candidate.human_score !== undefined && candidate.human_score !== null ? candidate.human_score : null,
            completedAt: candidate.assessment_completed ? candidate.created_at : null,
            duration: candidate.duration || null,
            invitation_token: candidate.invitation_token || '',
            invitationLink: candidate.invitation_token ? `${import.meta.env.VITE_FRONTEND_BASE_URL || 'http://localhost:8080'}/register/${candidate.invitation_token}` : null,
            sessionId: candidate.session_id,
            attempts: candidate.attempts || [],
            // Profile fields
            jobTitle: candidate.jobTitle || '',
            role: candidate.role || '',
            experience: candidate.experience || '',
            location: candidate.location || '',
            availableIn: candidate.availableIn || '',
            linkedin: candidate.linkedin || '',
            portfolioUrl: candidate.portfolioUrl || '',
            profilePicture: candidate.profilePicture || '',
            session_status: candidate.session_status || 'no_session',
            swipe_decision: candidate.swipe_decision || null
          };
        });

        setCandidates(mappedCandidates);
        setTotalCandidates(result.totalCandidates);
      } catch (err) {
        console.error('Error loading candidates:', err);
      } finally {
        setLoadingCandidates(false);
      }
    };

    loadCandidatesData();
  }, [id, interview?.status, currentPage, pageSize]);

  // Map backend status to frontend status
  const mapBackendStatus = (backendStatus: string): Status => {
    const statusMap: Record<string, Status> = {
      'pending': 'pending',
      'invited': 'pending',
      'link_clicked': 'link_clicked', 
      'registered': 'registered',
      'linked_to_existing': 'link_clicked',
      'completed': 'completed',
      'in_progress': 'in-progress'
    };
    return statusMap[backendStatus] || 'pending';
  };

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground">Interview Not Found</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={() => navigate("/interviews/manage")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Interviews
        </Button>
      </div>
    );
  }

  // Interview control functions
  const handleStartInterview = async () => {
    console.log('🚀 Start Interview clicked', { interview: interview?.title, id, modalOpen: startModalOpen });
    if (!interview || !id) return;

    // Open modal and start the process
    setStartModalOpen(true);
    setIsStartingInterview(true);

    try {
      if (!currentWorkspace || !currentProject) {
        throw new Error('No workspace or project selected');
      }

      // Step 1: Check if blueprint exists
      setStartingProgress("Checking interview blueprint...");
      const blueprintCheck = await checkBlueprintExists(currentWorkspace.id, currentProject.id, id);
      console.log('Blueprint check result:', blueprintCheck);
      console.log('Blueprint check type:', typeof blueprintCheck);
      console.log('Blueprint check.exists:', blueprintCheck.exists);

      if (!blueprintCheck || !blueprintCheck.exists) {
        setStartingProgress("Error: Interview blueprint not found. Please ensure blueprint is generated first.");
        toast({
          title: "Blueprint Missing",
          description: "Interview blueprint not found. Please ensure blueprint is generated before starting the interview.",
          variant: "destructive"
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Initializing
      setStartingProgress("Initializing interview settings...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 3: Fetching candidates
      setStartingProgress("Loading candidate information...");
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 4: Generating invitations
      setStartingProgress("Generating invitation links...");
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/${id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Step 5: Finalizing
        setStartingProgress("Finalizing interview activation...");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update interview state immediately if we got updated data
        if (data.updated_interview) {
          setInterview(prev => prev ? { ...prev, status: 'active', ...data.updated_interview } : null);
        } else {
          // Fallback to update status
          setInterview(prev => prev ? { ...prev, status: 'active' } : null);
        }
        
        // Show success state briefly before closing
        setStartingProgress("Interview started successfully!");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setStartModalOpen(false);
        setStartingProgress("");
        
        toast({
          title: "Interview Started!",
          description: `${data.total_invitations_created || ''} invitation links generated for "${interview.title}"`
        });
      } else {
        // Don't close modal on error - show error message instead
        setStartingProgress(`Error: ${data.error || "Failed to start interview"}`);
        toast({
          title: "Error Starting Interview",
          description: data.error || "Failed to start interview",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Don't close modal on error - show error message instead  
      setStartingProgress("Error: Failed to start interview. Please try again.");
      toast({
        title: "Error",
        description: "Failed to start interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStartingInterview(false);
      // Don't reset these on error - keep modal open
    }
  };

  const handlePauseInterview = async () => {
    if (isUpdatingStatus || !currentWorkspace || !currentProject) return;

    setIsUpdatingStatus(true);
    try {
      await pauseInterview(currentWorkspace.id, currentProject.id, id!);

      // Update local state
      setInterview(prev => prev ? { ...prev, status: 'paused' } : null);

      toast({
        title: "Interview Paused",
        description: "Interview has been paused successfully",
      });
    } catch (error) {
      console.error('Failed to pause interview:', error);
      toast({
        title: "Error",
        description: "Failed to pause interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStopInterview = async () => {
    if (isUpdatingStatus || !currentWorkspace || !currentProject) return;

    setIsUpdatingStatus(true);
    try {
      await stopInterview(currentWorkspace.id, currentProject.id, id!);

      // Update local state
      setInterview(prev => prev ? { ...prev, status: 'stopped' } : null);

      toast({
        title: "Interview Stopped",
        description: "Interview has been stopped permanently",
      });
    } catch (error) {
      console.error('Failed to stop interview:', error);
      toast({
        title: "Error",
        description: "Failed to stop interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResumeInterview = async () => {
    if (isUpdatingStatus || !currentWorkspace || !currentProject) return;

    setIsUpdatingStatus(true);
    try {
      await resumeInterview(currentWorkspace.id, currentProject.id, id!);

      // Update local state
      setInterview(prev => prev ? { ...prev, status: 'active' } : null);

      toast({
        title: "Interview Resumed",
        description: "Interview has been resumed successfully",
      });
    } catch (error) {
      console.error('Failed to resume interview:', error);
      toast({
        title: "Error",
        description: "Failed to resume interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Use stats from API if available, otherwise calculate from candidates array
  const completedCandidates = candidates.filter(c => c.status === "completed");
  const eligibleForShortlist = completedCandidates.filter(c => c.score && c.score >= 75);
  const participationRate = candidates.length > 0 ? Math.round((candidates.filter(c => c.status !== "pending").length / candidates.length) * 100) : 0;

  // Prefer stats from API for display
  const displayTotalCandidates = stats?.totalCandidates ?? totalCandidates;
  const displayCompletedCandidates = stats?.completedCandidates ?? completedCandidates.length;
  const displayEligibleForFitment = stats?.eligibleForFitment ?? eligibleForShortlist.length;
  const displayParticipationRate = stats?.participationRate ?? participationRate;

  // Debug logging
  console.log('🎯 Display values:', {
    stats,
    'stats.totalCandidates': stats?.totalCandidates,
    totalCandidates,
    displayTotalCandidates,
    displayCompletedCandidates,
    displayEligibleForFitment,
    displayParticipationRate
  });
  
  // Calculate total duplicates from candidate sources
  const totalDuplicates = 0; // Removed candidate sources API call

  // Filter candidates for main table (client-side filtering on current page only)
  const filteredCandidatesForTable = candidates.filter(candidate => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(tableSearchQuery.toLowerCase());

    const matchesStatus = tableStatusFilter === "all" || !tableStatusFilter || candidate.status === tableStatusFilter;

    const matchesScore = (() => {
      if (!tableScoreFilter || tableScoreFilter === "all") return true;
      if (!candidate.score) return tableScoreFilter === "no-score";

      switch (tableScoreFilter) {
        case "high": return candidate.score >= 90;
        case "good": return candidate.score >= 75 && candidate.score < 90;
        case "fair": return candidate.score >= 60 && candidate.score < 75;
        case "low": return candidate.score < 60;
        default: return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesScore;
  });

  // Backend handles pagination, so we use filtered candidates directly
  const paginatedCandidates = filteredCandidatesForTable;

  const uniqueStatusesForTable = [...new Set(candidates.map(c => c.status))];

  const handleCandidateSelect = (candidateId: number, checked: boolean) => {
    setSelectedCandidates(prev => 
      checked 
        ? [...prev, candidateId]
        : prev.filter(id => id !== candidateId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedCandidates(checked ? eligibleForShortlist.map(c => c.id) : []);
  };

  const handleAutoShortlist = () => {
    // Auto-select candidates based on transcript analysis (score >= 75%)
    setSelectedCandidates(eligibleForShortlist.map(c => c.id));
    toast({
      title: "Candidates Auto-Shortlisted",
      description: `${eligibleForShortlist.length} candidates automatically shortlisted based on transcript analysis (score ≥ 75%).`,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success font-bold";
    if (score >= 80) return "text-info font-semibold";
    if (score >= 70) return "text-warning font-medium";
    return "text-error font-medium";
  };

  const copyInvitationLink = async (candidateId: number, invitationLink: string) => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedCandidateId(candidateId);
      toast({
        title: "Link Copied",
        description: "Invitation link has been copied to clipboard"
      });
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedCandidateId(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy invitation link to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-50 bg-background border-b border-border pb-4 pt-4 -mt-4 mb-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/interviews/manage")}
            className="flex items-center gap-2 rounded-sm uppercase font-bold mt-1"
          >
            <CaretLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            {loadingInterview ? (
              <div className="space-y-2">
                <Shimmer className="h-8 w-64" />
                <Shimmer className="h-4 w-96" />
              </div>
            ) : (
              <>
                <h1 className="text-4xl font-bold text-foreground uppercase tracking-widest mb-2">{interview?.title}</h1>
                <p className="text-foreground text-sm font-semibold uppercase tracking-wider mt-1">
                  #{id}
                </p>
                <p className="text-foreground-muted text-[10px] uppercase tracking-wider mt-0.5">
                  Created on {interview?.created}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Next Best Action — single CTA driven by interview state */}
      {interview && (
        <NextBestActionCard
          nba={computeInterviewNBA(
            {
              id: interview.id ?? id ?? '',
              status: interview.status,
              candidateCount: stats?.totalCandidates ?? candidates.length,
              blueprintStatus: blueprintStatus ?? interview.blueprintStatus,
              startedAt: interview.startedAt,
            } as InterviewSnapshot,
            {
              totalCandidates: stats?.totalCandidates ?? candidates.length,
              completedCandidates: stats?.completedCandidates ?? completedCandidates.length,
              participationRate: stats?.participationRate ?? participationRate,
            } as NBAStats,
          )}
          onAddCandidates={() => navigate(`/interviews/create?edit=${id}`)}
          onStart={handleStartInterview}
          onShare={async () => {
            try {
              const url = `${window.location.origin}/swipe/${id}`;
              await navigator.clipboard.writeText(url);
              toast({ title: 'Invite link copied', description: url });
            } catch {
              toast({ title: 'Copy failed', description: 'Try again or copy from the address bar.', variant: 'destructive' });
            }
          }}
        />
      )}

      {/* Overview Cards - Compact & Translucent */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div
          className="rounded-sm p-6 bg-white transition-shadow duration-200"
          style={{
            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
          }}
        >
          {loadingStats ? (
            <ShimmerCard />
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={displayTotalCandidates} />
              </p>
              <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
                <div>Total</div>
                <div>Candidates</div>
              </div>
            </div>
          )}
        </div>

        {/* Completed */}
        <div
          className="rounded-sm p-6 bg-white transition-shadow duration-200"
          style={{
            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
          }}
        >
          {loadingStats ? (
            <ShimmerCard />
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={displayCompletedCandidates} />
              </p>
              <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
                <div>Completed</div>
              </div>
            </div>
          )}
        </div>

        {/* Eligible for Fitment */}
        <div
          className="rounded-sm p-6 bg-white transition-shadow duration-200"
          style={{
            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
          }}
        >
          {loadingStats ? (
            <ShimmerCard />
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={displayEligibleForFitment} />
              </p>
              <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
                <div>Eligible for</div>
                <div>Fitment</div>
              </div>
            </div>
          )}
        </div>

        {/* Participation Rate */}
        <div
          className="rounded-sm p-6 bg-white transition-shadow duration-200"
          style={{
            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
          }}
        >
          {loadingStats ? (
            <ShimmerCard />
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-foreground">
                <AnimatedCounter value={displayParticipationRate} suffix="%" />
              </p>
              <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
                <div>Participation</div>
                <div>Rate</div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Interview Configuration */}
      <div
        className="rounded-sm bg-white"
        style={{
          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
        }}
      >
        <div className="px-6 py-5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={aiAvatar} alt="AI" className="w-10 h-10 rounded-full" />
              <div>
                <h3 className="text-lg font-semibold uppercase tracking-wider">Interview Configuration</h3>
                <p className="text-[10px] text-foreground-muted mt-1 uppercase tracking-wider">Current settings and interview blueprint</p>
              </div>
            </div>

            {/* Blueprint and Control Buttons Row */}
            <div className="flex items-center gap-4">
              {/* Interview Blueprint - Compact Version */}
              {!loadingInterview && interview && (
                <div className="flex items-center">
                  {/* Blueprint exists - show View and Regenerate buttons */}
                  {blueprintExists === true && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-sm">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">Blueprint Ready</span>
                      <Button
                        type="button"
                        onPointerDown={(e) => {
                          console.log('[VIEW Button] PointerDown', { tid: interview?.template_id, id: interview?.id, ws: currentWorkspace?.id });
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[VIEW Button] Clicked! Template ID:', interview?.template_id, 'Interview ID:', interview?.id, 'Workspace ID:', currentWorkspace?.id);
                          setShowBlueprintModal(true);
                        }}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs h-7 rounded-sm uppercase font-bold relative z-[60] pointer-events-auto"
                      >
                        View
                      </Button>
                      {/* Hide Regenerate button only for Control Tower templates (read-only) */}
                      {interview.template_source !== 'control_tower' && (
                        <Button
                          onClick={handleRegenerateBlueprint}
                          size="sm"
                          disabled={isRegeneratingBlueprint}
                          className="bg-gray-600 hover:bg-gray-700 px-3 py-1 text-xs h-7 rounded-sm uppercase font-medium"
                        >
                          {isRegeneratingBlueprint ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Regenerate
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Blueprint Status - New Status Tracking */}
                  {blueprintStatus === 'generating' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-sm">
                      <CircleNotch className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">Blueprint Generating...</span>
                    </div>
                  )}

                  {blueprintStatus === 'failed' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">Blueprint Failed</span>
                      <Button
                        onClick={() => navigate(`/create-interview?edit=${id}`)}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 px-2 py-1 text-xs h-6 rounded-sm uppercase font-bold"
                      >
                        Fix Description
                      </Button>
                    </div>
                  )}

                  {/* Blueprint doesn't exist - show Check and Regenerate buttons */}
                  {blueprintExists === false && (!blueprintStatus || blueprintStatus === 'completed') && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-sm">
                      <Settings className="w-3.5 h-3.5 text-yellow-600" />
                      <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">Blueprint Not Found</span>
                      <Button
                        onClick={handleCheckBlueprint}
                        size="sm"
                        disabled={isCheckingBlueprint}
                        className="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 text-xs h-6 rounded-sm uppercase font-bold"
                      >
                        {isCheckingBlueprint ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          'Check Again'
                        )}
                      </Button>
                      <Button
                        onClick={handleRegenerateBlueprint}
                        size="sm"
                        disabled={isRegeneratingBlueprint}
                        className="bg-blue-600 hover:bg-blue-700 px-2 py-1 text-xs h-6 rounded-sm uppercase font-bold"
                      >
                        {isRegeneratingBlueprint ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          'Regenerate'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Loading - initial check */}
                  {blueprintExists === null && !blueprintStatus && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm">
                      <Settings className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                      <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">Checking...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Interview Control Buttons */}
              {!loadingInterview && interview && (
                <div className="flex gap-2">
                {interview.status === 'draft' && (
                  <Button onClick={handleStartInterview} className="bg-green-600 hover:bg-green-700 rounded-sm uppercase font-bold text-xs h-9 px-4">
                    <Play className="w-4 h-4 mr-1.5" />
                    Start Interview
                  </Button>
                )}
                {interview.status === 'active' && (
                  <>
                    <Button onClick={handlePauseInterview} variant="outline" disabled={isUpdatingStatus} className="rounded-sm uppercase font-bold text-xs h-7 px-3">
                      <Pause className="w-3.5 h-3.5 mr-1.5" />
                      {isUpdatingStatus ? 'Pausing...' : 'Pause'}
                    </Button>
                    <Button onClick={handleStopInterview} variant="destructive" disabled={isUpdatingStatus} className="rounded-sm uppercase font-bold text-xs h-7 px-3">
                      <Square className="w-3.5 h-3.5 mr-1.5" />
                      Stop
                    </Button>
                  </>
                )}
                {interview.status === 'paused' && (
                  <>
                    <Button onClick={handleResumeInterview} className="bg-green-600 hover:bg-green-700 rounded-sm uppercase font-bold text-xs h-7 px-3" disabled={isUpdatingStatus}>
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      {isUpdatingStatus ? 'Resuming...' : 'Resume'}
                    </Button>
                    <Button onClick={handleStopInterview} variant="destructive" disabled={isUpdatingStatus} className="rounded-sm uppercase font-bold text-xs h-7 px-3">
                      <Square className="w-3.5 h-3.5 mr-1.5" />
                      Stop
                    </Button>
                  </>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          {loadingInterview ? (
            <ShimmerInterviewConfig />
          ) : (
            <div className="space-y-3">
              {/* Configuration Details - Compact Row Layout */}
              <div className="space-y-4">
                {/* First Row: Interview Details - Clean Layout */}
                <div className="flex items-end gap-16">
                  {/* Type */}
                  <div className="flex flex-col">
                    <Label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-2">Type</Label>
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">{interview.type?.toUpperCase()}</p>
                  </div>

                  {/* Voice */}
                  <div className="flex flex-col">
                    <Label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-2">Voice</Label>
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">{interview.voiceType?.toUpperCase()}</p>
                  </div>

                  {/* Communications */}
                  <div className="flex flex-col">
                    <Label className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-2">Communications</Label>
                    <div className="flex gap-2 flex-wrap">
                      {interview.communications.email && (
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">EMAIL</span>
                      )}
                      {interview.communications.phone && (
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">PHONE</span>
                      )}
                      {interview.communications.sms && (
                        <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">SMS</span>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full flex flex-col items-center justify-center gap-0"
                      style={{
                        backgroundColor: '#222831',
                        boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
                      }}
                    >
                      <span className="text-lg font-bold leading-tight text-white">{interview.duration?.replace(' minutes', '').replace(' mins', '').replace('min', '').trim()}</span>
                      <span className="text-[8px] leading-tight text-white">min</span>
                    </div>
                  </div>
                </div>

                {/* Second Row: Description */}
                <div>
                  <Label className="text-sm font-medium text-foreground-muted uppercase tracking-wider">Description</Label>
                  <p className="text-foreground text-sm mt-1">{interview.description}</p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Candidate Sources — only show when sources exist or are loading. */}
      {interview && (loadingCandidateSources || candidateSources.length > 0) && (
        <div
          className="rounded-sm bg-white"
          style={{
            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
          }}
        >
          <div className="px-6 py-5 border-b">
            <div className="flex items-center gap-4">
              <CloudArrowDown size={48} weight="thin" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold uppercase tracking-wider">Candidate Sources</h3>
                <p className="text-[10px] text-foreground-muted mt-1 uppercase tracking-wider">Sync new candidates from updated Google Sheets</p>
                {interview?.status && interview.status !== 'draft' && (
                  <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-amber-700 uppercase tracking-wider">
                      Note: Google Sheet syncing is disabled once the interview has started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            {loadingCandidateSources ? (
              <div className="space-y-3">
                <Shimmer className="h-20 w-full rounded-sm" />
                <Shimmer className="h-20 w-full rounded-sm" />
              </div>
            ) : candidateSources.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                {hasSharedLists && hasQualifiedLists ? (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Source data not available</p>
                    <p className="text-xs text-gray-500">This interview uses candidates from shared and curated lists</p>
                  </>
                ) : hasSharedLists ? (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Source data not available</p>
                    <p className="text-xs text-gray-500">This interview uses candidates from a shared list</p>
                  </>
                ) : hasQualifiedLists ? (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Source data not available</p>
                    <p className="text-xs text-gray-500">This interview uses candidates from a curated list</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No Google Sheet sources found</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {candidateSources.map((source: any) => {
                  const updateInfo = sourceUpdates[source.id];
                  const isChecking = checkingSourceIds.has(source.id);
                  const isSyncing = syncingSourceIds.has(source.id);
                  const hasUpdates = updateInfo?.hasNew;

                  return (
                    <div
                      key={source.id}
                      className="p-5 rounded-sm bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-sm bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 p-2">
                            <img src={googleLogo} alt="Google Sheets" className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <p className="font-semibold text-gray-900 text-base mb-1 uppercase tracking-wider">{source.name}</p>
                              <p className="text-xs text-gray-500 font-mono tracking-wide">ID: {source.id}</p>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 rounded-sm font-bold uppercase">
                                Google Sheets
                              </Badge>
                              <span className="text-xs text-gray-700 font-semibold uppercase">
                                {source.candidateCount || 0} candidates
                              </span>
                              {source.lastExtractedAt && (
                                <span className="text-xs text-gray-500">
                                  · {new Date(source.lastExtractedAt._seconds ? source.lastExtractedAt._seconds * 1000 : source.lastExtractedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {hasUpdates && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-sm">
                                <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                                <span className="text-xs text-orange-700 font-semibold uppercase tracking-wider">{updateInfo.newRows} new candidates available</span>
                              </div>
                            )}
                            {updateInfo && !updateInfo.hasNew && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-sm">
                                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs text-green-700 font-semibold uppercase tracking-wider">Up to date</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {interview?.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              const result = await handleCheckForNewCandidates(source);
                              if (result?.hasNew) {
                                await handleSyncNewCandidates(source);
                              }
                            }}
                            disabled={isChecking || isSyncing}
                            className="bg-[#222831] hover:bg-[#393E46] text-white font-bold uppercase text-xs rounded-sm flex-shrink-0 px-4 py-2"
                          >
                            {isChecking || isSyncing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {isChecking ? 'Checking' : 'Syncing'}
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {hasUpdates ? 'Sync Now' : 'Check'}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candidates Table - Only show if interview is started */}
      {interview?.status === 'draft' ? (
        <div className="text-center py-12 space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-foreground uppercase tracking-wider">Interview Not Started</h3>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
              Start the interview to begin collecting candidate responses
            </p>
          </div>
          <Button onClick={handleStartInterview} className="bg-green-600 hover:bg-green-700 text-white h-9 px-6 rounded-sm uppercase font-bold text-xs">
            <Play className="w-4 h-4 mr-1.5" />
            Start Interview
          </Button>
        </div>
      ) : (
        <>
          {/* Swipe QR Code Section — only while interview is actively collecting responses */}
          {(interview?.status === 'active' || interview?.status === 'running' || interview?.status === 'paused') && (
            <SwipeQRSection interviewId={id!} />
          )}

          {/* Shortlist Action Card */}
          <ShortlistActionCard interviewId={id!} interviewName={interview?.title || 'Interview'} />

          {/* Candidate Results Table */}
          <Card className="shadow-md rounded-sm">
            {/* Sticky Header */}
            <div className="sticky top-[120px] z-40 bg-white border-b shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-6">
                    <CardTitle className="text-lg uppercase tracking-wider">
                      Candidate Results
                    </CardTitle>
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-500"></div>
                        <span className="text-muted-foreground">Immediate</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-purple-500"></div>
                        <span className="text-muted-foreground">{'< 2 weeks'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-orange-500"></div>
                        <span className="text-muted-foreground">{'> 1 month'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-gray-400"></div>
                        <span className="text-muted-foreground">Not Specified</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshCandidates}
                    disabled={loadingCandidates}
                    className="flex items-center gap-1 h-7 text-xs px-2 rounded-sm uppercase font-bold"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingCandidates ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <CardDescription className="text-xs uppercase tracking-wider">
                  Detailed view of all candidates and their interview performance
                </CardDescription>
              </CardHeader>

              {/* Table Filters */}
              <div className="px-6 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-foreground-muted" />
              <Input
                placeholder="Search by name or email..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={tableStatusFilter} onValueChange={setTableStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatusesForTable.map((status: string) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tableScoreFilter} onValueChange={setTableScoreFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All scores" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border z-50">
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="high">Excellent (90%+)</SelectItem>
                <SelectItem value="good">Good (75-89%)</SelectItem>
                <SelectItem value="fair">Fair (60-74%)</SelectItem>
                <SelectItem value="low">Low (&lt; 60%)</SelectItem>
                <SelectItem value="no-score">No Score</SelectItem>
              </SelectContent>
            </Select>
            {(tableSearchQuery || tableStatusFilter || tableScoreFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTableSearchQuery("");
                  setTableStatusFilter("");
                  setTableScoreFilter("");
                }}
                className="h-8 px-2 rounded-sm uppercase font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
                </div>
              </div>
            </div>

          <CardContent>
          {loadingCandidates ? (
            <ShimmerTable />
          ) : (
            <>
              {/* Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {paginatedCandidates.map((candidate) => {
                  const hasSingleAttempt = candidate.attempts && candidate.attempts.length === 1;

                  return (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onClick={() => {
                        if (hasSingleAttempt && candidate.attempts[0].session_id && candidate.candidateId) {
                          navigate(`/interview/${id}/candidate/${candidate.candidateId}/video/${candidate.attempts[0].session_id}`, {
                            state: { duration: candidate.attempts[0].duration }
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {totalCandidates > pageSize && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-foreground-muted">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalCandidates)} to{' '}
                    {Math.min(currentPage * pageSize, totalCandidates)} of {totalCandidates} candidates
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-sm uppercase font-bold"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCandidates / pageSize), prev + 1))}
                      disabled={currentPage >= Math.ceil(totalCandidates / pageSize)}
                      className="rounded-sm uppercase font-bold"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          </CardContent>
        </Card>
        </>
      )}

      {/* Start Interview Modal */}
      <Dialog open={startModalOpen} onOpenChange={(open) => {
        // Only allow closing if not currently starting (prevents accidental closure during API call)
        if (!isStartingInterview) {
          setStartModalOpen(open);
          if (!open) {
            // Reset state when modal is manually closed
            setStartingProgress("");
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wider">
              {isStartingInterview ? (
                <>
                  <div className="animate-spin rounded-sm h-4 w-4 border-b-2 border-brand-primary"></div>
                  Starting Interview
                </>
              ) : startingProgress?.startsWith('Error:') ? (
                <>
                  <div className="rounded-sm h-4 w-4 bg-red-500 flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                  Interview Start Failed
                </>
              ) : (
                <>
                  <div className="rounded-sm h-4 w-4 bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Interview Started
                </>
              )}
            </DialogTitle>
            <DialogDescription className="uppercase text-xs tracking-wider">
              {isStartingInterview ? (
                `Setting up "${interview?.title}" for candidate interviews`
              ) : startingProgress?.startsWith('Error:') ? (
                `There was an issue starting "${interview?.title}"`
              ) : (
                `"${interview?.title}" is now ready for candidates`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className={`text-sm ${startingProgress?.startsWith('Error:') ? 'text-red-600' : 'text-foreground-muted'}`}>
                {startingProgress || "Preparing interview..."}
              </div>
              {isStartingInterview && (
                <div className="w-full bg-muted rounded-sm h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full transition-all duration-500 ease-out"
                    style={{
                      width: '100%',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}
                  ></div>
                </div>
              )}
              {startingProgress?.startsWith('Error:') && (
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStartModalOpen(false);
                      setStartingProgress("");
                    }}
                  >
                    Close
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      if (interview) {
                        handleStartInterview();
                      }
                    }}
                  >
                    Retry start
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Blueprint View Modal */}
      {currentWorkspace && (
        <BlueprintViewModal
          isOpen={showBlueprintModal}
          onClose={() => setShowBlueprintModal(false)}
          templateId={interview?.template_id || interview?.id || ''}
          workspaceId={currentWorkspace.id}
          templateTitle={interview?.title || interview?.role || "Interview Blueprint"}
        />
      )}
    </div>
  );
}