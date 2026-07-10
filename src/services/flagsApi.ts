/**
 * P0-1 — the remote source in flag precedence (override > remote > default).
 *
 * Fetches the caller's active-workspace feature-flag values from the backend so a
 * flag can be flipped per workspace (server-side), not just per browser. Fails
 * open to {} on any error / no token (candidate world, logged out) so a fetch
 * problem can only leave flags at their default-off — never crash, never flip
 * something on by accident.
 */
import type { FlagValues } from "@/lib/flags/resolve";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export async function fetchRemoteFlags(): Promise<FlagValues> {
  const token = localStorage.getItem("auth_token");
  if (!token) return {}; // no recruiter session → nothing to resolve
  try {
    const r = await fetch(`${API_BASE_URL}/api/flags`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return {};
    const data = await r.json();
    return data && typeof data.flags === "object" && data.flags ? (data.flags as FlagValues) : {};
  } catch {
    return {};
  }
}
