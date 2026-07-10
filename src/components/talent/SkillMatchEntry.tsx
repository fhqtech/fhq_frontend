/**
 * P3-3 — the Talent-surface entry into the cross-interview skill matcher.
 *
 * Behind the `talent` flag (default-off): when a workspace opts in, a candidate
 * viewing their talent index gets one affordance to flip the question around —
 * pick a role and see who across their other interviews fits it. The matcher
 * itself already lives at /skill-matcher (deep-linkable, actionable, with the
 * "why this fit" explainer); this is purely the entry point, so the Talent diff
 * stays a one-liner and this stays isolate-testable.
 *
 * Off (the pilot default) → renders nothing, leaving the legacy surface untouched.
 */
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useFlag } from "@/lib/flags/FlagProvider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkillMatchEntry() {
  const talent = useFlag("talent");
  if (!talent) return null;

  return (
    <Link
      to="/skill-matcher"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
    >
      <Sparkles className="h-4 w-4 text-gold-ink" />
      Match candidates to a role
    </Link>
  );
}
