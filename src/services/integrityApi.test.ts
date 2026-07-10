/**
 * P4-4 — the mark-as-fair client. Asserts it hits the tenant-scoped session
 * endpoint with the turn + reference the backend requires, and carries the
 * recruiter's auth token.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { integrityApi } from "./integrityApi";
import type { IntegrityFlag } from "@/lib/integrity";

const flag: IntegrityFlag = {
  turn: 4,
  quote: "Recited a definition verbatim from the prompt.",
  skillName: "GST compliance",
  canonicalId: "fin.tax.indirect.gst.compliance",
};

describe("integrityApi.markFair", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "tok_123");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, session_id: "s1", turn: 4, marked_fair: true }),
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("posts turn + references to the session mark-fair endpoint with auth", async () => {
    const res = await integrityApi.markFair("s1", flag);
    expect(res.marked_fair).toBe(true);

    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/results/session/s1/integrity/mark-fair");
    expect((init as RequestInit).method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok_123");
    expect(JSON.parse(init.body as string)).toEqual({
      turn: 4,
      canonical_id: "fin.tax.indirect.gst.compliance",
      skill_name: "GST compliance",
    });
  });

  it("throws a clear error on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(integrityApi.markFair("s1", flag)).rejects.toThrow(/403/);
  });
});
