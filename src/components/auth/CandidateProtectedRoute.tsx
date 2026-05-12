import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';

interface CandidateProtectedRouteProps {
  children: ReactNode;
}

/**
 * Gate a candidate-side route on a valid candidate JWT.
 *
 * Mirrors the recruiter `ProtectedRoute` but reads
 * `CandidateAuthContext`. Falls back to /candidate/login while
 * preserving the intended path via state so we can redirect post-login.
 */
const CandidateProtectedRoute: React.FC<CandidateProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useCandidateAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/candidate/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default CandidateProtectedRoute;
