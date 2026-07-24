import { describe, it, expect, beforeEach } from "vitest";
import { saveDraft, loadDraft, clearDraft } from "./submissionDraft";

describe("submissionDraft", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a draft", () => {
    saveDraft("iv1", { notes: "reconciled ITC", aiDisclosed: true });
    expect(loadDraft("iv1")).toEqual({ notes: "reconciled ITC", aiDisclosed: true, deadline: null });
  });

  it("round-trips a persisted deadline", () => {
    saveDraft("iv1", { notes: "x", aiDisclosed: false, deadline: 1234567 });
    expect(loadDraft("iv1")?.deadline).toBe(1234567);
  });

  it("returns null for a missing draft", () => {
    expect(loadDraft("nope")).toBeNull();
  });

  it("clears a draft", () => {
    saveDraft("iv1", { notes: "x", aiDisclosed: false });
    clearDraft("iv1");
    expect(loadDraft("iv1")).toBeNull();
  });

  it("returns null on a corrupt stored value (no throw)", () => {
    localStorage.setItem("flowdot:submission-draft:iv1", "{not json");
    expect(loadDraft("iv1")).toBeNull();
  });
});
