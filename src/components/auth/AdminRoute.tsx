import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/spinner';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * P0-8 — admin-only guard. Gates the dev/test tools today and the /admin
 * console later on the workspace principal's is_superadmin flag. Unauthenticated
 * visitors return to the landing surface; authenticated non-admins are bounced
 * to their dashboard rather than shown an admin surface.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageSpinner label="Checking access…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!user?.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
