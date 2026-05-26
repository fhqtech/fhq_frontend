/**
 * R11.1c: candidate-facing error page for expired invitation links.
 *
 * Before this page existed, a candidate clicking an expired link saw the
 * generic inline error in CandidateRegistration ("Invalid or expired
 * invitation token"). That's confusing — they don't know if their email
 * was wrong, the invitation was revoked, or it just timed out.
 *
 * This page explains the state clearly and gives one clear next step:
 * contact the hiring team.
 */
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InterviewExpiredPage() {
  return (
    <div className="min-h-[100dvh] bg-paper-2 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-paper rounded-md border border-rule p-8 text-center">
        <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-gold-soft flex items-center justify-center">
          <Clock className="w-6 h-6 text-gold-ink" />
        </div>

        <h1 className="text-2xl font-semibold text-ink mb-3">
          This invitation has expired
        </h1>

        <p className="text-sm text-muted leading-relaxed mb-6">
          Interview invitations are time-limited. Reach out to the hiring team
          who sent your invitation to request a fresh link — they can re-send
          it in a few clicks.
        </p>

        <div className="rounded-sm bg-paper-2 border border-rule p-4 text-left mb-6">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-2 mb-2">
            What to do next
          </p>
          <ul className="text-sm text-ink space-y-1.5 list-disc pl-5">
            <li>Reply to the original invitation email.</li>
            <li>Mention that the link expired.</li>
            <li>The hiring team will send a new invitation.</li>
          </ul>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = "mailto:";
          }}
        >
          Open email
        </Button>
      </div>
    </div>
  );
}
