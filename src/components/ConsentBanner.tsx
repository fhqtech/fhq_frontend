/**
 * ConsentBanner — bottom-pinned consent prompt shown until the user
 * accepts or declines. Once a choice is recorded, the banner stays
 * hidden; users can revisit + revoke at /account/data (workspace) or
 * /candidate/account/data (applicant).
 */
import { Link } from "react-router-dom";
import { useConsent } from "@/contexts/ConsentContext";
import { Button } from "@/components/ui/button";

export function ConsentBanner() {
  const { state, accept, decline } = useConsent();

  if (state !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-description"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(640px,calc(100vw-2rem))] bg-paper border border-rule rounded-lg shadow-3 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex-1 space-y-1.5">
          <h3
            id="consent-banner-title"
            className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink"
          >
            Privacy choice
          </h3>
          <p id="consent-banner-description" className="text-sm text-ink-soft leading-relaxed">
            We use product analytics to understand how the app is used, and
            session replay to debug issues. Both run in the EU and never
            capture passwords or résumé content. You can change your mind
            anytime in your account settings.{" "}
            <Link to="/privacy" className="text-gold-ink underline underline-offset-2">
              Read our privacy notice.
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button variant="gold" size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
