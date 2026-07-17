/**
 * P3-2 — the /lists gate. Unified IA is live workspace-wide, so /lists always
 * renders the unified Shortlists surface (named + curated lists merged behind
 * one "qualified is a filter" view). ShortlistsView is lazy so it splits into
 * its own chunk. Route wiring in App.tsx is unchanged — it still imports
 * `./pages/Lists`.
 */
import { lazy, Suspense } from "react";
import { PageSkeleton } from "@/components/ui/shimmer";

const ShortlistsView = lazy(() => import("../../components/lists/ShortlistsView"));

export default function ListsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ShortlistsView />
    </Suspense>
  );
}
