/**
 * P0-1 — FlagProvider + useFlag.
 *
 * Resolution precedence (see resolve.ts): override (admin/dev) > remote (/flags)
 * > registry default (off). In real use, `overrides` come from localStorage
 * (set by the Admin feature-flag console or a dev) and `remote` from the backend
 * /flags endpoint; both can be injected for tests. The hook is safe outside a
 * provider and resolves to the default-off legacy path.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveFlag, type FlagSources, type FlagValues } from "./resolve";
import { fetchRemoteFlags } from "@/services/flagsApi";
import type { FlagKey } from "./registry";

const OVERRIDES_STORAGE_KEY = "flag_overrides";

const FlagContext = createContext<FlagSources | null>(null);

function readStoredOverrides(): FlagValues {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as FlagValues) : {};
  } catch {
    return {};
  }
}

export interface FlagProviderProps {
  children: ReactNode;
  /** Values from the backend /flags endpoint. */
  remote?: FlagValues;
  /** Explicit overrides. When omitted, read from localStorage. */
  overrides?: FlagValues;
}

export function FlagProvider({ children, remote, overrides }: FlagProviderProps) {
  // When `remote` isn't injected (real app), pull the active workspace's flags
  // from the backend once. Fails open to {} (no token / error) so this is safe
  // in tests and outside a recruiter session. localStorage overrides still win.
  const [fetchedRemote, setFetchedRemote] = useState<FlagValues>({});
  useEffect(() => {
    if (remote !== undefined) return; // injected values (tests) — skip the fetch
    let cancelled = false;
    fetchRemoteFlags().then((f) => {
      if (!cancelled) setFetchedRemote(f);
    });
    return () => {
      cancelled = true;
    };
  }, [remote]);

  const value = useMemo<FlagSources>(
    () => ({ remote: remote ?? fetchedRemote, overrides: overrides ?? readStoredOverrides() }),
    [remote, fetchedRemote, overrides],
  );
  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

export function useFlag(key: FlagKey): boolean {
  const sources = useContext(FlagContext);
  return resolveFlag(key, sources ?? {});
}
