import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyticsApi } from "@/services/analyticsApi";
import { AnalyticsList } from "@/types/analytics";
import { ListCard } from "@/components/analytics/ListCard";
import { EmptyListCard } from "@/components/analytics/EmptyListCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Loader2, Plus } from "lucide-react";
import { PageSkeleton } from "@/components/ui/shimmer";

export default function CandidateAnalytics() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<AnalyticsList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    setLoading(true);
    const data = await analyticsApi.getLists();
    setLists(data);
    setLoading(false);
  };

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (list.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <PageSkeleton header cards={4} rows={6} cols={5} message="Loading analytics…" />;
  }

  return (
    <div className="min-h-dvh bg-background p-6">
      <div className="container mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Candidate Analytics</h1>
          <p className="text-muted-foreground mt-2">
            View and analyze your candidate lists with detailed insights
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lists Grid */}
        {lists.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No lists yet"
            description="Create your first applicant list to get started."
            primaryAction={{ label: "Go to lists", onClick: () => navigate("/lists") }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onClick={() => navigate(`/analytics/list/${list.id}`)}
                  onDelete={() => {
                    // Optional: Implement delete
                  }}
                />
              ))}
              <EmptyListCard onClick={() => navigate("/lists")} />
            </div>

            {filteredLists.length === 0 && lists.length > 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No lists match your search</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
