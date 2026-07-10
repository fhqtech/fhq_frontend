/**
 * P0-9b — CreditGate. Surfaces the backend out-of-credits gate (P0-9a) at
 * invite-send. The endpoint returns 402 with the exact shortfall and, on a
 * partial send, the count that DID go out. A partial send is not a failure:
 * the recruiter sees what was sent, what is short, and a one-tap top-up.
 *
 * Tone: warning, sober. Orange is reserved for the single high-energy moment
 * per viewport; the credit block owns it here via the primary top-up action.
 */
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface CreditGateProps {
  /** Total invitations the recruiter asked to send. */
  required: number;
  /** Credits available before the send. */
  available: number;
  /** Credits short of covering every invitation. */
  shortfall: number;
  /** Invitations actually sent (the affordable slice). */
  sent: number;
  /** Invitations that could not be sent. */
  skipped: number;
  topUpHref?: string;
  onTopUp?: () => void;
  className?: string;
}

const num = "font-mono tabular-nums";

export function CreditGate({
  required,
  shortfall,
  sent,
  skipped,
  topUpHref,
  onTopUp,
  className,
}: CreditGateProps) {
  const partial = sent > 0;
  const credits = shortfall === 1 ? "credit" : "credits";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-warning/30 bg-warning-soft p-4 text-sm text-ink",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <div className="space-y-2">
          <p className="font-semibold">Not enough credits</p>
          {partial ? (
            <p className="text-ink-soft">
              We sent <span className={num}>{sent}</span> of{" "}
              <span className={num}>{required}</span> invitations.{" "}
              <span className={num}>{skipped}</span> need{" "}
              <span className={num}>{shortfall}</span> more {credits} to go out.
            </p>
          ) : (
            <p className="text-ink-soft">
              You need <span className={num}>{shortfall}</span> more {credits} to send these{" "}
              <span className={num}>{required}</span> invitations.
            </p>
          )}
          <div className="pt-1">
            {topUpHref ? (
              <Button asChild variant="orange" size="sm">
                <a href={topUpHref}>Top up credits</a>
              </Button>
            ) : (
              <Button variant="orange" size="sm" onClick={onTopUp}>
                Top up credits
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
