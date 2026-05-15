/**
 * ConsentContext — DPDP-aligned consent boundary for non-essential
 * processing (analytics, session replay).
 *
 * Statutory basis: DPDP Act 2023 §6 — consent must be free, specific,
 * informed, unconditional, and unambiguous, and capable of being
 * withdrawn at any time. We persist the choice in localStorage so it
 * survives reload, and expose `revoke()` for one-click withdrawal.
 *
 * What this DOES NOT gate:
 *   - Auth (necessary for the service to work)
 *   - Sentry error tracking with PII scrubbed (legitimate-interest
 *     ground; documented in privacy notice)
 *   - First-party functional cookies (auth_token, candidate_auth_token)
 *
 * What this DOES gate:
 *   - PostHog event capture
 *   - PostHog session replay
 *   - Future marketing pixels if we ever add them
 *
 * Usage from any component:
 *   const { state, accept, decline, revoke } = useConsent();
 *
 * Usage in init paths (analytics.ts):
 *   import { hasAnalyticsConsent } from "@/contexts/ConsentContext";
 *   if (hasAnalyticsConsent()) posthog.init(...);
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fh_consent_v1";

export type ConsentState = "unknown" | "accepted" | "declined";

interface ConsentValue {
  state: ConsentState;
  accept: () => void;
  decline: () => void;
  /** DPDP §6(4) right of withdrawal. Same effect as decline(). */
  revoke: () => void;
}

const ConsentCtx = createContext<ConsentValue | null>(null);

function readPersisted(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "declined") return v;
  } catch {
    // localStorage may be unavailable in private mode — treat as unknown
  }
  return "unknown";
}

function persist(state: ConsentState): void {
  try {
    if (state === "unknown") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, state);
    }
  } catch {
    // see above
  }
}

/**
 * Module-level read for non-React callers (analytics dispatcher).
 * Always reads fresh from localStorage so revocation propagates
 * even if the React tree hasn't re-rendered yet.
 */
export function hasAnalyticsConsent(): boolean {
  return readPersisted() === "accepted";
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState>(() => readPersisted());

  // Cross-tab sync — if user accepts on one tab, others pick it up.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(readPersisted());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ConsentValue>(
    () => ({
      state,
      accept: () => {
        persist("accepted");
        setState("accepted");
      },
      decline: () => {
        persist("declined");
        setState("declined");
      },
      revoke: () => {
        persist("declined");
        setState("declined");
      },
    }),
    [state],
  );

  return <ConsentCtx.Provider value={value}>{children}</ConsentCtx.Provider>;
}

export function useConsent(): ConsentValue {
  const ctx = useContext(ConsentCtx);
  if (!ctx) throw new Error("useConsent must be used within ConsentProvider");
  return ctx;
}
