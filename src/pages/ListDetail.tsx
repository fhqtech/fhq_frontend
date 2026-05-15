import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listsApi, CandidateSource } from "@/services/listsApi";
import { qualifiedListsApi } from "@/services/qualifiedListsApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  Star,
  CheckCircle,
  Search,
  LayoutGrid,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Loader2,
  FolderOpen,
  X
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/shimmer";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CandidateCard } from "@/components/analytics/CandidateCard";
import { CandidateDrawer } from "@/components/analytics/CandidateDrawer";
import { AnalyticsCandidate } from "@/types/analytics";
import { useParticleBurst } from "@/hooks/useParticleBurst";
import { AddToQualifiedListModal } from "@/components/modals/AddToQualifiedListModal";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function ListDetail() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentWorkspace, currentProject } = useWorkspace();

  // Get query parameters for shared lists
  const searchParams = new URLSearchParams(window.location.search);
  const sourceProjectId = searchParams.get('sourceProjectId');
  const isShared = searchParams.get('isShared') === 'true';
  const isQualifiedFromUrl = searchParams.get('isQualified') === 'true';

  const [listDetails, setListDetails] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [sources, setSources] = useState<CandidateSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isQualified, setIsQualified] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyticsPanelOpen, setIsAnalyticsPanelOpen] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [selectedCandidateForList, setSelectedCandidateForList] = useState<any>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [multiSelectAction, setMultiSelectAction] = useState<'add-to-list' | 'create-new' | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<AnalyticsCandidate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const sourceChipRefs = useRef<Record<string, HTMLDivElement>>({});
  const { createParticleBurst } = useParticleBurst();

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setIsScrolled(target.scrollTop > 20);
    };

    const scrollContainer = document.querySelector('.main-scroll-container');
    scrollContainer?.addEventListener('scroll', handleScroll);

    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (currentWorkspace && currentProject) {
      loadListData();
    }
  }, [listId, currentWorkspace, currentProject]);

  const loadListData = async () => {
    if (!listId || !currentWorkspace || !currentProject) return;

    try {
      setLoading(true);
      setPage(1);
      setHasMore(true);

      // For shared lists, use the source project ID
      const projectIdToUse = isShared && sourceProjectId ? sourceProjectId : currentProject.id;

      // If isQualifiedFromUrl is true, directly use qualified lists API
      if (isQualifiedFromUrl) {
        const [details, candidatesList, sourcesList] = await Promise.all([
          qualifiedListsApi.getQualifiedListDetails(currentWorkspace.id, listId),
          qualifiedListsApi.getQualifiedListCandidates(currentWorkspace.id, listId),
          qualifiedListsApi.getQualifiedListSources(currentWorkspace.id, listId)
        ]);

        setListDetails(details);
        setCandidates(candidatesList);
        setSources(sourcesList);
        setIsQualified(true);

        console.log("List details (qualified/shared):", details);
        console.log("Candidates:", candidatesList);
        console.log("Sources:", sourcesList);
        setLoading(false);
        setTimeout(() => setIsAnalyticsPanelOpen(true), 300);
        return;
      }

      // Try to load from regular lists API first
      try {
        const [details, candidatesList, sourcesList] = await Promise.all([
          listsApi.getListDetails(currentWorkspace.id, projectIdToUse, listId),
          listsApi.getListCandidates(currentWorkspace.id, projectIdToUse, listId, 1, 20), // Load first page
          listsApi.getListSources(currentWorkspace.id, projectIdToUse, listId)
        ]);

        setListDetails(details);
        setCandidates(candidatesList);
        setSources(sourcesList);
        setIsQualified(false);
        setHasMore(candidatesList.length === 20);

        console.log("List details (regular):", details);
        console.log("Candidates:", candidatesList);
        console.log("Sources:", sourcesList);
      } catch (regularListError: any) {
        // If regular list fails with 404, try qualified lists API
        if (regularListError.message.includes('Failed to fetch') ||
            regularListError.message.includes('404') ||
            regularListError.message.includes('not found')) {
          console.log("Regular list not found, trying qualified lists API...");

          const [details, candidatesList, sourcesList] = await Promise.all([
            qualifiedListsApi.getQualifiedListDetails(currentWorkspace.id, listId),
            qualifiedListsApi.getQualifiedListCandidates(currentWorkspace.id, listId),
            qualifiedListsApi.getQualifiedListSources(currentWorkspace.id, listId)
          ]);

          setListDetails(details);
          setCandidates(candidatesList);
          setSources(sourcesList);
          setIsQualified(true);

          console.log("List details (qualified):", details);
          console.log("Candidates:", candidatesList);
          console.log("Sources:", sourcesList);
        } else {
          // If it's not a 404, rethrow the error
          throw regularListError;
        }
      }
    } catch (error) {
      console.error("Error loading list data:", error);
      toast({
        title: "Error",
        description: "Failed to load list details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      // Open analytics panel after loading completes
      setTimeout(() => setIsAnalyticsPanelOpen(true), 300);
    }
  };

  const loadMore = async () => {
    if (!listId || !currentWorkspace || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const moreCandidates = await listsApi.getListCandidates(currentWorkspace.id, currentProject.id, listId, nextPage, 20);
      setCandidates(prev => [...prev, ...moreCandidates]);
      setPage(nextPage);
      setHasMore(moreCandidates.length === 20);
    } catch (error) {
      console.error("Error loading more candidates:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Transform candidate data to AnalyticsCandidate format
  const transformedCandidates = useMemo(() => {
    return candidates.map((candidate): AnalyticsCandidate => ({
      id: candidate.id,
      name: candidate.name || candidate.personalInfo?.name || 'Unknown',
      role: candidate.jobTitle || candidate.role || candidate.sourceInfo?.extractedFrom || 'Candidate',
      email: candidate.email || candidate.personalInfo?.email || '',
      phone: candidate.phone || candidate.personalInfo?.phone || '',
      location: candidate.location || candidate.personalInfo?.location || 'Unknown',
      experience: candidate.experience || 0,
      profilePicture: candidate.profilePicture || '',
      starred: candidate.starred || false,
      skills: candidate.skills || {},
      scores: candidate.scores || {
        overall: 0,
        screening: 0,
        prelims: 0,
        fitment: 0
      },
      eligibleForRoles: candidate.eligibleForRoles || [],
      stage: candidate.stage || candidate.currentStage || 'screening',
      currentStage: candidate.currentStage || candidate.stage || 'screening',
      appliedDate: candidate.appliedDate || new Date().toISOString(),
      lastUpdated: candidate.lastUpdated || new Date().toISOString()
    }));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return transformedCandidates.filter(candidate => {
      const name = candidate.name || '';
      const email = candidate.email || '';
      const phone = candidate.phone || '';

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [transformedCandidates, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredCandidates.length;
    const starred = filteredCandidates.filter(c => c.starred).length;
    const avgScore = total > 0
      ? (filteredCandidates.reduce((sum, c) => sum + (c.scores?.overall || 0), 0) / total).toFixed(0)
      : 0;
    const withEmail = filteredCandidates.filter(c => c.email).length;

    return { total, starred, avgScore, withEmail };
  }, [filteredCandidates]);

  const handleViewCandidate = (candidate: AnalyticsCandidate) => {
    setSelectedCandidate(candidate);
    setIsDrawerOpen(true);
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!listId) return;

    // Check if this is a qualified list - they don't support source deletion yet
    if (isQualified) {
      toast({
        title: "Not Available",
        description: "Source deletion is not available for curated lists",
        variant: "destructive"
      });
      return;
    }

    if (!currentWorkspace) return;

    setDeletingSourceId(sourceId);

    try {
      // Delete the source
      await listsApi.removeSourceFromList(currentWorkspace.id, currentProject.id, listId, sourceId);

      // Particle burst effect
      const chipElement = sourceChipRefs.current[sourceId];
      if (chipElement) {
        createParticleBurst(chipElement, {
          count: 50,
          colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', '#8b5cf6', '#ec4899'],
          duration: 600
        });
        chipElement.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        chipElement.style.opacity = '0';
        chipElement.style.transform = 'scale(0.8)';
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Remove from state
      setSources(prev => prev.filter(s => s.id !== sourceId));

      // Reload data to update counts
      await loadListData();

      toast({
        title: "Source removed",
        description: "Source and its candidates have been removed from this list"
      });
    } catch (error) {
      console.error("Error deleting source:", error);
      toast({
        title: "Error",
        description: "Failed to remove source",
        variant: "destructive"
      });
    } finally {
      setDeletingSourceId(null);
    }
  };

  const userName = user?.name?.split(' ')[0] || 'there';

  if (loading) {
    return <PageSkeleton header cards={3} rows={6} cols={5} message="Loading list details…" />;
  }

  if (!listDetails) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center flex-1">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">List not found</p>
          <Button onClick={() => navigate("/lists")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden relative flex-1">
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full flex flex-col pr-8 pb-16 pt-6">
          {/* Header with List Name - Vanishes on scroll */}
          {!isScrolled && (
            <div className="pb-3 shrink-0 transition-all duration-300 flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/lists")}
                className="bg-paper rounded border border-border hover:bg-accent transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="uppercase tracking-wider text-sm font-semibold">Back to Lists</span>
              </Button>
              <h1 className="text-2xl font-bold flex-1">{listDetails.name}</h1>
              {/* T3: jump into the aggregate Pool TAG view */}
              <Button
                variant="default"
                onClick={() => navigate(`/lists/${listId}/pool`)}
                className="bg-ink text-paper hover:bg-ink"
              >
                <span className="uppercase tracking-wider text-xs font-semibold">Pool TAG view →</span>
              </Button>
            </div>
          )}

          {/* Header - Sticky when scrolled */}
          {isScrolled && (
            <div className="shrink-0 sticky top-0 bg-background/95 backdrop-blur-xs z-20 py-2 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/lists")}
                  size="sm"
                  className="bg-paper rounded border border-border hover:bg-accent transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="uppercase tracking-wider text-xs font-semibold">Back</span>
                </Button>
                <h1 className="text-xl font-semibold uppercase tracking-tight">{listDetails.name}</h1>
              </div>
            </div>
          )}

          {/* AI Search Bar - Sticky */}
          <div className={`shrink-0 transition-all duration-300 sticky top-0 bg-background/95 backdrop-blur-xs z-20 ${isScrolled ? 'py-3 shadow-1' : 'py-2'}`}>
            <div className="relative max-w-4xl mx-auto">
              {!isScrolled && <div className="absolute inset-0 bg-primary/10 rounded-lg blur-xs" />}
              <div className={`relative bg-card border border-border rounded-lg shadow-1 transition-all duration-300 ${isScrolled ? 'p-2.5' : 'p-3'}`}>
                <div className={`flex items-center transition-all duration-300 ${isScrolled ? 'gap-2' : 'gap-3'}`}>
                  {!isScrolled && (
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      placeholder={isScrolled ? "Ask AI..." : "Ask AI to analyze candidates..."}
                      value={aiSearchQuery}
                      onChange={(e) => setAiSearchQuery(e.target.value)}
                      className={`border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 transition-all duration-300 ${isScrolled ? 'text-sm' : 'text-base'}`}
                    />
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/30 gap-1.5">
                    <Zap className="h-3 w-3" />
                    AI Powered
                  </Badge>
                </div>
                {aiSearchQuery && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-primary" />
                      AI analyzing: "{aiSearchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 pb-4 overflow-y-auto main-scroll-container">
            {/* Main Content (Scrollable Candidates) */}
            <div className="h-full flex flex-col">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 sticky top-0 bg-background/95 backdrop-blur-xs py-3 z-10">
                <div className="relative max-w-4xl mx-auto w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Sources as Chips */}
              {sources.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-3 items-center">
                  <span className="text-base font-semibold text-muted-foreground">
                    SOURCES
                  </span>
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      ref={(el) => {
                        if (el) sourceChipRefs.current[source.id] = el;
                      }}
                    >
                      <Badge
                        variant="secondary"
                        className="px-3 py-1.5 text-sm rounded"
                      >
                        <span>{source.name}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Candidates Grid - Scrollable Content */}
              <div className="flex-1 pb-4">
                <div className="mb-4 shrink-0">
                  <h2 className="text-xl font-bold uppercase tracking-tight mb-2">CANDIDATES</h2>
                  <p className="text-sm text-muted-foreground">
                    {candidates.length} of {listDetails?.totalCandidates || candidates.length} candidates
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCandidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onViewDetails={handleViewCandidate}
                      onToggleStar={async (candidateId) => {
                        try {
                          const api = isQualified ? qualifiedListsApi : listsApi;
                          const result = await api.toggleCandidateStar(listId!, candidateId);

                          // Update local state immediately (optimistic update)
                          setCandidates(prev => prev.map(c =>
                            c.id === candidateId ? { ...c, starred: result.starred } : c
                          ));

                          toast({
                            title: result.starred ? "Starred" : "Unstarred",
                            description: result.starred ? "Candidate marked as starred" : "Candidate unstarred"
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to toggle star",
                            variant: "destructive"
                          });
                        }
                      }}
                      onAddToList={(candidateId, listType) => {
                        if (listType === 'existing') {
                          // Enter multi-select mode for "Add to List"
                          setIsMultiSelectMode(true);
                          setMultiSelectAction('add-to-list');
                          setSelectedCandidateIds(new Set([candidateId]));
                        } else {
                          // Enter multi-select mode for "New List"
                          setIsMultiSelectMode(true);
                          setMultiSelectAction('create-new');
                          setSelectedCandidateIds(new Set([candidateId]));
                        }
                      }}
                      isMultiSelectMode={isMultiSelectMode}
                      isSelected={selectedCandidateIds.has(candidate.id)}
                      onToggleSelect={(candidateId) => {
                        setSelectedCandidateIds(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(candidateId)) {
                            newSet.delete(candidateId);
                          } else {
                            newSet.add(candidateId);
                          }
                          return newSet;
                        });
                      }}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && !searchQuery && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outline"
                      size="lg"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        `Load more candidates (${candidates.length} loaded)`
                      )}
                    </Button>
                  </div>
                )}

                {filteredCandidates.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No candidates match your search</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Analytics Panel (Full Height Sidebar) */}
        <div className={`fixed top-0 right-0 h-dvh bg-background/90 backdrop-blur-lg border-l border-border/50 transition-all duration-300 z-50 shadow-3 ${isAnalyticsPanelOpen ? 'w-[30%]' : 'w-[12px]'}`}>
          {/* Toggle Button - Top Right Corner */}
          <button
            onClick={() => setIsAnalyticsPanelOpen(!isAnalyticsPanelOpen)}
            className="absolute top-14 -left-10 h-10 w-10 bg-background/90 backdrop-blur-lg border border-border/50 rounded-lg hover:bg-accent/10 hover:border-primary/30 transition-all duration-300 flex items-center justify-center shadow-2 group"
          >
            {isAnalyticsPanelOpen ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>

          {isAnalyticsPanelOpen && (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="mb-4 text-center shrink-0">
                  <h3 className="text-base font-semibold text-foreground">Analytics</h3>
                </div>

                {/* Compact KPI Cards */}
                <div className="grid grid-cols-2 gap-2 mb-4 shrink-0">
                  <div className="p-2.5 rounded-lg bg-muted/30 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground font-medium">Total</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">{stats.total}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-success/10 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                      <p className="text-xs text-success font-medium">With Email</p>
                    </div>
                    <p className="text-xl font-bold text-success">{stats.withEmail}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-accent/10 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-3.5 w-3.5 text-accent" />
                      <p className="text-xs text-accent font-medium">Starred</p>
                    </div>
                    <p className="text-xl font-bold text-accent">{stats.starred}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-primary/10 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <FolderOpen className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs text-primary font-medium">Sources</p>
                    </div>
                    <p className="text-xl font-bold text-primary">{listDetails.sourcesCount || 0}</p>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  <p>More analytics coming soon...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Bar for Multi-Select Mode */}
      {isMultiSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border shadow-3 z-50 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {selectedCandidateIds.size} candidate{selectedCandidateIds.size !== 1 ? 's' : ''} selected
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedCandidateIds(new Set());
                  setMultiSelectAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedCandidateIds.size === 0) {
                    toast({
                      title: "No Selection",
                      description: "Please select at least one candidate",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Get selected candidates data
                  const selectedCandidatesData = candidates.filter(c =>
                    selectedCandidateIds.has(c.id)
                  ).map(c => ({
                    id: c.id,
                    name: c.name || c.personalInfo?.name || 'Unknown',
                    email: c.email || c.personalInfo?.email
                  }));

                  // Exit multi-select mode and open modal
                  setIsMultiSelectMode(false);
                  setSelectedCandidateForList(selectedCandidatesData);
                  setIsAddToListModalOpen(true);
                }}
                disabled={selectedCandidateIds.size === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Curated List Modal */}
      {selectedCandidateForList && (
        <AddToQualifiedListModal
          isOpen={isAddToListModalOpen}
          onClose={() => {
            setIsAddToListModalOpen(false);
            setSelectedCandidateForList(null);
            setSelectedCandidateIds(new Set());
            setMultiSelectAction(null);
          }}
          selectedCandidates={Array.isArray(selectedCandidateForList) ? selectedCandidateForList : [
            {
              id: selectedCandidateForList.id,
              name: selectedCandidateForList.name || selectedCandidateForList.personalInfo?.name || 'Unknown',
              email: selectedCandidateForList.email || selectedCandidateForList.personalInfo?.email
            }
          ]}
          sourceListId={listId}
          sourceProjectId={sourceProjectId || undefined}
          onSuccess={() => {
            toast({
              title: "Success",
              description: "Candidates added to curated list"
            });
            setSelectedCandidateIds(new Set());
            setMultiSelectAction(null);
            // F4: refresh the list so the freshly-added candidate row
            // reflects whatever the latest scores/tags are (post-F3
            // those are denormalized on the candidate doc by the
            // reviewer agent). Without this, the modal closes but the
            // page keeps showing the pre-add snapshot.
            loadListData();
          }}
          initialMode={multiSelectAction === 'create-new' ? 'create-new' : 'select-list'}
        />
      )}

      {/* Candidate Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
