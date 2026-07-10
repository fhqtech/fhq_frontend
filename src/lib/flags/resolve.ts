/**
 * P0-1 — pure flag resolution. Precedence: explicit override (admin/dev) wins
 * over the remote /flags value, which wins over the compile-time default (off).
 * A malformed source value is ignored so a bad payload can never flip a flag on.
 */
import { FLAG_REGISTRY, type FlagKey } from "./registry";

export type FlagValues = Partial<Record<FlagKey, boolean>>;

export interface FlagSources {
  /** Admin/dev overrides (localStorage, URL param). Highest precedence. */
  overrides?: FlagValues;
  /** Values from the backend /flags endpoint. */
  remote?: FlagValues;
}

function pick(source: FlagValues | undefined, key: FlagKey): boolean | undefined {
  if (source && typeof source[key] === "boolean") return source[key];
  return undefined;
}

export function resolveFlag(key: FlagKey, sources: FlagSources = {}): boolean {
  const override = pick(sources.overrides, key);
  if (override !== undefined) return override;
  const remote = pick(sources.remote, key);
  if (remote !== undefined) return remote;
  return FLAG_REGISTRY[key]?.default ?? false;
}
