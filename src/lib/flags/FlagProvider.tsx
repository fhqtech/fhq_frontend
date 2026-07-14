/**
 * P0-1 — FlagProvider + useFlag.
 *
 * Resolution precedence (see resolve.ts): override (admin/dev) > remote (/flags)
 * > registry default (off). In real use, `overrides` come from localStorage
 * (set by the Admin feature-flag console or a dev) and `remote` from the backend
 * /flags endpoint; both can be injected for tests. The hook is safe outside a
 * provider and resolves to the default-off legacy path.
 *
 * Rollout note: the pilot has no live users yet, so the redesign is now the
 * default experience. REDESIGN_BASELINE seeds the vetted Tier 1 + Tier 2 flags
 * as the LOWEST-precedence source (folded under `remote`), so every workspace
 * gets the new IA out of the box while a per-workspace remote flag or a dev's
 * localStorage override still wins. The registry stays default-off (resolve.ts
 * invariant) and the hook is still off outside a provider — the baseline lives
 * only inside the provider. Tier 3 trust surfaces (evidence_contract,
 * tag_evidence, integrity) stay OFF: under reviewer v1 they render every score
 * "unverified". Flip those per-workspace once reviewer v2 grounds them.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveFlag, type FlagSources, type FlagValues } from "./resolve";
import { fetchRemoteFlags } from "@/services/flagsApi";
import type { FlagKey } from "./registry";

const OVERRIDES_STORAGE_KEY = "flag_overrides";

/**
 * Vetted Tier 1 + Tier 2 redesign flags, on by default (see rollout note above).
 * Held back on purpose: evidence_contract / tag_evidence / integrity (Tier 3,
 * v1-unverified), candidate_write (write-side, deferred), unified_status /
 * ws_reconnect (not in the vetted tier lists).
 */
const REDESIGN_BASELINE: FlagValues = {
  // Tier 1 — safe UX, no data dependency
  soft_delete: true,
  settings_save: true,
  credit_gate: true,
  async_progress: true,
  precheck_chat_fallback: true,
  candidate_calm: true,
  sample_role: true,
  role_home: true,
  one_builder: true,
  nba: true,
  talent: true,
  bulk: true,
  compare: true,
  keyboard: true,
  // Tier 2 — read-only fan-in, safe under v1
  candidate_360: true,
  canonical_id: true,
  stage_results: true,
  transferable: true,
};

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
    // Baseline is folded under `remote` so a per-workspace remote flag and a
    // localStorage override both still win (override > remote > baseline).
    () => ({
      remote: { ...REDESIGN_BASELINE, ...(remote ?? fetchedRemote) },
      overrides: overrides ?? readStoredOverrides(),
    }),
    [remote, fetchedRemote, overrides],
  );
  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

export function useFlag(key: FlagKey): boolean {
  const sources = useContext(FlagContext);
  return resolveFlag(key, sources ?? {});
}
