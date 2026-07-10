/**
 * P4-4 — the contestable integrity indicator.
 *
 * Surfaces a single turn-cited integrity observation on a results surface. The
 * whole point of the product is "evidence on every score", and this is its most
 * sensitive corner: an answer that "needs a closer look". So the tone is fixed —
 * calm, evidence-backed, contestable, and NEVER a verdict. It:
 *   - cites the SPECIFIC transcript turn and shows the exact quote,
 *   - explains itself in one plain sentence (a prompt to review, not a judgement),
 *   - offers a "mark as fair" affordance that hands the final call to the human.
 *
 * Default-OFF: gated on the `integrity` flag, so the running pilot never sees it
 * until a workspace opts in. Off (or outside any FlagProvider) → renders nothing.
 *
 * PERSISTENCE: `onMarkFair` is a pure affordance — actual write-back is a later
 * ticket. Marking as fair updates local optimistic state only.
 *
 * DATA GAP: no reviewer engine emits a turn-cited integrity flag today (see
 * lib/integrity.ts). This renders against the typed `IntegrityFlag` shape; mount
 * it only once the backend can supply real, turn-cited flags.
 */
import { useState } from "react";
import { Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFlag } from "@/lib/flags/FlagProvider";
import { citeTurn, type IntegrityFlag } from "@/lib/integrity";

export interface IntegrityNoteProps {
  /** The turn-cited observation to surface. */
  flag: IntegrityFlag;
  /**
   * Fired when the recruiter marks this observation as fair. The affordance is
   * wired now; persistence lands in a later ticket. Marking updates optimistic
   * local state regardless of whether a callback is supplied.
   */
  onMarkFair?: (flag: IntegrityFlag) => void;
  className?: string;
}

export function IntegrityNote({ flag, onMarkFair, className }: IntegrityNoteProps) {
  const enabled = useFlag("integrity");
  const [markedFair, setMarkedFair] = useState(false);

  // Default-off: nothing renders unless a workspace has opted in.
  if (!enabled) return null;

  const handleMarkFair = () => {
    setMarkedFair(true); // optimistic; write-back is a later ticket
    onMarkFair?.(flag);
  };

  const turnRef = citeTurn(flag);

  return (
    <section
      role="note"
      aria-label={`Needs a closer look. ${turnRef}.`}
      className={cn(
        "rounded-md border border-rule bg-paper-2 p-4 animate-in fade-in duration-300",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-rule bg-paper text-gold-ink shadow-1"
          aria-hidden
        >
          <Eye className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">Needs a closer look</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            One answer here reads differently from the rest of this interview. This is a prompt
            to review, not a judgement.
          </p>

          {/* Evidence — cite the specific turn, then show the exact words. */}
          <p className="mt-3 font-mono text-[11px] tracking-[0.02em] text-muted-2">
            {turnRef}
            {flag.skillName ? ` · ${flag.skillName}` : ""}
          </p>
          <blockquote className="mt-1.5 border-l-2 border-gold bg-paper-3 py-2 pl-3 pr-2 text-sm leading-relaxed text-ink">
            {flag.quote}
          </blockquote>

          {flag.note && (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{flag.note}</p>
          )}

          {/* Contestable — the recruiter has the final call. */}
          <div className="mt-3">
            {markedFair ? (
              <p
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 text-sm text-muted"
              >
                <Check className="h-4 w-4 text-gold-ink" aria-hidden />
                Marked as fair. This note has been set aside.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleMarkFair}>
                  Mark as fair
                </Button>
                <span className="text-xs text-muted">
                  If this reads fine on a second look, you have the final say.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default IntegrityNote;
