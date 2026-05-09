import React, { useState, useEffect, useRef } from 'react';
import { Users as UsersIcon, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { listsApi, CandidateList } from '@/services/listsApi';
import { qualifiedListsApi } from '@/services/qualifiedListsApi';
import { ListCard } from '@/components/analytics/ListCard';
import { AnalyticsList } from '@/types/analytics';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import coffeeSvg from '@/assets/empty-state-lists-page/coffee.svg';

export function SharedListsTab() {
  const { toast } = useToast();
  const { currentWorkspace, currentProject } = useWorkspace();
  const cardRefsRef = useRef<Record<string, HTMLDivElement>>({});

  const [sharedLists, setSharedLists] = useState<CandidateList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<'all' | 'normal' | 'curated'>('all');

  // Enhancement tracking
  const [enhancementLoadingIds, setEnhancementLoadingIds] = useState<Set<string>>(new Set());
  const [listEnhancements, setListEnhancements] = useState<Record<string, any>>({});
  const [listSources, setListSources] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (currentWorkspace && currentProject) {
      loadSharedLists();
    }
  }, [currentWorkspace, currentProject]);

  const loadSharedLists = async () => {
    if (!currentWorkspace || !currentProject) return;

    try {
      setLoading(true);

      // Load both regular shared lists and shared qualified lists
      const [regularSharedLists, qualifiedSharedLists] = await Promise.all([
        listsApi.getSharedLists(currentWorkspace.id, currentProject.id),
        qualifiedListsApi.getSharedQualifiedLists(currentWorkspace.id, currentProject.id)
      ]);

      // Mark qualified lists with isQualified flag
      const markedQualifiedLists = qualifiedSharedLists.map(list => ({ ...list, isQualified: true }));

      // Combine both types of shared lists
      const allSharedLists = [...regularSharedLists, ...markedQualifiedLists];
      setSharedLists(allSharedLists);

      // Load enhancements for lists
      if (allSharedLists.length > 0) {
        enhanceListsData(allSharedLists);
        loadSourcesForLists(allSharedLists);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load shared lists',
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
      // Separate regular and qualified lists
      const regularLists = listsToEnhance.filter(l => !(l as any).isQualified);
      const qualifiedLists = listsToEnhance.filter(l => (l as any).isQualified);

      const allListIds = listsToEnhance.map(l => l.id);
      setEnhancementLoadingIds(new Set(allListIds));

      // Fetch enhancements for both types in parallel
      const [regularEnhancements, qualifiedEnhancements] = await Promise.all([
        regularLists.length > 0
          ? listsApi.enhanceListsBatch(currentWorkspace.id, regularLists.map(l => l.id))
          : Promise.resolve({}),
        qualifiedLists.length > 0
          ? qualifiedListsApi.enhanceBatch(currentWorkspace.id, qualifiedLists.map(l => l.id))
          : Promise.resolve({})
      ]);

      // Combine enhancements
      setListEnhancements(prev => ({ ...prev, ...regularEnhancements, ...qualifiedEnhancements }));
    } catch (error) {
      console.error('Error enhancing lists:', error);
    } finally {
      setEnhancementLoadingIds(new Set());
    }
  };

  // Load sources for all lists
  const loadSourcesForLists = async (listsToLoad: CandidateList[]) => {
    if (!currentWorkspace || !currentProject) return;

    for (const list of listsToLoad) {
      try {
        const sources = await listsApi.getListSources(currentWorkspace.id, currentProject.id, list.id);
        setListSources(prev => ({ ...prev, [list.id]: sources }));
      } catch (error) {
        console.error(`Error loading sources for list ${list.id}:`, error);
        setListSources(prev => ({ ...prev, [list.id]: [] }));
      }
    }
  };

  const handleViewList = (listId: string, sourceProjectId?: string, isQualified?: boolean) => {
    // Navigate to list detail view with source project info for shared lists
    if (sourceProjectId) {
      window.location.href = `/lists/${listId}?sourceProjectId=${sourceProjectId}&isShared=true${isQualified ? '&isQualified=true' : ''}`;
    } else {
      window.location.href = `/lists/${listId}`;
    }
  };

  // Transform lists to AnalyticsList format for ListCard component
  const transformedLists: AnalyticsList[] = sharedLists.map((list) => {
    const enhancement = listEnhancements[list.id];
    const isLoading = enhancementLoadingIds.has(list.id);
    const isQualified = (list as any).isQualified || false;

    const candidates = enhancement?.sampleCandidates
      ? enhancement.sampleCandidates.map((candidate: any) => ({
          ...candidate,
          stage: 'screening' as const,
          scores: { overall: 75 },
          profilePicture: undefined
        }))
      : [];

    // Get sourceProjectId from sharedInfo or direct property
    const sourceProjectId = (list as any).sharedInfo?.sourceProjectId || (list as any).sourceProjectId;

    return {
      id: list.id,
      name: list.name,
      description: list.description,
      color: isQualified ? '#eab308' : '#3b82f6', // Yellow for qualified, blue for regular
      candidates: candidates,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || list.createdAt,
      totalCandidates: list.totalCandidates || 0,
      sourcesCount: (list as any).usedInInterviews?.length || 0,
      starredCount: enhancement?.starredCount || 0,
      averageScore: 0,
      topSkills: [],
      aiInsights: enhancement?.aiInsights || {
        summary: isLoading ? undefined : (isQualified ? 'Curated candidate list' : ''),
        recommendations: []
      },
      isEnhancementLoading: isLoading,
      isShared: true, // Mark as shared
      isQualified: isQualified,
      sourceProjectId: sourceProjectId
    };
  });

  // Apply filters
  let filteredLists = transformedLists;

  // Filter by type
  if (listFilter === 'normal') {
    filteredLists = filteredLists.filter(list => !list.isQualified);
  } else if (listFilter === 'curated') {
    filteredLists = filteredLists.filter(list => list.isQualified);
  }

  // Filter by search query
  if (searchQuery) {
    filteredLists = filteredLists.filter(list =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (list.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading shared candidate pools...</div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-1 pr-4 pb-4">
      {/* Search and Filters */}
      {sharedLists.length > 0 && (
        <div className="sticky top-0 z-10 bg-gray-50 pb-4 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shared candidate pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={listFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setListFilter('all')}
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${listFilter === 'all' ? 'bg-black hover:bg-slate-800 text-white' : ''}`}
            >
              All
            </Button>
            <Button
              variant={listFilter === 'normal' ? 'default' : 'outline'}
              onClick={() => setListFilter('normal')}
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${listFilter === 'normal' ? 'bg-black hover:bg-slate-800 text-white' : ''}`}
            >
              Normal
            </Button>
            <Button
              variant={listFilter === 'curated' ? 'default' : 'outline'}
              onClick={() => setListFilter('curated')}
              className={`rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${listFilter === 'curated' ? 'bg-black hover:bg-slate-800 text-white' : ''}`}
            >
              Curated
            </Button>
          </div>
        </div>
      )}

      {sharedLists.length === 0 ? (
        <div className="text-center py-8">
          <img src={coffeeSvg} alt="No shared pools" className="w-96 h-96 mx-auto mb-6 object-contain" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3 uppercase tracking-wider">No shared candidate pools</h3>
          <p className="text-sm text-gray-500 uppercase tracking-wider">
            When other projects share candidate pools with you, they'll appear here
          </p>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists found</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLists.map((list) => {
            const sources = listSources[list.id] || [];
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
                  onClick={() => handleViewList(list.id, list.sourceProjectId, list.isQualified)}
                  sources={sources}
                  readOnly={true}
                  onCopy={async (listId, listName, isQualified) => {
                    if (!currentWorkspace || !currentProject) return;

                    try {
                      const newName = `Copy of ${listName}`;

                      if (isQualified) {
                        await qualifiedListsApi.copyQualifiedList(currentWorkspace.id, currentProject.id, listId, newName);
                      } else {
                        await listsApi.copyList(currentWorkspace.id, currentProject.id, listId, newName, list.sourceProjectId);
                      }

                      toast({
                        title: 'Success',
                        description: `${isQualified ? 'Curated list' : 'List'} copied to your project successfully`,
                      });
                      // Optionally reload shared lists or just show success
                    } catch (error: any) {
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to copy list',
                        variant: 'destructive',
                      });
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
