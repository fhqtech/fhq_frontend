/**
 * C0 — the two-worlds seam. The one absolute constraint of the app: the
 * candidate world and the recruiter world never mix. A candidate-facing surface
 * must never import the recruiter navigation shell (Sidebar / MainLayout / the
 * recruiter Header), or a branching-auth bug could leak recruiter chrome into
 * the applicant experience. This gate fails the build if that seam is crossed.
 */
import { describe, it, expect } from "vitest";

const candidateSources = import.meta.glob("/src/pages/candidate/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Recruiter-only shell modules the candidate world must never pull in.
const RECRUITER_SHELL = [
  "components/layout/Sidebar",
  "components/layout/MainLayout",
  "components/layout/Header",
  "components/layout/NotificationBell",
];

function importsRecruiterShell(src: string): string[] {
  // Match `import ... from "<path>"` / `import("<path>")` referencing a shell module.
  return RECRUITER_SHELL.filter((mod) =>
    new RegExp(`from\\s+["'][^"']*${mod}["']|import\\(["'][^"']*${mod}["']\\)`).test(src),
  );
}

describe("two-worlds seam", () => {
  it("finds candidate-world files to guard", () => {
    // Guards against the glob silently matching nothing (a false-green).
    expect(Object.keys(candidateSources).length).toBeGreaterThan(0);
  });

  it("no candidate-world file imports the recruiter navigation shell", () => {
    const offenders = Object.entries(candidateSources)
      .filter(([path]) => !path.includes(".test."))
      .map(([path, src]) => ({ path, leaks: importsRecruiterShell(src) }))
      .filter((o) => o.leaks.length > 0);
    expect(offenders).toEqual([]);
  });
});
