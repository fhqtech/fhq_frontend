/**
 * P2-4 — redirect a legacy route to the new role surface when one_builder is on,
 * otherwise render the legacy element. Keeps both routes reachable during the
 * flag window so deep links never 404 and the pilot is untouched with the flag off.
 */
import { type ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useFlag } from "@/lib/flags/FlagProvider";

export interface OneBuilderRedirectProps {
  /** Builds the new-surface path from the matched route params. */
  to: (params: Record<string, string | undefined>) => string;
  children: ReactNode;
}

export function OneBuilderRedirect({ to, children }: OneBuilderRedirectProps) {
  const oneBuilder = useFlag("one_builder");
  const params = useParams();
  if (oneBuilder) return <Navigate to={to(params)} replace />;
  return <>{children}</>;
}

export default OneBuilderRedirect;
