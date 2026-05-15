import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { analyticsApi } from "@/services/analyticsApi";
import { AnalyticsCandidate } from "@/types/analytics";
import { CandidateCard } from "@/components/analytics/CandidateCard";
import { CandidateDrawer } from "@/components/analytics/CandidateDrawer";
import { ScoreDistributionChart } from "@/components/analytics/ScoreDistributionChart";
import { KPICard } from "@/components/analytics/KPICard";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Loader2, Users, TrendingUp, Star, CheckCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/shimmer";

export default function CandidateListDetail() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<AnalyticsCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<AnalyticsCandidate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  useEffect(() => {
    if (listId) {
      loadCandidates(1, true);
    }
  }, [listId]);

  const loadCandidates = async (pageNum: number, reset: boolean = false) => {
    if (!listId) return;

    if (reset) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const data = await analyticsApi.getListCandidates(listId, pageNum, 20);

    // Add default values for candidates without interview data
    const normalizedData = data.map(c => ({
      ...c,
      scores: c.scores || { overall: 0 },
      stage: c.stage || 'screening',
      starred: c.starred || false,
      eligibleForRoles: c.eligibleForRoles || []
    }));

    if (reset) {
      setCandidates(normalizedData);
    } else {
      setCandidates(prev => [...prev, ...normalizedData]);
    }

    // If we got less than 20, we've reached the end
    setHasMore(data.length === 20);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    console.log('🔵 Load more clicked', { loadingMore, hasMore, page });
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      console.log('🔵 Loading page', nextPage);
      setPage(nextPage);
      loadCandidates(nextPage, false);
    } else {
      console.log('🔴 Cannot load more', { loadingMore, hasMore });
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch =
        candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (candidate.role?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        candidate.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage = stageFilter === "all" || candidate.stage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [candidates, searchQuery, stageFilter]);

  const stats = useMemo(() => {
    const topPerformers = filteredCandidates.filter(c => c.starred).length;
    const eligible = filteredCandidates.filter(c => c.eligibleForRoles && c.eligibleForRoles.length > 0).length;
    const avgScore = filteredCandidates.length > 0
      ? filteredCandidates.reduce((sum, c) => sum + (c.scores.overall || 0), 0) / filteredCandidates.length
      : 0;
    const selected = filteredCandidates.filter(c => c.stage === 'selected').length;

    return { topPerformers, eligible, avgScore: avgScore.toFixed(0), selected };
  }, [filteredCandidates]);

  const handleViewCandidate = (candidate: AnalyticsCandidate) => {
    setSelectedCandidate(candidate);
    setDrawerOpen(true);
  };

  if (loading) {
    return <PageSkeleton header cards={3} rows={6} cols={5} message="Loading candidates…" />;
  }

  return (
    <div className="min-h-[100dvh] bg-background p-6">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/analytics/lists')}
            className="-ml-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lists
          </Button>
          <h1 className="text-2xl font-semibold">Candidate Analysis</h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            icon={Users}
            title="Total Candidates"
            value={filteredCandidates.length}
            variant="default"
          />
          <KPICard
            icon={CheckCircle}
            title="Eligible"
            value={stats.eligible}
            variant="success"
          />
          <KPICard
            icon={Star}
            title="Top Performers"
            value={stats.topPerformers}
            variant="accent"
          />
          <KPICard
            icon={TrendingUp}
            title="Avg Score"
            value={stats.avgScore}
            variant="primary"
          />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="screening">Screening</SelectItem>
              <SelectItem value="prelims">Preliminary</SelectItem>
              <SelectItem value="fitment">Fitment</SelectItem>
              <SelectItem value="final">Final Review</SelectItem>
              <SelectItem value="selected">Selected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Candidates Grid or Empty State */}
        {candidates.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No applicant data yet"
            description="Applicants will appear here once they complete interviews. Make sure interviews are assigned to this list."
          />
        ) : filteredCandidates.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matching applicants"
            description="No applicants match your filters. Loosen the filters above to see more."
          />
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScoreDistributionChart candidates={filteredCandidates} />
              <FunnelChart candidates={filteredCandidates} />
            </div>

            {/* Candidates Grid */}
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Candidates</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredCandidates.length} candidates with multi-stage AI assessments
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onViewDetails={handleViewCandidate}
                  />
                ))}
              </div>

              {/* Load More Button - only hide when searching */}
              {hasMore && !searchQuery && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="w-full sm:w-auto"
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

              {/* Debug info */}
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Debug: hasMore={String(hasMore)}, total loaded={candidates.length}, filtered={filteredCandidates.length}, page={page}, searchQuery={searchQuery || 'none'}, stageFilter={stageFilter}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Candidate Detail Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
