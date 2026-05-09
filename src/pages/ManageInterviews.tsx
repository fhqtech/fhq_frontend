import { useState, useEffect } from "react";
import { MagnifyingGlass as Search, Funnel as Filter, Plus, Calendar, Users, Clock, Play, Pause, DotsThree as MoreHorizontal, Eye, PencilSimple as Edit, Trash as Trash2, UserPlus, BookmarkSimple } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalkingLoader } from "@/components/ui/WalkingLoader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { interviewApi } from "@/services/interviewApi";
import { templateApi } from "@/services/templateApi";

// Lottie Animation Component
function LottieAnimation() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.5/dist/dotlottie-wc.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="mx-auto" style={{ width: '300px', height: '300px' }}>
      <dotlottie-wc
        src="https://lottie.host/babbec7b-a70e-49ae-a960-8345ae6962cd/DJyXVs1kHY.lottie"
        style={{ width: '300px', height: '300px' } as any}
        autoplay="true"
        loop="true"
      />
    </div>
  );
}
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, Status } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";

export default function ManageInterviews() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Determine interview type based on route
  const interviewType = location.pathname.includes('/interviews/fitment') ? 'fitment' : 'screening';
  const pageTitle = interviewType === 'fitment' ? 'ROLE FITMENT INTERVIEWS' : 'SCREENING INTERVIEWS';
  const [selectedType, setSelectedType] = useState<string>(interviewType);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeletingInterview, setIsDeletingInterview] = useState(false);
  const [savingAsTemplateId, setSavingAsTemplateId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentWorkspace, currentProject } = useWorkspace();

  // Fetch interviews on component mount
  useEffect(() => {
    const fetchInterviews = async () => {
      if (!currentWorkspace || !currentProject) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await interviewApi.getInterviews(currentWorkspace.id, currentProject.id);
        setInterviews(data.interviews || []);

      } catch (err) {
        console.error('Error fetching interviews:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch interviews');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [currentWorkspace, currentProject]);

  // Sync selectedType with route-based interviewType
  useEffect(() => {
    setSelectedType(interviewType);
  }, [interviewType]);

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = interview.type.toLowerCase() === interviewType.toLowerCase();

    return matchesSearch && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredInterviews.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInterviews = filteredInterviews.slice(startIndex, endIndex);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType]);

  const handleEditInterview = (interviewId: string) => {
    navigate(`/interviews/create?edit=${interviewId}`);
  };

  const handleDeleteInterview = (interviewId: string, title: string) => {
    setInterviewToDelete({ id: interviewId, title });
    setDeleteModalOpen(true);
  };

  const confirmDeleteInterview = async () => {
    if (!interviewToDelete) return;

    setIsDeletingInterview(true);
    try {
      const userToken = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082'}/api/interviews/${interviewToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (response.ok) {
        // Remove the interview from state
        setInterviews(prev => prev.filter(interview => interview.id !== interviewToDelete.id));
        
        toast({
          title: "Interview Deleted",
          description: `"${interviewToDelete.title}" has been successfully deleted.`
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete interview');
      }
    } catch (error) {
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

  const handleAction = (action: string, interviewId: string, title: string) => {
    toast({
      title: `Interview ${action}`,
      description: `"${title}" has been ${action.toLowerCase()}.`,
    });
  };

  const handleSaveAsTemplate = async (interviewId: string, title: string, blueprintStatus: string) => {
    if (!currentWorkspace?.id || !currentProject?.id) {
      toast({
        title: "Error",
        description: "Workspace or project not found.",
        variant: "destructive"
      });
      return;
    }

    if (blueprintStatus !== 'ready') {
      toast({
        title: "Cannot Save as Template",
        description: "Only interviews with a ready blueprint can be saved as templates.",
        variant: "destructive"
      });
      return;
    }

    setSavingAsTemplateId(interviewId);
    try {
      await templateApi.saveInterviewAsTemplate(
        interviewId,
        currentWorkspace.id,
        currentProject.id,
        title
      );

      toast({
        title: "Template Saved",
        description: `"${title}" has been saved to the Template Library.`
      });
    } catch (error) {
      console.error('Failed to save as template:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save interview as template. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingAsTemplateId(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'screening': return 'bg-emerald-100 text-emerald-700';
      case 'fitment': return 'bg-blue-100 text-blue-700';
      default: return 'bg-muted text-foreground-muted';
    }
  };

  const getParticipationColor = (rate: number) => {
    if (rate >= 80) return "text-success cursor-pointer hover:underline";
    if (rate >= 60) return "text-warning cursor-pointer hover:underline";
    if (rate > 0) return "text-error cursor-pointer hover:underline";
    return "text-foreground-muted";
  };

  // Calculate stats from real data
  const activeInterviews = interviews.filter(interview => 
    interview.status === 'in-progress' || interview.status === 'active'
  ).length;
  
  const totalCandidates = interviews.reduce((sum, interview) => sum + (interview.candidates || 0), 0);
  
  const thisWeekInterviews = interviews.filter(interview => {
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-foreground-muted mt-2">
              Monitor and control all your AI interviews in one place.
            </p>
          </div>
          <Button
            className="bg-gradient-primary border-0 shadow-brand"
            onClick={() => navigate('/interviews/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Interview
          </Button>
        </div>

        {/* Loading animation - centered */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <WalkingLoader />
          <p className="text-muted-foreground mt-6">Loading interviews...</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-foreground-muted mt-2">
              Monitor and control all your AI interviews in one place.
            </p>
          </div>
          <Button
            className="bg-gradient-primary border-0 shadow-brand"
            onClick={() => navigate('/interviews/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Interview
          </Button>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 text-lg mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Interviews</h3>
            <p className="text-foreground-muted mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!loading && interviews.length === 0) {
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-foreground-muted mt-2">
              Monitor and control all your AI interviews in one place.
            </p>
          </div>
          <Button
            className="bg-gradient-primary border-0 shadow-brand"
            onClick={() => navigate('/interviews/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Interview
          </Button>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="p-12 text-center">
            <LottieAnimation />
            <h2 className="text-2xl font-bold text-foreground mb-4">No interviews yet!</h2>
            <p className="text-foreground-muted mb-8 max-w-md mx-auto">
              Get started by creating your first AI interview. Set up voice settings, add candidates, and begin screening candidates efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-gradient-primary border-0 shadow-brand"
                onClick={() => navigate('/interviews/create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Interview
              </Button>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Templates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
          <p className="text-foreground-muted mt-2">
            Monitor and control all your AI interviews in one place.
          </p>
        </div>
        <Button
          className="bg-gradient-primary border-0 shadow-brand"
          onClick={() => navigate('/interviews/create')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Interview
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="py-6 px-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-secondary-light rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-secondary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{totalCandidates}</p>
                <p className="text-sm text-foreground-muted">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 px-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary-light rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{activeInterviews}</p>
                <p className="text-sm text-foreground-muted">Active Interviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 px-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-accent-light rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-brand-accent" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{thisWeekInterviews}</p>
                <p className="text-sm text-foreground-muted">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 px-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success-light rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{avgDuration}</p>
                <p className="text-sm text-foreground-muted">Avg. Duration (min)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Interviews Table */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">All Interviews ({filteredInterviews.length})</h2>
          <p className="text-sm text-foreground-muted mt-1">
            Manage your AI interviews, monitor progress, and control settings
          </p>
        </div>
        <div>
          <Table>
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow className="border-b-0 hover:bg-transparent">
                <TableHead className="text-xs w-[140px]">Interview</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Candidates</TableHead>
                <TableHead className="text-xs">Participation</TableHead>
                <TableHead className="text-xs text-center">Duration</TableHead>
                <TableHead className="text-xs">Voice</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInterviews.map((interview) => (
                <TableRow
                  key={interview.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleViewDetails(interview.id)}
                >
                  <TableCell className="w-[140px]">
                    <div className="font-medium text-foreground truncate">{interview.title}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={interview.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-foreground-muted" />
                      <span className="font-medium text-foreground">{interview.candidates}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`font-semibold ${getParticipationColor(interview.participationRate)}`}
                      onClick={() => interview.participationRate > 0 && handleViewDetails(interview.id)}
                    >
                      {interview.participationRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground-muted">
                    {interview.duration}
                  </TableCell>
                  <TableCell className="text-foreground-muted whitespace-nowrap">
                    {interview.voiceType}
                  </TableCell>
                  <TableCell className="text-foreground-muted whitespace-nowrap">
                    {interview.created}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface border-border">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            toast({
                              title: "Edit Disabled",
                              description: "Interview editing is currently disabled. Please create a new interview instead.",
                              variant: "destructive"
                            });
                          }}
                          disabled
                          className="cursor-not-allowed opacity-50"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit Interview <span className="text-xs text-muted-foreground ml-1">(Disabled)</span></span>
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
                          className={interview.status === 'draft' ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          <span>Add Candidates {interview.status !== 'draft' && <span className="text-xs text-muted-foreground ml-1">(Draft only)</span>}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveAsTemplate(interview.id, interview.title, interview.blueprintStatus || 'pending');
                          }}
                          disabled={savingAsTemplateId === interview.id || interview.blueprintStatus !== 'ready'}
                          className={interview.blueprintStatus === 'ready' ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                        >
                          <BookmarkSimple className="mr-2 h-4 w-4" />
                          <span>
                            {savingAsTemplateId === interview.id ? 'Saving...' : 'Save as Template'}
                            {interview.blueprintStatus !== 'ready' && <span className="text-xs text-muted-foreground ml-1">(Blueprint required)</span>}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {interview.status === "in-progress" ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction("paused", interview.id, interview.title);
                            }}
                            className="cursor-pointer text-warning"
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Interview
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction("activated", interview.id, interview.title);
                            }}
                            className="cursor-pointer text-success"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Activate Interview
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInterview(interview.id, interview.title);
                          }}
                          className="cursor-pointer text-error"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Interview
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {filteredInterviews.length > 0 && (
            <div className="flex items-center justify-between px-2 py-3 mt-2">
              {/* Page size selector */}
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Show</p>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 15, 20, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm font-medium">of {filteredInterviews.length} interviews</p>
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-sm text-foreground-muted">...</span>}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>

              {/* Page info */}
              <div className="text-sm text-foreground-muted">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}
          </Table>
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
    </div>
  );
}