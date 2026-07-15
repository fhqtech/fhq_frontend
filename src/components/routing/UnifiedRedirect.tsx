import { Navigate } from "react-router-dom";
import { useFlag } from "@/lib/flags/FlagProvider";
import type { ReactNode } from "react";

/**
 * unified_ia cutover helper. When the flag is on, this legacy route redirects
 * to its unified home; when off, it renders the original legacy element. Keeps
 * the whole consolidation revertible from one flag. Never wrap deep-link result
 * routes with this — only the retired create/list/nav surfaces.
 */
export function UnifiedRedirect({ to, children }: { to: string; children: ReactNode }) {
  const unifiedIa = useFlag("unified_ia");
  if (unifiedIa) return <Navigate to={to} replace />;
  return <>{children}</>;
}
