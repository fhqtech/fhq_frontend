import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/spinner';

interface TourGuardProps {
  children: ReactNode;
  /** Retained for API compatibility; not used after U1. */
  fallbackRoute?: string;
}

/**
 * Authenticated wrapper for recruiter routes.
 *
 * U1 (2026-05-12): previously this also force-redirected first-time
 * users to /quick-tour on every navigation when `tourStatus` was
 * 'not_started' or 'in_progress'. That made sidebar links no-ops —
 * every click bounced back to the tour. The Quick Tour is now
 * self-serve: it's still in the sidebar and at /quick-tour, but
 * recruiters can navigate freely from the moment they sign in.
 *
 * We keep the wrapper in App.tsx so a future "must complete tour
 * before X" requirement can re-introduce gating without touching
 * every route.
 */
const TourGuard: React.FC<TourGuardProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <PageSpinner label="Loading…" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default TourGuard;