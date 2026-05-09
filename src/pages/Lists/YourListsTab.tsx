import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Users as UsersIcon, Sparkles, Brain, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { listsApi, CandidateList } from '@/services/listsApi';
import { qualifiedListsApi } from '@/services/qualifiedListsApi';
import { ListCard } from '@/components/analytics/ListCard';
import { EmptyListCard } from '@/components/analytics/EmptyListCard';
import { AnalyticsList } from '@/types/analytics';
import { CreateListDialog } from './components/CreateListDialog';
import { EditListDialog } from './components/EditListDialog';
import { ShareListDialog } from './components/ShareListDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { SourceConfigModal } from '@/components/sources/SourceConfigModal';
import { WalkingLoader } from '@/components/ui/WalkingLoader';
import doggieSvg from '@/assets/empty-state-lists-page/doggie.svg';

interface YourListsTabProps {
  onStatsUpdate?: (stats: { totalLists: number; totalCandidates: number; avgDiversity: number; allStarred: number }) => void;
  onCandidatesUpdate?: (candidates: any[]) => void;
}

export const YourListsTab = forwardRef((props: YourListsTabProps, ref) => {
  const { onStatsUpdate, onCandidatesUpdate } = props;
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const cardRefsRef = useRef<Record<string, HTMLDivElement>>({});

  const [lists, setLists] = useState<CandidateList[]>([]);
  const [qualifiedLists, setQualifiedLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<CandidateList | null>(null);
  const [selectedQualifiedList, setSelectedQualifiedList] = useState<any | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [allProjects, setAllProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<'all' | 'normal' | 'curated'>('all');

  // Enhancement tracking
  const [enhancementLoadingIds, setEnhancementLoadingIds] = useState<Set<string>>(new Set());
  const [listEnhancements, setListEnhancements] = useState<Record<string, any>>({});
  const [listSources, setListSources] = useState<Record<string, any[]>>({});
  const [addingSourceForList, setAddingSourceForList] = useState<string | null>(null);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useImperativeHandle(ref, () => ({
    handleCreateClick: () => setShowCreateDialog(true)
  }));

  useEffect(() => {
    if (currentWorkspace && currentProject) {
      loadLists();
      loadAvailableProjects();
    }
  }, [currentWorkspace, currentProject]);

  // Update stats when lists or enhancements change
  useEffect(() => {
    if (onStatsUpdate) {
      const regularCandidates = lists.reduce((sum, list) => sum + (list.totalCandidates || 0), 0);
      const qualifiedCandidates = qualifiedLists.reduce((sum, list) => sum + (list.totalCandidates || 0), 0);
      const totalCandidates = regularCandidates + qualifiedCandidates;

      const totalStarred = Object.values(listEnhancements).reduce((sum, enh: any) => sum + (enh?.starredCount || 0), 0);
      const diversityScores = Object.values(listEnhancements)
        .map((enh: any) => enh?.aiInsights?.diversityScore)
        .filter((score): score is number => typeof score === 'number');
      const avgDiversity = diversityScores.length > 0
        ? Math.round(diversityScores.reduce((sum, score) => sum + score, 0) / diversityScores.length)
        : 0;

      onStatsUpdate({
        totalLists: lists.length + qualifiedLists.length,
        totalCandidates,
        avgDiversity,
        allStarred: totalStarred
      });
    }

    // Don't send candidates to analytics - let it fetch from API
    // The ScoreDistributionChart will call /api/scores/all directly
  }, [lists, qualifiedLists, listEnhancements, onStatsUpdate, onCandidatesUpdate]);

  const loadAvailableProjects = async () => {
    if (!currentWorkspace) {
      console.log('No currentWorkspace, skipping loadAvailableProjects');
      return;
    }

    console.log('Loading available projects for workspace:', currentWorkspace.id);
    console.log('Current project ID:', currentProject?.id);

    try {
      // Fetch all projects in the workspace
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${currentWorkspace.id}/projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      console.log('Projects API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched projects data:', data);

        // The API returns an array directly, not { projects: [...] }
        const projectsList = Array.isArray(data) ? data : (data.projects || []);
        console.log('All projects:', projectsList);
        console.log('Number of projects in workspace:', projectsList.length);
        console.log('All project IDs:', projectsList.map((p: any) => p.id));

        // Store all projects for display purposes
        const allProjectsData = projectsList.map((p: any) => ({ id: p.id, name: p.name }));
        setAllProjects(allProjectsData);

        // Filter out current project for sharing
        const otherProjects = projectsList
          .filter((p: any) => {
            const isCurrentProject = p.id === currentProject?.id;
            console.log(`Project ${p.id} (${p.name}): isCurrentProject=${isCurrentProject}`);
            return !isCurrentProject;
          })
          .map((p: any) => ({ id: p.id, name: p.name }));

        console.log('Available projects for sharing (after filter):', otherProjects);
        console.log('Number of available projects:', otherProjects.length);
        setAvailableProjects(otherProjects);
      } else {
        console.error('Failed to fetch projects:', response.status);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadLists = async () => {
    if (!currentWorkspace || !currentProject) return;

    try {
      setLoading(true);

      // Load both regular lists and qualified lists
      const [regularLists, projectQualifiedLists] = await Promise.all([
        listsApi.getProjectLists(currentWorkspace.id, currentProject.id),
        qualifiedListsApi.getProjectQualifiedLists(currentWorkspace.id, currentProject.id)
      ]);

      setLists(regularLists);
      setQualifiedLists(projectQualifiedLists);

      // Load enhancements for regular lists
      if (regularLists.length > 0) {
        enhanceListsData(regularLists);
        loadSourcesForLists(regularLists);
      }

      // Load enhancements and sources for qualified lists
      if (projectQualifiedLists.length > 0) {
        enhanceQualifiedListsData(projectQualifiedLists);
        loadSourcesForQualifiedLists(projectQualifiedLists);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load lists',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load enhancement data for all lists
  const enhanceListsData = async (listsToEnhance: CandidateList[]) => {
    if (listsToEnhance.length === 0 || !currentWorkspace) return;

    try {
      const listIds = listsToEnhance.map(l => l.id);
      setEnhancementLoadingIds(new Set(listIds));

      const enhancements = await listsApi.enhanceListsBatch(currentWorkspace.id, listIds);
      setListEnhancements(prev => ({ ...prev, ...enhancements }));
    } catch (error) {
      console.error('Error enhancing lists:', error);
    } finally {
      setEnhancementLoadingIds(new Set());
    }
  };

  // Load sources for all lists
  const loadSourcesForLists = async (listsToLoad: CandidateList[]) => {
    if (!currentWorkspace) return;

    for (const list of listsToLoad) {
      try {
        const sources = await listsApi.getProjectListSources(currentWorkspace.id, currentProject.id, list.id);
        setListSources(prev => ({ ...prev, [list.id]: sources }));
      } catch (error) {
        console.error(`Error loading sources for list ${list.id}:`, error);
        setListSources(prev => ({ ...prev, [list.id]: [] }));
      }
    }
  };

  // Load enhancement data for qualified lists
  const enhanceQualifiedListsData = async (listsToEnhance: any[]) => {
    if (listsToEnhance.length === 0 || !currentWorkspace) return;

    try {
      const listIds = listsToEnhance.map(l => l.id);
      setEnhancementLoadingIds(prev => new Set([...prev, ...listIds]));

      const enhancements = await qualifiedListsApi.enhanceBatch(currentWorkspace.id, listIds);
      setListEnhancements(prev => ({ ...prev, ...enhancements }));
    } catch (error) {
      console.error('Error enhancing qualified lists:', error);
    } finally {
      setEnhancementLoadingIds(prev => {
        const newSet = new Set(prev);
        listsToEnhance.forEach(l => newSet.delete(l.id));
        return newSet;
      });
    }
  };

  // Load sources for qualified lists
  const loadSourcesForQualifiedLists = async (listsToLoad: any[]) => {
    if (!currentWorkspace) return;

    for (const list of listsToLoad) {
      try {
        const sources = await qualifiedListsApi.getQualifiedListSources(currentWorkspace.id, list.id);
        setListSources(prev => ({ ...prev, [list.id]: sources }));
      } catch (error) {
        console.error(`Error loading sources for qualified list ${list.id}:`, error);
        setListSources(prev => ({ ...prev, [list.id]: [] }));
      }
    }
  };

  const handleCreateList = () => {
    // Reload lists after creation
    loadLists();
  };

  const handleUpdateList = async (listData: { name: string; description?: string; tags?: string[]; color?: string }) => {
    if (!currentWorkspace || !currentProject || !selectedList) return;

    try {
      await listsApi.updateProjectList(currentWorkspace.id, currentProject.id, selectedList.id, listData);
      toast({
        title: 'Success',
        description: 'List updated successfully',
      });
      setShowEditDialog(false);
      setSelectedList(null);
      loadLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update list',
        variant: 'destructive',
      });
    }
  };

  const handleShareList = async (targetProjectIds: string[]) => {
    if (!currentWorkspace || !currentProject || !selectedList) return;

    try {
      await listsApi.shareProjectList(currentWorkspace.id, currentProject.id, selectedList.id, targetProjectIds);
      toast({
        title: 'Success',
        description: `List shared with ${targetProjectIds.length} project(s)`,
      });
      setShowShareDialog(false);
      setSelectedList(null);
      loadLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share list',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteQualifiedList = async () => {
    if (!currentWorkspace || !currentProject || !selectedQualifiedList) return;

    try {
      await qualifiedListsApi.deleteQualifiedListProject(currentWorkspace.id, currentProject.id, selectedQualifiedList.id);
      toast({
        title: 'Success',
        description: 'Curated list deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedQualifiedList(null);
      loadLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete curated list',
        variant: 'destructive',
      });
    }
  };

  const handleSyncSource = async (listId: string, sourceId: string) => {
    if (!currentWorkspace || !currentProject) return;

    try {
      const result = await listsApi.syncNewCandidatesFromProjectListSource(currentWorkspace.id, currentProject.id, listId, sourceId);
      toast({
        title: 'Source Synced',
        description: result.message || `Added ${result.addedCandidates} new candidates`,
      });

      // Only update the specific list that was synced
      const updatedList = await listsApi.getProjectList(currentWorkspace.id, currentProject.id, listId);
      setLists(prev => prev.map(l => l.id === listId ? updatedList : l));

      // Re-enhance only the updated list
      const enhancements = await listsApi.enhanceListsBatch(currentWorkspace.id, [listId]);
      setListEnhancements(prev => ({ ...prev, ...enhancements }));

      // Reload sources for the updated list
      const sources = await listsApi.getProjectListSources(currentWorkspace.id, currentProject.id, listId);
      setListSources(prev => ({ ...prev, [listId]: sources }));
    } catch (error) {
      console.error('Error syncing source:', error);
      throw error;
    }
  };

  const handleAddSource = (listId: string) => {
    setAddingSourceForList(listId);
  };

  const handleSourceConfigSave = async (sourceData: any) => {
    if (!addingSourceForList || !currentWorkspace) return;

    try {
      await listsApi.addSourceToList(currentWorkspace.id, addingSourceForList, sourceData);
      toast({
        title: 'Source Added',
        description: 'Google Sheet source has been added successfully.',
      });
      await loadLists();
      setAddingSourceForList(null);
    } catch (error) {
      console.error('Error adding source:', error);
      toast({
        title: 'Error Adding Source',
        description: error instanceof Error ? error.message : 'Failed to add source.',
        variant: 'destructive'
      });
    }
  };

  const handleViewList = (listId: string) => {
    // Navigate to list detail view
    window.location.href = `/lists/${listId}`;
  };

  const handleDeleteList = async () => {
    if (!currentWorkspace || !currentProject || !selectedList) return;

    try {
      await listsApi.deleteProjectList(currentWorkspace.id, currentProject.id, selectedList.id);
      toast({
        title: 'Success',
        description: 'List deleted successfully',
      });
      setShowDeleteDialog(false);
      setSelectedList(null);
      loadLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete list',
        variant: 'destructive',
      });
    }
  };

  // Transform lists to AnalyticsList format for ListCard component
  const transformedLists: AnalyticsList[] = lists.map((list) => {
    const enhancement = listEnhancements[list.id];
    const isLoading = enhancementLoadingIds.has(list.id);

    const candidates = enhancement?.sampleCandidates
      ? enhancement.sampleCandidates.map((candidate: any) => ({
          ...candidate,
          stage: 'screening' as const,
          scores: { overall: 75 },
          profilePicture: undefined
        }))
      : [];

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      color: undefined,
      candidates: candidates,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || list.createdAt,
      totalCandidates: list.totalCandidates || 0,
      sourcesCount: (list as any).usedInInterviews?.length || 0,
      starredCount: enhancement?.starredCount || 0,
      sharedWith: (list as any).sharedWith || [],
      averageScore: 0,
      topSkills: [],
      aiInsights: enhancement?.aiInsights || (list as any).aiInsights || (isLoading ? undefined : {
        summary: '',
        topSkill: '',
        diversityScore: 0,
        recommendations: []
      }),
      isEnhancementLoading: isLoading,
      isShared: (list as any).isShared || false
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex flex-col items-center">
          <WalkingLoader />
          <p className="text-muted-foreground mt-6">Loading candidate pools...</p>
        </div>
      </div>
    );
  }

  // Transform qualified lists to AnalyticsList format
  const transformedQualifiedLists: AnalyticsList[] = qualifiedLists.map((list) => {
    const sources = listSources[list.id] || [];
    const enhancement = listEnhancements[list.id];
    const isLoading = enhancementLoadingIds.has(list.id);

    const candidates = enhancement?.sampleCandidates
      ? enhancement.sampleCandidates.map((candidate: any) => ({
          ...candidate,
          stage: 'screening' as const,
          scores: { overall: 75 },
          profilePicture: undefined
        }))
      : [];

    return {
      id: list.id,
      name: list.name,
      description: list.description || '',
      color: '#eab308', // Yellow-500 color for curated lists
      candidates: candidates,
      createdAt: list.createdAt || new Date().toISOString(),
      updatedAt: list.updatedAt || list.createdAt || new Date().toISOString(),
      totalCandidates: list.totalCandidates || 0,
      sourcesCount: sources.length,
      starredCount: enhancement?.starredCount || 0,
      sharedWith: (list as any).sharedWith || [],
      averageScore: 0,
      topSkills: [],
      aiInsights: enhancement?.aiInsights || (isLoading ? undefined : {
        summary: 'Curated candidate list',
        topSkill: '',
        diversityScore: 0,
        recommendations: []
      }),
      isEnhancementLoading: isLoading,
      isQualified: true
    };
  });

  // Combine qualified and regular lists based on filter
  let allLists: AnalyticsList[] = [];
  if (listFilter === 'all') {
    allLists = [...transformedQualifiedLists, ...transformedLists];
  } else if (listFilter === 'curated') {
    allLists = transformedQualifiedLists;
  } else if (listFilter === 'normal') {
    allLists = transformedLists;
  }

  // Filter lists based on search query
  const filteredLists = allLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (list.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* AI Generate List Card - Hidden for now, to be worked on later */}
      {/* {allLists.length > 0 && (
        <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Generate AI Candidate Pool</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Powered
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create curated talent pools based on interview analysis and skills
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => setShowCreateDialog(true)}
              >
                <Sparkles className="h-4 w-4" />
                Generate Candidate Pool
              </Button>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Search and Filters - Sticky - Only show when there are lists */}
      {allLists.length > 0 && (
        <div className="sticky top-0 z-10 bg-gray-50 pb-4 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidate pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={listFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setListFilter('all')}
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider text-xs font-bold ${listFilter === 'all' ? 'bg-black hover:bg-slate-800 text-white' : ''}`}
            >
              All
            </Button>
            <Button
              variant={listFilter === 'normal' ? 'default' : 'outline'}
              onClick={() => setListFilter('normal')}
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider text-xs font-bold ${listFilter === 'normal' ? 'bg-black hover:bg-slate-800 text-white' : ''}`}
            >
              Normal
            </Button>
            <Button
              variant={listFilter === 'curated' ? 'default' : 'outline'}
              onClick={() => setListFilter('curated')}
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider text-xs font-bold ${listFilter === 'curated' ? 'bg-black hover:bg-slate-800 text-white' : ''}`}
            >
              Curated
            </Button>
          </div>
        </div>
      )}

      {/* Combined Lists Section */}
      {allLists.length === 0 ? (
        <div className="text-center py-8">
          <img src={doggieSvg} alt="No pools" className="w-96 h-96 mx-auto mb-6 object-contain" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3 uppercase tracking-wider">No candidate pools yet</h3>
          <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider">
            Create your first candidate pool to start organizing candidates
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-black hover:bg-slate-800 text-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Create Candidate Pool
          </Button>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No candidate pools match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-[95%]">
          {filteredLists.map((list) => {
            const sources = listSources[list.id] || [];
            const isQualifiedList = (list as any).isQualified;

            return (
              <div
                key={list.id}
                ref={(el) => {
                  if (el) {
                    cardRefsRef.current[list.id] = el;
                  }
                }}
              >
                <ListCard
                  list={list}
                  onClick={() => {
                    if (isQualifiedList) {
                      window.location.href = `/lists/${list.id}`;
                    } else {
                      handleViewList(list.id);
                    }
                  }}
                  onDelete={() => {
                    if (isQualifiedList) {
                      const originalList = qualifiedLists.find(l => l.id === list.id);
                      if (originalList) {
                        setSelectedQualifiedList(originalList);
                        setShowDeleteDialog(true);
                      }
                    } else {
                      const originalList = lists.find(l => l.id === list.id);
                      if (originalList) {
                        setSelectedList(originalList);
                        setShowDeleteDialog(true);
                      }
                    }
                  }}
                  onShare={async (projectIds) => {
                    if (!currentWorkspace || !currentProject) return;

                    try {
                      if (isQualifiedList) {
                        await qualifiedListsApi.shareQualifiedList(currentWorkspace.id, currentProject.id, list.id, projectIds);
                      } else {
                        await listsApi.shareProjectList(currentWorkspace.id, currentProject.id, list.id, projectIds);
                      }

                      toast({
                        title: 'Success',
                        description: `${isQualifiedList ? 'Curated list' : 'List'} shared with ${projectIds.length} project(s)`,
                      });
                      await loadLists();
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to share list',
                        variant: 'destructive',
                      });
                    }
                  }}
                  onCopy={async (listId, listName, isQualified) => {
                    if (!currentWorkspace || !currentProject) return;

                    try {
                      const newName = `Copy of ${listName}`;

                      if (isQualified) {
                        await qualifiedListsApi.copyQualifiedList(currentWorkspace.id, currentProject.id, listId, newName);
                      } else {
                        await listsApi.copyList(currentWorkspace.id, currentProject.id, listId, newName);
                      }

                      toast({
                        title: 'Success',
                        description: `${isQualified ? 'Curated list' : 'List'} copied successfully`,
                      });
                      await loadLists();
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to copy list',
                        variant: 'destructive',
                      });
                    }
                  }}
                  sources={sources}
                  onSyncSource={(sourceId) => handleSyncSource(list.id, sourceId)}
                  onAddSource={handleAddSource}
                  sharedProjects={
                    (() => {
                      console.log(`List ${list.name} sharedWith:`, list.sharedWith);
                      console.log(`All projects available:`, allProjects);
                      const shared = list.sharedWith
                        ? list.sharedWith.map(projectId => {
                            const project = allProjects.find(p => p.id === projectId);
                            console.log(`Looking for project ${projectId}, found:`, project);
                            return project || { id: projectId, name: 'Unknown Project' };
                          })
                        : [];
                      console.log(`Shared projects for ${list.name}:`, shared);
                      return shared;
                    })()
                  }
                  availableProjects={availableProjects}
                />
              </div>
            );
          })}

          {/* Create New List Card */}
          <div className="md:col-span-1 lg:col-span-1 flex items-center">
            <EmptyListCard onClick={() => setShowCreateDialog(true)} />
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateListDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateList}
      />

      {showEditDialog && selectedList && (
        <EditListDialog
          open={showEditDialog}
          list={selectedList}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedList(null);
          }}
          onUpdate={handleUpdateList}
        />
      )}

      {showShareDialog && selectedList && (
        <ShareListDialog
          open={showShareDialog}
          list={selectedList}
          onClose={() => {
            setShowShareDialog(false);
            setSelectedList(null);
          }}
          onShare={handleShareList}
        />
      )}

      {showDeleteDialog && (selectedList || selectedQualifiedList) && (
        <DeleteConfirmDialog
          open={showDeleteDialog}
          listName={selectedList?.name || selectedQualifiedList?.name || ''}
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedList(null);
            setSelectedQualifiedList(null);
          }}
          onConfirm={selectedQualifiedList ? handleDeleteQualifiedList : handleDeleteList}
        />
      )}

      {/* Source Config Modal */}
      {addingSourceForList && (
        <SourceConfigModal
          isOpen={true}
          onClose={() => setAddingSourceForList(null)}
          onSave={handleSourceConfigSave}
          sourceType="google_sheet"
        />
      )}
    </div>
  );
});
