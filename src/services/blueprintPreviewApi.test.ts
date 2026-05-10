import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { previewBlueprint } from "./blueprintPreviewApi";

const ORIGINAL_FETCH = globalThis.fetch;

describe("previewBlueprint", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "tok-xyz");
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("POSTs title + type + description; returns skills array", async () => {
    const body = {
      skills: [{ shortName: "SQL", name: "SQL", skill_type: "technical" }],
    };
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    globalThis.fetch = fetchSpy as any;

    const result = await previewBlueprint({
      title: "Data Analyst",
      type: "screening",
      description: "Some text",
    });

    expect(result.skills).toHaveLength(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/interviews\/preview-blueprint$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      title: "Data Analyst",
      type: "screening",
      description: "Some text",
    });
  });

  it("propagates 500 errors", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("err", { status: 500 })) as any;
    await expect(previewBlueprint({ title: "X" })).rejects.toThrow(/500/);
  });
});
