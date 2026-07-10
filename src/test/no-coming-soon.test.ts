/**
 * P0-5 CI gate. No shipped surface may carry a decorative "coming soon"
 * placeholder. Comments are excluded (a note explaining a past removal is
 * fine): block comments, JSX comment blocks, and line comments are stripped
 * before the scan. If this fails, ship the action or remove the control;
 * never relabel it "coming soon".
 */
import { describe, it, expect } from "vitest";

const sources = import.meta.glob("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments + JSX {/* ... */}
    .replace(/\/\/[^\n]*/g, ""); // line comments
}

describe("decorative 'coming soon' gate", () => {
  it("no shipped file contains a 'coming soon' string", () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .filter(([, src]) => /coming\s+soon/i.test(stripComments(src)))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
