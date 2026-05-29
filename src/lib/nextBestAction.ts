/**
 * Next Best Action — single source of truth for "what should the recruiter do next?"
 *
 * Pure function: given an interview (or null) and its stats, returns the one CTA
 * we want surfaced. Replaces today's 9-button toolbars with a single primary
 * action per screen.
 */

export type NBAVariant = "default" | "secondary" | "outline-solid" | "destructive";

export interface NBA {
  label: string;
  href?: string;
  /** If set, the consumer should call this instead of navigating (e.g. open share modal). */
  action?: "share" | "remind" | "start" | "addCandidates";
  variant: NBAVariant;
  /** Optional helper text shown under the button. */
  hint?: string;
  /** True when the action is gated by an in-flight async (e.g. blueprint generating). */
  pending?: boolean;
}

export interface InterviewSnapshot {
  id: string;
  status?: "draft" | "active" | "running" | "paused" | "stopped" | "completed" | string;
  candidateCount?: number;
  blueprintStatus?: "pending" | "generating" | "ready" | "completed" | "failed" | "error" | "not_applicable" | string;
  startedAt?: string | null;
  /** Interview template type — skill_analysis is profile-driven, no blueprint required. */
  type?: "screening" | "fitment" | "skill_analysis" | string;
}

export interface InterviewStats {
  totalCandidates?: number;
  completedCandidates?: number;
  participationRate?: number; // 0-100
}

const HOURS_72_MS = 72 * 60 * 60 * 1000;

export function computeInterviewNBA(
  interview: InterviewSnapshot,
  stats?: InterviewStats
): NBA {
  const candidateCount = interview.candidateCount ?? stats?.totalCandidates ?? 0;
  const completed = stats?.completedCandidates ?? 0;
  const participation = stats?.participationRate ?? 0;
  // Skill analysis is profile-driven — no blueprint to wait for. Treat as ready.
  const isSkillAnalysis = interview.type === "skill_analysis";
  const blueprintReady =
    isSkillAnalysis ||
    interview.blueprintStatus === "ready" ||
    interview.blueprintStatus === "completed" ||
    interview.blueprintStatus === "not_applicable";
  const blueprintPending =
    !isSkillAnalysis &&
    (interview.blueprintStatus === "pending" || interview.blueprintStatus === "generating");

  // Draft, no candidates: must add candidates first.
  if (interview.status === "draft" && candidateCount === 0) {
    return {
      label: "Add candidates to start",
      action: "addCandidates",
      variant: "default",
    };
  }

  // Candidates added, blueprint not ready yet.
  if (interview.status === "draft" && blueprintPending) {
    return {
      label: "Blueprint generating…",
      variant: "secondary",
      pending: true,
      hint: "We'll notify you the moment it's ready.",
    };
  }

  // Draft, candidates + blueprint both ready: go.
  if (interview.status === "draft" && blueprintReady && candidateCount > 0) {
    return {
      label: "Start interview",
      action: "start",
      variant: "default",
    };
  }

  // Active but no completed responses yet — push the share link.
  if ((interview.status === "active" || interview.status === "running") && completed === 0) {
    return {
      label: "Share invite link",
      action: "share",
      variant: "default",
      hint: candidateCount === 0 ? undefined : `${candidateCount} candidate${candidateCount === 1 ? "" : "s"} invited`,
    };
  }

  // Stalled: running >72h with low participation.
  if (
    (interview.status === "active" || interview.status === "running") &&
    participation < 50 &&
    interview.startedAt &&
    Date.now() - new Date(interview.startedAt).getTime() > HOURS_72_MS
  ) {
    return {
      label: "Send reminder",
      action: "remind",
      variant: "default",
      hint: `${Math.round(participation)}% participation — nudge candidates`,
    };
  }

  // ≥1 completed response — review.
  if (completed > 0) {
    return {
      label: `Review ${completed} response${completed === 1 ? "" : "s"}`,
      href: `/interviews/${interview.id}#candidates`,
      variant: "default",
    };
  }

  // Paused / stopped fallbacks.
  if (interview.status === "paused") {
    return { label: "Resume interview", action: "start", variant: "default" };
  }
  if (interview.status === "stopped" || interview.status === "completed") {
    return {
      label: "Review responses",
      href: `/interviews/${interview.id}#candidates`,
      variant: "secondary",
    };
  }

  // Catch-all.
  return {
    label: "Open interview",
    href: `/interviews/${interview.id}`,
    variant: "outline",
  };
}

/**
 * Dashboard-level NBA: works on the full interview list, not a single one.
 */
export function computeDashboardNBA(
  interviews: InterviewSnapshot[] | undefined,
  loading: boolean
): NBA {
  if (loading) {
    return { label: "Loading…", variant: "secondary", pending: true };
  }

  if (!interviews || interviews.length === 0) {
    return {
      label: "Create your first interview",
      href: "/interviews/create",
      variant: "default",
      hint: "Takes about a minute.",
    };
  }

  // Find the most actionable interview: prefer one with completed responses to review,
  // then a running interview, then a draft that's ready to start.
  const sorted = [...interviews].sort((a, b) => {
    const aCompleted = (a as any).completedCandidates ?? 0;
    const bCompleted = (b as any).completedCandidates ?? 0;
    if (aCompleted !== bCompleted) return bCompleted - aCompleted;
    const rank = (s?: string) =>
      s === "active" || s === "running" ? 2 : s === "draft" ? 1 : 0;
    return rank(b.status) - rank(a.status);
  });

  return computeInterviewNBA(sorted[0]);
}
