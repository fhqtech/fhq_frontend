/**
 * Locks the request shape suggestFromTitle sends.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { suggestFromTitle } from "./suggestionsApi";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(response: Response) {
  return vi.fn().mockResolvedValue(response);
}

describe("suggestFromTitle", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "tok-abc");
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("POSTs the title with bearer auth and returns the parsed body", async () => {
    const body = {
      description: "An accountant interview.",
      duration_minutes: 10,
      type: "screening",
      voice_type: "professional-female",
      voice_accent: "indian",
      voice_speed: "normal",
    };
    const fetchSpy = mockFetch(new Response(JSON.stringify(body), { status: 200 }));
    globalThis.fetch = fetchSpy as any;

    const result = await suggestFromTitle("Junior Accountant");

    expect(result).toEqual(body);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/interviews\/suggest-from-title$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toBe("Bearer tok-abc");
    expect(JSON.parse(init.body)).toEqual({ title: "Junior Accountant" });
  });

  it("throws on non-2xx", async () => {
    globalThis.fetch = mockFetch(new Response("nope", { status: 500 })) as any;
    await expect(suggestFromTitle("X")).rejects.toThrow(/500/);
  });

  it("omits Authorization header when no token is set", async () => {
    localStorage.removeItem("auth_token");
    const fetchSpy = mockFetch(new Response(JSON.stringify({}), { status: 200 }));
    globalThis.fetch = fetchSpy as any;

    await suggestFromTitle("X").catch(() => {});

    const [, init] = fetchSpy.mock.calls[0];
    expect("Authorization" in init.headers).toBe(false);
  });
});
