/**
 * useOnboardingState — local-storage-backed first-run progress.
 *
 * Server-side persistence (a column on the user doc) is a follow-up;
 * this gets the F24.8 UX shipping today. Same key on every device for
 * a given userId, so a brand-new login on a new browser starts the
 * stepper again — acceptable for first-run UX.
 */
import { useCallback, useEffect, useState } from "react";

export type OnboardingStep = "domain" | "first_interview" | "invite";

export interface OnboardingState {
  steps: Record<OnboardingStep, boolean>;
  dismissed: boolean;
  completedAt: string | null;
}

const ALL_STEPS: OnboardingStep[] = ["domain", "first_interview", "invite"];

const blankState = (): OnboardingState => ({
  steps: { domain: false, first_interview: false, invite: false },
  dismissed: false,
  completedAt: null,
});

const keyFor = (userId: string | undefined) =>
  userId ? `fh_onboarding_${userId}` : null;

function read(userId: string | undefined): OnboardingState {
  const key = keyFor(userId);
  if (!key || typeof window === "undefined") return blankState();
  try {
    const v = window.localStorage.getItem(key);
    if (!v) return blankState();
    const parsed = JSON.parse(v) as Partial<OnboardingState>;
    return {
      steps: { ...blankState().steps, ...(parsed.steps ?? {}) },
      dismissed: Boolean(parsed.dismissed),
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return blankState();
  }
}

function write(userId: string | undefined, state: OnboardingState) {
  const key = keyFor(userId);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // private mode — best effort
  }
}

export function useOnboardingState(userId: string | undefined) {
  const [state, setState] = useState<OnboardingState>(() => read(userId));

  // re-read when userId changes (different user logs in)
  useEffect(() => {
    setState(read(userId));
  }, [userId]);

  const completeStep = useCallback(
    (step: OnboardingStep) => {
      setState((prev) => {
        const next: OnboardingState = {
          ...prev,
          steps: { ...prev.steps, [step]: true },
        };
        const allDone = ALL_STEPS.every((s) => next.steps[s]);
        if (allDone && !next.completedAt) {
          next.completedAt = new Date().toISOString();
        }
        write(userId, next);
        return next;
      });
    },
    [userId],
  );

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next: OnboardingState = { ...prev, dismissed: true };
      write(userId, next);
      return next;
    });
  }, [userId]);

  const completedCount = ALL_STEPS.filter((s) => state.steps[s]).length;
  const totalSteps = ALL_STEPS.length;
  const allComplete = completedCount === totalSteps;
  const visible = !state.dismissed && !allComplete && Boolean(userId);

  return {
    state,
    completeStep,
    dismiss,
    completedCount,
    totalSteps,
    allComplete,
    visible,
  };
}
