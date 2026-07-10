/**
 * P3-2 — ShortlistsView. The container half of the Lists+Qualified merge
 * (behind the `talent` flag). Fetches the project's named lists and curated
 * (qualified) lists — the same two sources the legacy YourListsTab loads — folds
 * them into one row list via buildShortlists, and hands them to ShortlistsList.
 *
 * No new backend: reuses listsApi.getProjectLists + qualifiedListsApi
 * .getProjectQualifiedLists. Storage, collection ids, and API paths are
 * untouched; only the presented vocabulary is unified to "shortlists".
 */
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { listsApi } from "@/services/listsApi";
import { qualifiedListsApi } from "@/services/qualifiedListsApi";
import { buildShortlists } from "@/lib/buildShortlists";
import { ShortlistsList } from "./ShortlistsList";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageSkeleton } from "@/components/ui/shimmer";
import { Bookmark } from "lucide-react";

export default function ShortlistsView() {
  const { currentWorkspace, currentProject } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const projectId = currentProject?.id;
  const enabled = Boolean(workspaceId && projectId);

  const query = useQuery({
    queryKey: ["shortlists", workspaceId, projectId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const [lists, qualified] = await Promise.all([
        listsApi.getProjectLists(workspaceId!, projectId!),
        qualifiedListsApi.getProjectQualifiedLists(workspaceId!, projectId!),
      ]);
      return buildShortlists(lists, qualified);
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header>
        <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">Shortlists</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Your shortlists</h1>
        <p className="mt-2 max-w-[65ch] text-base text-ink-soft">
          Named lists and curated shortlists in one place. Filter by kind, or search by name.
        </p>
      </header>

      {!enabled ? (
        <EmptyState
          icon={Bookmark}
          title="No project selected"
          description="Pick a project to see its shortlists."
        />
      ) : query.isPending ? (
        <PageSkeleton header={false} cards={0} rows={6} cols={2} message="Loading your shortlists…" />
      ) : query.error ? (
        <ErrorBanner
          tone="danger"
          title="Couldn't load shortlists"
          description={query.error instanceof Error ? query.error.message : "Please retry."}
          retryLabel="Retry"
          onRetry={() => query.refetch()}
        />
      ) : (
        <ShortlistsList rows={query.data ?? []} />
      )}
    </div>
  );
}
