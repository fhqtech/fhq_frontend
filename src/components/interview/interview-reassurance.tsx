/**
 * P1-4 — candidate reassurance panel. Shown before a candidate starts an
 * interview: what it is, what's evaluated, and why it's fair. Sober, finance-
 * trust register; no marketing slang. Reduces anxiety without overpromising.
 */
import { cn } from "@/lib/utils";
import { Clock, ListChecks, Scale } from "lucide-react";

export interface InterviewReassuranceProps {
  roleTitle: string;
  durationMinutes: number;
  className?: string;
}

export function InterviewReassurance({
  roleTitle,
  durationMinutes,
  className,
}: InterviewReassuranceProps) {
  const beats = [
    {
      icon: Clock,
      title: "A short conversation",
      body: `About ${durationMinutes} minutes, by voice or text. Answer at your own pace; there's no timer counting you down.`,
    },
    {
      icon: ListChecks,
      title: "What we'll look at",
      body: `We score the skills a ${roleTitle.toLowerCase()} needs against a rubric written by finance practitioners. Every score comes with the evidence behind it, so it's based on what you say, not a guess.`,
    },
    {
      icon: Scale,
      title: "Assessed fairly",
      body: "Everyone answers questions calibrated to the same rubric. There are no trick questions; explain your reasoning and walk through your thinking.",
    },
  ];

  return (
    <section
      aria-label="What to expect"
      className={cn("rounded-md border border-rule bg-paper-2 p-5", className)}
    >
      <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink">
        What to expect
      </p>
      <ul className="mt-4 space-y-4">
        {beats.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft">
              <b.icon className="h-4 w-4 text-gold-ink" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{b.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft leading-relaxed">{b.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default InterviewReassurance;
