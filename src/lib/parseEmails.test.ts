/**
 * P2-3 — parsing a pasted candidate list. Recruiters paste emails from a sheet;
 * mixed separators, stray whitespace, dupes, and the odd typo shouldn't block
 * the whole add.
 */
import { describe, it, expect } from "vitest";
import { parseEmails } from "./parseEmails";

describe("parseEmails", () => {
  it("splits on commas, newlines, and spaces", () => {
    expect(parseEmails("a@x.com, b@y.com\nc@z.com d@w.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
      "d@w.com",
    ]);
  });

  it("drops invalid entries instead of failing", () => {
    expect(parseEmails("good@x.com, not-an-email, also bad")).toEqual(["good@x.com"]);
  });

  it("de-duplicates case-insensitively, preserving first spelling", () => {
    expect(parseEmails("Priya@x.com, priya@x.com")).toEqual(["Priya@x.com"]);
  });

  it("returns nothing for an empty or junk-only paste", () => {
    expect(parseEmails("   \n , ; ")).toEqual([]);
  });
});
