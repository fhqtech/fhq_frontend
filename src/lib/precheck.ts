/**
 * P1-3 — resolve the interview a candidate is about to pre-check for, without
 * ever fabricating one in production. Navigation state (carried from the
 * candidate portal) is authoritative. When it is absent, production returns null
 * so the page can show a recoverable error and route back, while dev returns a
 * clearly-labelled fixture for local testing.
 */
export interface PrecheckInterview {
  id: string;
  title: string;
  description: string;
  duration: number;
  type: string;
  isFixture?: boolean;
}

export function resolvePrecheckInterview(
  stateInterview: PrecheckInterview | undefined | null,
  interviewId: string | undefined,
  isDev: boolean,
): PrecheckInterview | null {
  if (stateInterview) return stateInterview;
  if (isDev) {
    return {
      id: interviewId || "",
      title: "Sample interview (dev fixture)",
      description: "Local dev fixture. Never shown in production.",
      duration: 30,
      type: "ai_interview",
      isFixture: true,
    };
  }
  return null;
}
