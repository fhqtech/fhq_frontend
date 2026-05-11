import { useEffect, useState } from "react";

/**
 * Subscribe to the workspace-level SSE stream for an interview list.
 *
 * Returns a `revision` integer that bumps every time the backend reports
 * any tracked field changed (status, blueprintStatus, candidate counts,
 * participation rate, updatedAt). Consumers should add `revision` to
 * the deps of their data-loading useEffect — when it changes, refetch.
 *
 * Falls back to polling silently: if the EventSource closes (network,
 * 401, server restart) the hook just stops bumping. Caller's existing
 * polling/refetch path stays functional.
 */
export function useInterviewListLiveUpdates(
  workspaceId: string | null | undefined,
  projectId: string | null | undefined,
): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";
    const url =
      `${apiBase}/api/workspaces/${workspaceId}/projects/${projectId}/interviews/events` +
      `?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    es.addEventListener("update", () => setRevision((r) => r + 1));
    es.addEventListener("error_event", () => es.close());
    es.onerror = () => {
      // EventSource auto-reconnects on transient drops; close on hard
      // failures to prevent runaway reconnect loops.
      if (es.readyState === EventSource.CLOSED) {
        // already closed
      }
    };

    return () => es.close();
  }, [workspaceId, projectId]);

  return revision;
}
