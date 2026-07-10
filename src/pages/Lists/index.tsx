/**
 * P3-2 — the /lists gate. Default-off: when `talent` is off this re-exports the
 * legacy ListsPage verbatim, so the running pilot is untouched. When `talent` is
 * on, /lists becomes the unified Shortlists surface (named + curated lists merged
 * behind one "qualified is a filter" view). ShortlistsView is lazy so the legacy
 * chunk is unchanged for the default path. Route wiring in App.tsx is unchanged —
 * it still imports `./pages/Lists`.
 */
import { lazy, Suspense } from "react";
import { useFlag } from "@/lib/flags/FlagProvider";
import { PageSkeleton } from "@/components/ui/shimmer";
import ListsPage from "./ListsPage";

const ShortlistsView = lazy(() => import("../../components/lists/ShortlistsView"));

export default function ListsRoute() {
  const shortlistsOn = useFlag("talent");
  if (!shortlistsOn) return <ListsPage />;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ShortlistsView />
    </Suspense>
  );
}
