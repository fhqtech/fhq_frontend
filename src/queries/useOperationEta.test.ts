/**
 * P1-1 — fetch the server-sourced ETA (rolling p50, or a static fallback) for a
 * long operation. A failed or malformed request returns null so AsyncProgress
 * degrades to the hedged "shortly" rather than showing a wrong number.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchOperationEta } from "./useOperationEta";

afterEach(() => vi.unstubAllGlobals());

describe("fetchOperationEta", () => {
  it("returns p50_seconds on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ p50_seconds: 45, sample_size: 0, source: "fallback" }),
      }),
    );
    expect(await fetchOperationEta("blueprint")).toBe(45);
  });

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    expect(await fetchOperationEta("reviewer")).toBeNull();
  });

  it("returns null when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchOperationEta("practical_assignment")).toBeNull();
  });
});
