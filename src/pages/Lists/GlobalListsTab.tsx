import React, { useState, useEffect, useRef } from 'react';
import { Globe, Users as UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { listsApi, CandidateList } from '@/services/listsApi';
import { ListCard } from '@/components/analytics/ListCard';
import { AnalyticsList } from '@/types/analytics';
import rollerSkatingSvg from '@/assets/empty-state-lists-page/roller-skating.svg';

export function GlobalListsTab() {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const cardRefsRef = useRef<Record<string, HTMLDivElement>>({});

  const [globalLists, setGlobalLists] = useState<CandidateList[]>([]);
  const [loading, setLoading] = useState(true);

  // Enhancement tracking
  const [enhancementLoadingIds, setEnhancementLoadingIds] = useState<Set<string>>(new Set());
  const [listEnhancements, setListEnhancements] = useState<Record<string, any>>({});
  const [listSources, setListSources] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (currentWorkspace) {
      loadGlobalLists();
    }
  }, [currentWorkspace]);

  const loadGlobalLists = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const data = await listsApi.getWorkspaceLists(currentWorkspace.id);
      setGlobalLists(data);

      // Load enhancements for lists
      if (data.length > 0) {
        enhanceListsData(data);
        loadSourcesForLists(data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load global lists',
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
        // Global lists don't have project context, use 'global' as projectId
        const sources = await listsApi.getListSources(currentWorkspace.id, 'global', list.id);
        setListSources(prev => ({ ...prev, [list.id]: sources }));
      } catch (error) {
        console.error(`Error loading sources for list ${list.id}:`, error);
        setListSources(prev => ({ ...prev, [list.id]: [] }));
      }
    }
  };

  const handleViewList = (listId: string) => {
    // Navigate to list detail view
    window.location.href = `/lists/${listId}`;
  };

  // Transform lists to AnalyticsList format for ListCard component
  const transformedLists: AnalyticsList[] = globalLists.map((list) => {
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
      color: '#10b981', // Green color for global lists
      candidates: candidates,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || list.createdAt,
      totalCandidates: list.totalCandidates || 0,
      sourcesCount: (list as any).usedInInterviews?.length || 0,
      starredCount: enhancement?.starredCount || 0,
      averageScore: 0,
      topSkills: [],
      aiInsights: enhancement?.aiInsights || {
        summary: isLoading ? undefined : '',
        recommendations: []
      },
      isEnhancementLoading: isLoading,
      isGlobal: true // Mark as global
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading global candidate pools...</div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-1 pr-4 pb-4">
      {globalLists.length === 0 ? (
        <div className="text-center py-8">
          <img src={rollerSkatingSvg} alt="No global pools" className="w-96 h-96 mx-auto mb-6 object-contain" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3 uppercase tracking-wider">No global candidate pools</h3>
          <p className="text-sm text-gray-500 uppercase tracking-wider">
            Workspace administrators can create global candidate pools in Control Tower
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transformedLists.map((list) => {
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
                  onClick={() => handleViewList(list.id)}
                  sources={sources}
                  readOnly={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
