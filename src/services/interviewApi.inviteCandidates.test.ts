import { describe, it, expect, vi, afterEach } from "vitest";
import { interviewApi } from "./interviewApi";

/**
 * Guards the inviteCandidates error branch. On a 422 the backend returns a
 * structured object `detail` (e.g. blueprint_invalid). The old code did
 * `throw new Error(error.detail || ...)`, which stringified the object to
 * "[object Object]" and dropped the structured payload — so the modal could
 * not render `detail.message`. This test pins the sibling-method behaviour:
 * the thrown error must carry `.status`, `.detail`, and a real `.message`.
 */
afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    })) as unknown as typeof fetch,
  );
}

describe("interviewApi.inviteCandidates error handling", () => {
  it("surfaces a 422 blueprint_invalid detail.message instead of [object Object]", async () => {
    const detail = {
      error: "blueprint_invalid",
      reason: "blueprint_failed",
      blueprintStatus: "failed",
      message: "This role's blueprint failed to generate. Fix it before inviting candidates.",
    };
    mockFetchOnce(422, { detail });

    let thrown: any;
    try {
      await interviewApi.inviteCandidates("iv_1", [{ name: "Priya Sharma", email: "priya@firm.co.in" }]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe(detail.message);
    expect(thrown.message).not.toBe("[object Object]");
    expect(thrown.status).toBe(422);
    expect(thrown.detail).toEqual(detail);
    expect(thrown.detail.error).toBe("blueprint_invalid");
  });

  it("keeps a plain string detail as the message (e.g. 500)", async () => {
    mockFetchOnce(500, { detail: "Internal server error" });

    let thrown: any;
    try {
      await interviewApi.inviteCandidates("iv_1", [{ name: "Arjun Mehta", email: "arjun@firm.co.in" }]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown.message).toBe("Internal server error");
    expect(thrown.status).toBe(500);
  });

  it("does NOT attach err.code (leaves the 402 credits toast path unchanged)", async () => {
    const detail = { error: "credits_required", required: 1, remaining: 0 };
    mockFetchOnce(402, { detail });

    let thrown: any;
    try {
      await interviewApi.inviteCandidates("iv_1", [{ name: "Rohan Iyer", email: "rohan@firm.co.in" }]);
    } catch (e) {
      thrown = e;
    }

    // Intentionally undefined — toastPlanError keys off err.code, and this
    // method must not start hijacking the existing credits path.
    expect(thrown.code).toBeUndefined();
    expect(thrown.detail).toEqual(detail);
  });
});
