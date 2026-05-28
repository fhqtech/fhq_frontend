import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { identify, reset as analyticsReset, track, Events } from '@/lib/analytics';

export type PlanId = 'free' | 'pro' | 'enterprise';
export type PlanStatus = 'active' | 'past_due' | 'canceled';
export type FeatureLevel = 'NONE' | 'VIEW' | 'EDIT' | 'PARTIAL' | 'FULL';

export interface ActiveWorkspacePlan {
  workspaceId: string;
  plan: PlanId;
  status: PlanStatus;
  expiresAt: string | null;
  features: Record<string, FeatureLevel>;
  limits: Record<string, number | null>;
  credits: {
    remaining: number;
    granted: number;
    consumed: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'email' | 'google';
  tourStatus?: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  // Workspace fields
  workspaceIds?: string[];
  ownedWorkspaceId?: string;
  activeWorkspaceId?: string;
  activeProjectId?: string;
  // Plan + access (P-Plans)
  is_superadmin?: boolean;
  activeWorkspacePlan?: ActiveWorkspacePlan | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateTourStatus: (status: 'not_started' | 'in_progress' | 'completed' | 'skipped') => Promise<boolean>;
  refreshWorkspacePlan: (workspaceId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingAuth = useRef(false);

  const checkAuthStatus = useCallback(async () => {
    // Prevent duplicate calls
    if (isCheckingAuth.current) {
      console.log('🔒 Auth check already in progress, skipping...');
      return;
    }

    isCheckingAuth.current = true;
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Validate token with backend
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Map tour_status to tourStatus for frontend consistency
          const user = {
            ...userData.user,
            tourStatus: userData.user.tour_status || userData.user.tourStatus || 'not_started',
            // /me already returns activeWorkspacePlan + is_superadmin (P-Plans).
            // Pass through verbatim — typing matches ActiveWorkspacePlan.
          };
          setUser(user);
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  }, []);

  // Check for existing authentication on app start
  useEffect(() => {
    // Skip auth check for candidate-flow routes ONLY. The recruiter
    // results page lives under /interview/:id/results/:sessionId and
    // IS authenticated — don't skip auth for it (bug: previously the
    // prefix /interview/ matched everything including results, leaving
    // user=null and bouncing recruiters to /).
    const currentPath = window.location.pathname;
    const isCandidateRoute =
      currentPath.includes('/candidate-portal/') ||
      /^\/interview\/[^/]+\/(session|pre-check|complete)$/.test(currentPath);
    if (isCandidateRoute) {
      setIsLoading(false);
      return;
    }

    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // Store token
      localStorage.setItem('auth_token', data.token);

      // Set user data with tour status mapping
      const user = {
        ...data.user,
        tourStatus: data.user.tour_status || data.user.tourStatus || 'not_started'
      };
      setUser(user);
      identify({ user_id: user.id, user_kind: "workspace", email: user.email });
      track(Events.workspace.signedIn, { method: "password" });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Direct navigation to Google OAuth endpoint - no fetch needed
      // The backend will handle the redirect to Google
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      window.location.href = `${API_BASE_URL}/api/auth/google`;
      
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();

      // Store token
      localStorage.setItem('auth_token', data.token);

      // Set user data with tour status mapping
      const user = {
        ...data.user,
        tourStatus: data.user.tour_status || data.user.tourStatus || 'not_started'
      };
      setUser(user);
      identify({ user_id: user.id, user_kind: "workspace", email: user.email });
      track(Events.workspace.signedUp, { method: "password" });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Call logout endpoint to invalidate token on server
      if (token) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      
      // Clear local storage
      localStorage.removeItem('auth_token');

      // Clear user state
      setUser(null);
      analyticsReset();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server call fails
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTourStatus = async (status: 'not_started' | 'in_progress' | 'completed' | 'skipped'): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(`${API_BASE_URL}/api/auth/tour-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tour_status: status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tour status');
      }

      // Update local user state
      if (user) {
        setUser({ ...user, tourStatus: status });
      }

      return true;
    } catch (error) {
      console.error('Error updating tour status:', error);
      return false;
    }
  };

  const refreshWorkspacePlan = useCallback(async (workspaceId?: string) => {
    // Re-fetch the plan + credit block for a given workspace (default: the
    // currently active one). Called on workspace switch so gating updates
    // without a full page reload.
    const targetWs = workspaceId || user?.activeWorkspaceId || user?.ownedWorkspaceId;
    if (!targetWs) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';
      const response = await fetch(
        `${API_BASE_URL}/api/workspaces/${targetWs}/plan`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      if (!response.ok) return;
      const plan = await response.json();
      setUser((prev) => prev ? { ...prev, activeWorkspacePlan: plan as ActiveWorkspacePlan } : prev);
    } catch (err) {
      console.error('refreshWorkspacePlan failed:', err);
    }
  }, [user?.activeWorkspaceId, user?.ownedWorkspaceId]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    logout,
    register,
    checkAuthStatus,
    updateTourStatus,
    refreshWorkspacePlan,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { User, AuthContextType };