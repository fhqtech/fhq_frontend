/**
 * FirstRunStepper — top-of-dashboard inline stepper for first-time
 * workspace users. Shows until all 3 steps are complete OR the user
 * dismisses.
 *
 * Steps:
 *   1. Pick your domain (Accounting / Taxation / Management Consulting)
 *   2. Create your first interview
 *   3. Invite a teammate
 *
 * Uses Driver.js for optional contextual highlights (TODO follow-up).
 */
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingState, type OnboardingStep } from "./useOnboardingState";

interface StepDef {
  id: OnboardingStep;
  label: string;
  description: string;
  cta: string;
  href: string;
}

const STEPS: StepDef[] = [
  {
    id: "domain",
    label: "Pick your domain",
    description: "Accounting, Taxation, or Management Consulting — drives the rubric used to score applicants.",
    cta: "Open settings",
    href: "/settings",
  },
  {
    id: "first_interview",
    label: "Create your first interview",
    description: "A 20-minute AI conversation calibrated to a finance role. Takes 3 minutes to set up.",
    cta: "Create interview",
    href: "/interviews/create",
  },
  {
    id: "invite",
    label: "Invite a teammate",
    description: "Hiring is a team sport. Bring your co-interviewer or hiring manager into the workspace.",
    cta: "Invite from settings",
    href: "/settings",
  },
];

export function FirstRunStepper() {
  const { user } = useAuth();
  const { state, dismiss, completedCount, totalSteps, visible } = useOnboardingState(user?.id);

  if (!visible) return null;

  const progressPct = (completedCount / totalSteps) * 100;
  const nextIdx = STEPS.findIndex((s) => !state.steps[s.id]);
  const next = nextIdx >= 0 ? STEPS[nextIdx] : null;

  return (
    <div className="rounded-lg border border-rule bg-paper shadow-1 p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-400">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-mono uppercase tracking-[0.18em] text-[11px] text-gold-ink mb-1.5">
            Get set up
          </p>
          <h2 className="text-lg font-semibold text-ink leading-tight">
            {completedCount === 0
              ? "Three steps to your first applicant"
              : `${completedCount} of ${totalSteps} done — keep going`}
          </h2>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss onboarding"
          className="text-muted hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-paper-3 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gold transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ol className="space-y-2">
        {STEPS.map((step, i) => {
          const done = state.steps[step.id];
          const isNext = step.id === next?.id;
          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors ${
                isNext ? "bg-gold-soft" : "bg-paper-2"
              }`}
            >
              <div
                className={`shrink-0 w-6 h-6 rounded-full grid place-items-center mt-0.5 ${
                  done
                    ? "bg-success text-white"
                    : isNext
                    ? "bg-ink text-white"
                    : "bg-paper border border-rule text-muted"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "text-muted line-through" : "text-ink"}`}>
                  {step.label}
                </p>
                {isNext && (
                  <p className="text-xs text-ink-soft mt-0.5">{step.description}</p>
                )}
              </div>
              {isNext && !done && (
                <Button asChild size="sm" variant="gold">
                  <Link to={step.href}>{step.cta}</Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
