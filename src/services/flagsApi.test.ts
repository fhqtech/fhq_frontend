/**
 * P0-1 — the remote-flags client. Must fail open to {} (never throw, never flip
 * a flag on by accident) and only fetch when a recruiter token is present.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRemoteFlags } from "./flagsApi";

describe("fetchRemoteFlags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("returns {} with no auth token and does not call fetch", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await fetchRemoteFlags()).toEqual({});
    expect(f).not.toHaveBeenCalled();
  });

  it("returns the flags map for a logged-in recruiter", async () => {
    localStorage.setItem("auth_token", "tok");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ workspace_id: "ws1", flags: { talent: true, role_home: true } }),
      }),
    );
    expect(await fetchRemoteFlags()).toEqual({ talent: true, role_home: true });
  });

  it("fails open to {} on a non-ok response", async () => {
    localStorage.setItem("auth_token", "tok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    expect(await fetchRemoteFlags()).toEqual({});
  });

  it("fails open to {} when fetch throws", async () => {
    localStorage.setItem("auth_token", "tok");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchRemoteFlags()).toEqual({});
  });
});
