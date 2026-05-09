import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TourGuardProps {
  children: ReactNode;
  fallbackRoute?: string;
}

/**
 * TourGuard component that manages tour flow for authenticated users
 * - Redirects to tour if user hasn't completed or skipped it
 * - Allows access to main app if tour is completed or skipped
 */
const TourGuard: React.FC<TourGuardProps> = ({
  children,
  fallbackRoute = '/quick-tour'
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Don't redirect if we're already on the tour page
  const isOnTourPage = location.pathname === '/quick-tour';

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Check tour status and redirect if needed
  const tourStatus = user.tourStatus || 'not_started';
  const needsTour = tourStatus === 'not_started' || tourStatus === 'in_progress';

  // Debug logging
  console.log('TourGuard Debug:', {
    currentPath: location.pathname,
    isOnTourPage,
    tourStatus,
    needsTour,
    user: user
  });

  // If user needs tour and isn't already on tour page, redirect to tour
  if (needsTour && !isOnTourPage) {
    return <Navigate to={fallbackRoute} replace />;
  }

  // Allow users to revisit the tour page anytime - don't redirect them away
  // This allows users who skipped or completed the tour to access it again

  // Render the protected content
  return <>{children}</>;
};

export default TourGuard;