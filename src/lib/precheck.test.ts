/**
 * P1-3 — the pre-check must never drop a candidate into a fabricated "mock"
 * interview in production. When navigation state carries the real interview, use
 * it. When it is absent, production resolves to null (the page then shows a
 * recoverable error and routes back), while dev gets a clearly-labelled fixture
 * so local testing still works.
 */
import { describe, it, expect } from "vitest";
import { resolvePrecheckInterview } from "./precheck";

const real = { id: "iv_1", title: "Senior tax associate", description: "x", duration: 25, type: "ai_interview" };

describe("resolvePrecheckInterview", () => {
  it("uses the real interview from navigation state", () => {
    expect(resolvePrecheckInterview(real, "iv_1", false)).toEqual(real);
    expect(resolvePrecheckInterview(real, "iv_1", true)).toEqual(real);
  });

  it("returns null in production when nav state is absent (no fabrication)", () => {
    expect(resolvePrecheckInterview(undefined, "iv_1", false)).toBeNull();
  });

  it("returns a clearly-labelled fixture in dev when nav state is absent", () => {
    const fixture = resolvePrecheckInterview(undefined, "iv_1", true);
    expect(fixture).not.toBeNull();
    expect(fixture?.isFixture).toBe(true);
    expect(fixture?.id).toBe("iv_1");
    // must not masquerade as a real interview title
    expect(fixture?.title).not.toBe("AI Accounting Interview");
  });
});
