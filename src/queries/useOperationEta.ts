/**
 * P1-1 — server-sourced ETA for a long operation. Reads the rolling p50 (or a
 * static fallback) from the backend so AsyncProgress can show "usually ready in
 * about N", not a hardcoded guess. Any failure resolves to null and the caller
 * degrades to the hedged "shortly".
 */
import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export type OperationType = "blueprint" | "practical_assignment" | "reviewer";

interface OperationEtaResponse {
  p50_seconds: number;
  sample_size: number;
  source: "p50" | "fallback";
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchOperationEta(
  opType: OperationType,
  headers: Record<string, string> = {},
): Promise<number | null> {
  try {
    const r = await fetch(`${API_BASE_URL}/api/operations/${opType}/eta`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as OperationEtaResponse;
    return typeof data.p50_seconds === "number" ? data.p50_seconds : null;
  } catch {
    return null;
  }
}

/**
 * ETA in seconds for an operation, or null while loading / on failure. Cached
 * for a minute; only fetches while `enabled` (e.g. an op is actually running).
 */
export function useOperationEta(opType: OperationType, enabled = true): number | null {
  const { data } = useQuery({
    queryKey: ["operation-eta", opType],
    enabled,
    staleTime: 60_000,
    queryFn: () => fetchOperationEta(opType, authHeaders()),
  });
  return data ?? null;
}
