import { useState, useEffect, useMemo } from "react";
import { MagnifyingGlass as Search, Plus, Calendar, Users, Clock, Play, Pause, DotsThreeVertical as MoreVertical, Eye, PencilSimple as Edit, Trash as Trash2, UserPlus, Funnel as Filter } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalkingLoader } from "@/components/ui/WalkingLoader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, Status } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { checkBlueprintExists } from "@/services/blueprintService";
import { pauseInterview, resumeInterview } from "@/services/interviewControlService";
import { useNavigate, useLocation } from "react-router-dom";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { cn } from "@/lib/utils";

interface Interview {
  id: string;
  title: string;
  type: string;
  description?: string;
  created: string;
  status: string;
  pausedReason?: string;
  candidates: number;
  participationRate: number;
  duration: string;
  voiceType: string;
  voiceAccent: string;
  voiceSpeed: string;
  communications: {
    email: boolean;
    phone: boolean;
    sms: boolean;
  };
}

export default function ManageInterviewsEnhanced() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeletingInterview, setIsDeletingInterview] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [currentStartingInterview, setCurrentStartingInterview] = useState<{id: string, title: string} | null>(null);
  const [startingProgress, setStartingProgress] = useState("");

  // Determine interview type based on current route
  const interviewType = location.pathname === '/interviews/fitment' ? 'fitment' : 'screening';
  const pageTitle = interviewType === 'fitment' ? 'Role Fitment' : 'Screening';
  const pageDescription = interviewType === 'fitment'
    ? 'Monitor and control all your AI role fitment interviews in one place.'
    : 'Monitor and control all your AI screening interviews in one place.';

  // Format date to dd mmm yyyy
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };
  
  // Simple state management
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch interviews function
  const fetchInterviews = async () => {
    if (!currentWorkspace || !currentProject) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching interviews for workspace:', currentWorkspace.id, 'project:', currentProject.id);

      const data = await interviewApi.getInterviews(currentWorkspace.id, currentProject.id);
      console.log('📊 Interviews API response:', {
        count: data.interviews?.length || 0,
        firstInterview: data.interviews?.[0] || null
      });

      setInterviews(data.interviews || []);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch interviews');
      setInterviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter interviews based on search term and interview type (route-based)
  const filteredInterviews = useMemo(() => {
    // First filter by interview type based on current route
    const typeFiltered = interviews.filter(interview =>
      interview.type.toLowerCase() === interviewType
    );

    // Then apply search filter
    if (!searchTerm.trim()) return typeFiltered;

    return typeFiltered.filter(interview =>
      interview.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [interviews, searchTerm, interviewType]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInterviews.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInterviews = filteredInterviews.slice(startIndex, endIndex);

  // Clear all authentication data and reload
  const clearAuthAndReload = () => {
    console.log('🧹 Clearing all authentication data');
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  // Load interviews when workspace or project changes
  useEffect(() => {
    fetchInterviews();
  }, [currentWorkspace, currentProject]);

  // Calculate stats from real data - use filteredInterviews to respect interview type filter
  const activeInterviews = filteredInterviews.filter(interview =>
    interview.status === 'in-progress' || interview.status === 'active'
  ).length;

  const totalCandidates = filteredInterviews.reduce((sum, interview) => sum + (interview.candidates || 0), 0);

  const thisWeekInterviews = filteredInterviews.filter(interview => {
    const interviewDate = new Date(interview.created);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return interviewDate >= weekAgo;
  }).length;

  const avgDuration = filteredInterviews.length > 0
    ? Math.round(filteredInterviews.reduce((sum, interview) => {
        const durationMatch = interview.duration?.match(/(\d+)/);
        return sum + (durationMatch ? parseInt(durationMatch[1]) : 0);
      }, 0) / filteredInterviews.length)
    : 0;

  const handleEditInterview = (interviewId: string) => {
    navigate(`/interviews/create?edit=${interviewId}`);
  };

  const handleDeleteInterview = (interviewId: string, title: string) => {
    setInterviewToDelete({ id: interviewId, title });
    setDeleteModalOpen(true);
  };

  const confirmDeleteInterview = async () => {
    if (!interviewToDelete || !currentWorkspace || !currentProject) return;

    setIsDeletingInterview(true);
    try {
      const userToken = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/${interviewToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        toast({
          title: "Interview Deleted",
          description: `"${interviewToDelete.title}" has been successfully deleted.`
        });
        
        // Refetch data to update the list
        await fetchInterviews();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete interview');
      }
    } catch (error: any) {
      console.error('Failed to delete interview:', error);
      toast({
        title: "Delete Failed", 
        description: error.message || "Failed to delete the interview. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingInterview(false);
      setDeleteModalOpen(false);
      setInterviewToDelete(null);
    }
  };

  const handleViewDetails = (interviewId: string) => {
    navigate(`/interviews/${interviewId}`);
  };

  const handleAddCandidates = (interviewId: string) => {
    navigate(`/interviews/create?edit=${interviewId}&step=1`);
  };

  const handleAction = async (action: string, interviewId: string, title: string) => {
    if (action === "Start") {
      if (!currentWorkspace || !currentProject) return;

      // Open modal and start the process
      setCurrentStartingInterview({ id: interviewId, title });
      setStartModalOpen(true);
      setIsStartingInterview(true);

      try {
        // Step 1: Check if blueprint exists
        setStartingProgress("Checking interview blueprint...");
        const blueprintCheck = await checkBlueprintExists(currentWorkspace.id, currentProject.id, interviewId);
        console.log('Blueprint check result:', blueprintCheck);

        if (!blueprintCheck || !blueprintCheck.exists) {
          setStartingProgress("Error: Interview blueprint not found. Please ensure blueprint is generated first.");
          toast({
            title: "Blueprint Missing",
            description: "Interview blueprint not found. Please ensure blueprint is generated before starting the interview.",
            variant: "destructive"
          });
          return;
        }

        // Step 2: Initializing
        setStartingProgress("Initializing interview settings...");
        await new Promise(resolve => setTimeout(resolve, 800));

        // Step 3: Fetching candidates
        setStartingProgress("Loading candidate information...");
        await new Promise(resolve => setTimeout(resolve, 600));

        // Step 4: Generating invitations
        setStartingProgress("Generating invitation links...");
        await new Promise(resolve => setTimeout(resolve, 700));

        const userToken = localStorage.getItem('auth_token');
        const headers = {
          'Content-Type': 'application/json',
          ...(userToken && { 'Authorization': `Bearer ${userToken}` })
        };

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/workspaces/${currentWorkspace.id}/projects/${currentProject.id}/interviews/${interviewId}/start`, {
          method: 'POST',
          headers
        });

        const data = await response.json();

        if (data.success) {
          // Step 5: Finalizing
          setStartingProgress("Finalizing interview activation...");
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Force a complete refresh
          console.log('Interview started successfully, refreshing data...');
          console.log('API Response:', data);
          
          // Refetch interviews to get updated data
          await fetchInterviews();
          
          // Show success state briefly before closing
          setStartingProgress("Interview started successfully!");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setStartModalOpen(false);
          setStartingProgress("");
          setCurrentStartingInterview(null);
          
          toast({
            title: "Interview Started!",
            description: `${data.total_invitations_created} invitation links generated for "${title}"`
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
        // setStartingProgress("");
        // setCurrentStartingInterview(null);
      }
    } else if (action === "Pause") {
      // Handle pause action
      if (!currentWorkspace || !currentProject) return;
      try {
        await pauseInterview(currentWorkspace.id, currentProject.id, interviewId);
        toast({
          title: "Interview Paused",
          description: `"${title}" has been paused.`
        });
        refetch();
      } catch (error) {
        console.error('Failed to pause interview:', error);
        toast({
          title: "Error",
          description: "Failed to pause interview. Please try again.",
          variant: "destructive"
        });
      }
    } else if (action === "Resume") {
      // Handle resume action
      if (!currentWorkspace || !currentProject) return;
      try {
        await resumeInterview(currentWorkspace.id, currentProject.id, interviewId);
        toast({
          title: "Interview Resumed",
          description: `"${title}" has been resumed and is now active.`
        });
        refetch();
      } catch (error) {
        console.error('Failed to resume interview:', error);
        toast({
          title: "Error",
          description: "Failed to resume interview. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Handle other actions with simple toast
      toast({
        title: `${action} Interview`,
        description: `"${title}" has been ${action.toLowerCase()}.`
      });
    }
  };

  const getParticipationColor = (rate: number) => {
    if (rate >= 75) return "text-success cursor-pointer hover:underline";
    if (rate >= 50) return "text-warning cursor-pointer hover:underline";
    if (rate > 0) return "text-error cursor-pointer hover:underline";
    return "text-foreground-muted";
  };

  const getTypeColor = (type?: string) => {
    if (!type) return 'bg-muted text-foreground-muted border border-border';
    switch (type.toLowerCase()) {
      case 'screening': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'fitment': return 'bg-blue-100 text-blue-700 border border-blue-200';
      default: return 'bg-muted text-foreground-muted border border-border';
    }
  };

  const handleClearFilter = (filterType: string) => {
    switch (filterType) {
      case 'search':
        setSearchFilter('');
        break;
      case 'status':
        setStatusFilter([]);
        break;
      case 'type':
        setTypeFilter([]);
        break;
      case 'dateRange':
        updateFilter('dateRange', undefined);
        break;
      case 'candidateCount':
        updateFilter('candidateCount', undefined);
        break;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={refetch}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && interviews.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <WalkingLoader />
          <p className="text-foreground-muted mt-6">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto py-6 px-1 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">{pageTitle}</h1>
          <p className="text-foreground-muted text-xs uppercase tracking-wider">{pageDescription}</p>
        </div>
        <Button
          className="text-white font-medium rounded-sm uppercase transition-all duration-200"
          style={{
            minWidth: '9em',
            height: '3em',
            fontSize: '14px',
            border: 'none',
            backgroundColor: '#222831',
            boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
            textTransform: 'uppercase'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
          onClick={() => navigate(`/interviews/create?type=${interviewType}`)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Interview
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-sm p-6 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold text-foreground">{activeInterviews}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>Active</div>
              <div>Interviews</div>
            </div>
          </div>
        </div>
        <div className="rounded-sm p-6 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold text-foreground">{totalCandidates}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>Total</div>
              <div>Candidates</div>
            </div>
          </div>
        </div>
        <div className="rounded-sm p-6 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold text-foreground">{thisWeekInterviews}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>This</div>
              <div>Week</div>
            </div>
          </div>
        </div>
        <div className="rounded-sm p-6 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-200">
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold text-foreground">{avgDuration}</p>
            <div className="text-sm text-foreground-muted uppercase text-xs tracking-wider leading-tight">
              <div>Avg. Duration</div>
              <div>(min)</div>
            </div>
          </div>
        </div>
      </div>


      {/* Interviews Table */}
      <div
        className="rounded-sm bg-white border border-border"
        style={{
          boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5'
        }}
      >
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold uppercase tracking-wider">All Interviews ({filteredInterviews.length})</h3>
          <p className="text-xs text-foreground-muted mt-1 uppercase tracking-wider">
            Manage your AI interviews, monitor progress, and control settings
          </p>
        </div>
        <div className="p-6">
          {filteredInterviews.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-brand-primary-light rounded-full flex items-center justify-center">
                <Users className="w-12 h-12 text-brand-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4 uppercase tracking-wider">
                {searchTerm ? "No matching interviews" : "No interviews yet!"}
              </h2>
              <p className="text-foreground-muted mb-8 max-w-md mx-auto">
                {searchTerm 
                  ? "Try adjusting your search to find more interviews."
                  : "Get started by creating your first AI interview. Set up voice settings, add candidates, and begin screening candidates efficiently."
                }
              </p>
              {searchTerm ? (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                  className="uppercase rounded-sm"
                >
                  Clear Search
                </Button>
              ) : (
                <Button
                  className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                  style={{
                    minWidth: '9em',
                    height: '3em',
                    fontSize: '14px',
                    border: 'none',
                    backgroundColor: '#222831',
                    boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                    textTransform: 'uppercase'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
                  onClick={() => navigate(`/interviews/create?type=${interviewType}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Interview
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px] text-xs uppercase tracking-wider">Interview</TableHead>
                      <TableHead className="w-[70px] text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="w-[60px] text-xs uppercase tracking-wider text-center">Candidates</TableHead>
                      <TableHead className="w-[70px] hidden lg:table-cell text-xs uppercase tracking-wider text-center">Participation</TableHead>
                      <TableHead className="w-[60px] hidden md:table-cell text-xs uppercase tracking-wider text-center">Duration</TableHead>
                      <TableHead className="w-[100px] hidden lg:table-cell text-xs uppercase tracking-wider">Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {paginatedInterviews.map((interview) => (
                    <TableRow
                      key={interview.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(interview.id)}
                    >
                      <TableCell className="min-w-[140px]">
                        <div>
                          <div className="font-medium text-foreground text-sm uppercase tracking-wider">{interview.title}</div>
                          <div className="text-sm text-gray-500">ID: {interview.id.slice(0, 8)}...</div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[70px]">
                        <StatusBadge status={(interview.status === 'paused' && interview.pausedReason === 'credits_exhausted' ? 'paused_credits' : interview.status) as Status} />
                      </TableCell>
                      <TableCell className="w-[60px] text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Users weight="fill" className="w-3 h-3 text-foreground-muted" />
                          <span className="font-medium text-foreground text-xs">{interview.candidates}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[70px] hidden lg:table-cell text-center">
                        <span
                          className={`font-semibold text-xs ${getParticipationColor(interview.participationRate)}`}
                        >
                          {interview.participationRate}%
                        </span>
                      </TableCell>
                      <TableCell className="w-[60px] hidden md:table-cell text-foreground-muted text-sm text-center">
                        {interview.duration}
                      </TableCell>
                      <TableCell className="w-[100px] hidden lg:table-cell text-foreground-muted text-xs whitespace-nowrap">
                        {interview.createdAt || formatDate(interview.created)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel className="text-xs py-1 uppercase tracking-wider">Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(interview.id);
                              }}
                              className="cursor-pointer text-xs py-1"
                            >
                              <Eye className="mr-1.5 h-3 w-3" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditInterview(interview.id);
                              }}
                              className="cursor-pointer text-xs py-1"
                            >
                              <Edit className="mr-1.5 h-3 w-3" />
                              Edit Interview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (interview.status === 'draft') {
                                  handleAddCandidates(interview.id);
                                } else {
                                  toast({
                                    title: "Cannot Add Candidates",
                                    description: "Only interviews in draft status can have candidates added.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className={interview.status === 'draft' ? "cursor-pointer text-xs py-1.5" : "cursor-not-allowed opacity-50 text-xs py-1.5"}
                            >
                              <div className="flex items-start gap-1.5 w-full">
                                <UserPlus className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div className="flex flex-col gap-0">
                                  <span>Add Candidates</span>
                                  {interview.status !== 'draft' && (
                                    <span className="text-[10px] text-muted-foreground leading-tight">(Draft only)</span>
                                  )}
                                </div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {interview.status === "draft" ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction("Start", interview.id, interview.title);
                                }}
                                className="cursor-pointer text-xs py-1"
                              >
                                <Play className="mr-1.5 h-3 w-3" />
                                Start Interview
                              </DropdownMenuItem>
                            ) : interview.status === "active" ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction("Pause", interview.id, interview.title);
                                }}
                                className="cursor-pointer text-xs py-1"
                              >
                                <Pause className="mr-1.5 h-3 w-3" />
                                Pause Interview
                              </DropdownMenuItem>
                            ) : interview.status === "paused" ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction("Resume", interview.id, interview.title);
                                }}
                                className="cursor-pointer text-xs py-1 text-green-600"
                              >
                                <Play className="mr-1.5 h-3 w-3" />
                                Resume Interview
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInterview(interview.id, interview.title);
                              }}
                              className="cursor-pointer text-destructive focus:text-destructive text-xs py-1"
                            >
                              <Trash2 className="mr-1.5 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredInterviews.length > 0 && (
                <div className="flex items-center justify-between px-2 py-2 mt-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs font-medium">Show</p>
                    <Select value={pageSize.toString()} onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="h-6 w-[60px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((size) => (
                          <SelectItem key={size} value={`${size}`}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm font-medium">of {filteredInterviews.length} interviews</p>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-6 px-2 text-xs uppercase rounded-sm"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                      const pageNumber = Math.max(1, Math.min(totalPages - 2, currentPage - 1)) + i;
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-6 h-6 text-xs rounded-sm"
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-6 px-2 text-xs uppercase rounded-sm"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="text-xs text-foreground-muted">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteInterview}
        interviewName={interviewToDelete?.title || ""}
        isDeleting={isDeletingInterview}
      />

      {/* Start Interview Modal */}
      <Dialog open={startModalOpen} onOpenChange={(open) => {
        // Only allow closing if not currently starting (prevents accidental closure during API call)
        if (!isStartingInterview) {
          setStartModalOpen(open);
          if (!open) {
            // Reset state when modal is manually closed
            setStartingProgress("");
            setCurrentStartingInterview(null);
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isStartingInterview ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                  Starting Interview
                </>
              ) : startingProgress?.startsWith('Error:') ? (
                <>
                  <div className="rounded-full h-4 w-4 bg-red-500 flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                  Interview Start Failed
                </>
              ) : (
                <>
                  <div className="rounded-full h-4 w-4 bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Interview Started
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isStartingInterview ? (
                `Setting up "${currentStartingInterview?.title}" for candidate interviews`
              ) : startingProgress?.startsWith('Error:') ? (
                `There was an issue starting "${currentStartingInterview?.title}"`
              ) : (
                `"${currentStartingInterview?.title}" is now ready for candidates`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className={`text-sm ${startingProgress?.startsWith('Error:') ? 'text-red-600' : 'text-foreground-muted'}`}>
                {startingProgress || "Preparing interview..."}
              </div>
              {isStartingInterview && (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
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
                      setCurrentStartingInterview(null);
                    }}
                    className="uppercase rounded-sm"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="text-white font-medium rounded-sm uppercase transition-all duration-200"
                    style={{
                      border: 'none',
                      backgroundColor: '#222831',
                      boxShadow: 'inset 1px 1px 2px #e8e8e8, 2px 2px 4px #d5d5d5',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#393E46'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222831'}
                    onClick={() => {
                      if (currentStartingInterview) {
                        handleAction("Start", currentStartingInterview.id, currentStartingInterview.title);
                      }
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}