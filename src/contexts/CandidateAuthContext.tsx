import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { identify, reset as analyticsReset } from '@/lib/analytics';

interface CandidateAccount {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
  email_verified: boolean;
  profile_ids: string[];
  // Phase 8: ISO timestamp of account creation. Used by OAuthSuccess to
  // detect first-time Google signup and prompt the "Confirm your name"
  // interstitial. Null on legacy accounts where the field never landed.
  created_at: string | null;
}

interface CandidateAuthContextType {
  account: CandidateAccount | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  claimPassword: (claimToken: string, password: string, name?: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  setSessionFromToken: (token: string) => Promise<void>;
}

const STORAGE_KEY = 'candidate_auth_token';

const CandidateAuthContext = createContext<CandidateAuthContextType | undefined>(undefined);

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082';

interface ProviderProps {
  children: ReactNode;
}

export const CandidateAuthProvider: React.FC<ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<CandidateAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inFlight = useRef(false);

  const fetchMe = useCallback(async (token: string): Promise<CandidateAccount | null> => {
    const resp = await fetch(`${API_BASE()}/api/candidate-auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.account as CandidateAccount;
  }, []);

  const checkAuthStatus = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const token = localStorage.getItem(STORAGE_KEY);
      if (!token) {
        setAccount(null);
        return;
      }
      const acct = await fetchMe(token);
      if (acct) {
        setAccount(acct);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setAccount(null);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[CandidateAuth] checkAuthStatus failed', err);
      localStorage.removeItem(STORAGE_KEY);
      setAccount(null);
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  }, [fetchMe]);

  useEffect(() => {
    // Only run on candidate-facing routes; spare every other page.
    const path = window.location.pathname;
    const candidateRoute =
      path.startsWith('/candidate/') ||
      path.startsWith('/claim-password/') ||
      path === '/forgot-password' ||
      // P7: invitation-link landing pages require candidate auth too.
      path.startsWith('/register/') ||
      path.startsWith('/candidate-portal/');
    // /candidate/ catches /candidate/confirm-name (P8) automatically.
    if (!candidateRoute) {
      setIsLoading(false);
      return;
    }
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE()}/api/candidate-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid email or password');
      }
      const data = await resp.json();
      localStorage.setItem(STORAGE_KEY, data.token);
      setAccount(data.account as CandidateAccount);
      identify({
        user_id: data.account.id,
        user_kind: "applicant",
        email: data.account.email,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    // P8: stash where the user came from so OAuthSuccess can route them
    // back to (e.g.) the invitation page after the optional name-
    // confirmation interstitial. Survives the OAuth round-trip via
    // sessionStorage (same-origin, no cookie clutter).
    try {
      const current = window.location.pathname + window.location.search;
      if (current && !current.startsWith('/candidate/oauth-success')) {
        sessionStorage.setItem('candidate_oauth_next', current);
      }
    } catch {
      /* sessionStorage unavailable in private mode — fine, defaults apply */
    }
    window.location.href = `${API_BASE()}/api/candidate-auth/google`;
  };

  const claimPassword = async (
    claimToken: string,
    password: string,
    name?: string,
  ) => {
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = { claim_token: claimToken, password };
      const trimmedName = (name || '').trim();
      if (trimmedName) body.name = trimmedName;
      const resp = await fetch(`${API_BASE()}/api/candidate-auth/claim-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid or expired link');
      }
      const data = await resp.json();
      localStorage.setItem(STORAGE_KEY, data.token);
      setAccount(data.account as CandidateAccount);
    } finally {
      setIsLoading(false);
    }
  };

  const updateName = async (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Name cannot be empty');
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) throw new Error('Not signed in');
    const resp = await fetch(`${API_BASE()}/api/candidate-auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Could not update name');
    }
    const data = await resp.json();
    setAccount(data.account as CandidateAccount);
  };

  const forgotPassword = async (email: string) => {
    await fetch(`${API_BASE()}/api/candidate-auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // Always succeeds from the user's POV — backend doesn't leak which
    // emails exist.
  };

  const setSessionFromToken = async (token: string) => {
    setIsLoading(true);
    try {
      const acct = await fetchMe(token);
      if (!acct) throw new Error('Invalid token');
      localStorage.setItem(STORAGE_KEY, token);
      setAccount(acct);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEY);
      if (token) {
        try {
          await fetch(`${API_BASE()}/api/candidate-auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // server logout failure shouldn't block client logout
        }
      }
      localStorage.removeItem(STORAGE_KEY);
      setAccount(null);
      analyticsReset();
    } finally {
      setIsLoading(false);
    }
  };

  const value: CandidateAuthContextType = {
    account,
    isLoading,
    isAuthenticated: !!account,
    login,
    loginWithGoogle,
    logout,
    claimPassword,
    updateName,
    forgotPassword,
    checkAuthStatus,
    setSessionFromToken,
  };

  return <CandidateAuthContext.Provider value={value}>{children}</CandidateAuthContext.Provider>;
};

export const useCandidateAuth = () => {
  const ctx = useContext(CandidateAuthContext);
  if (!ctx) throw new Error('useCandidateAuth must be used within CandidateAuthProvider');
  return ctx;
};

export type { CandidateAccount, CandidateAuthContextType };
