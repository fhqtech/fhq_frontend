/**
 * P3-1 — build the cross-role Talent index from /api/scores/all.
 *
 * The scores endpoint returns one row per (candidate, interview): a candidate who
 * sat screen + fitment appears twice. This collapses those rows into one per
 * human — keyed by candidate_id, falling back to email — surfacing the best
 * demonstrated score, the number of interviews (proxy for roles touched), and the
 * most recent activity. Pure and cross-role; the surface layer adds search + paging.
 *
 * Scope note: /api/scores/all is recruiter-scoped (candidate docs carry no
 * workspace_id), so this is "every candidate this recruiter has assessed," which
 * for the pilot is the workspace. Workspace-level scoping is a later backend ticket.
 */
import type { CandidateScore } from "@/services/scoreAnalyticsApi";

export interface TalentRow {
  candidateId: string;
  name: string | null;
  email: string | null;
  interviewCount: number;
  /** Best displayable score across the candidate's interviews, or null if unscored. */
  bestScore: number | null;
  /** Most recent updated_at (fallback created_at) across the candidate's rows. */
  latestActivity: string;
  /** Distinct interview types the candidate has been through. */
  types: Array<CandidateScore["interview_type"]>;
  /** The raw score rows, for drill-down. */
  scores: CandidateScore[];
}

/** Per-row displayable score: a verified human read wins, then the AI interview, then ATS. */
function displayScore(s: CandidateScore): number | null {
  return s.human_score ?? s.ai_interview_score ?? s.ats_score ?? null;
}

function activityOf(s: CandidateScore): string {
  return s.updated_at || s.created_at || "";
}

export function buildTalentIndex(scores: CandidateScore[]): TalentRow[] {
  const byCandidate = new Map<string, CandidateScore[]>();
  for (const s of scores) {
    const key = s.candidate_id || s.candidate_email || "unknown";
    const bucket = byCandidate.get(key);
    if (bucket) bucket.push(s);
    else byCandidate.set(key, [s]);
  }

  const rows: TalentRow[] = [];
  for (const [key, group] of byCandidate) {
    const displayable = group.map(displayScore).filter((v): v is number => v !== null);
    const bestScore = displayable.length ? Math.max(...displayable) : null;
    const latestActivity = group.reduce(
      (max, s) => (activityOf(s) > max ? activityOf(s) : max),
      "",
    );
    const named = group.find((s) => s.candidate_name)?.candidate_name ?? null;
    const emailed = group.find((s) => s.candidate_email)?.candidate_email ?? null;
    const interviewIds = new Set(group.map((s) => s.interview_id));
    const types = Array.from(new Set(group.map((s) => s.interview_type)));

    rows.push({
      candidateId: group[0].candidate_id || key,
      name: named,
      email: emailed,
      interviewCount: interviewIds.size,
      bestScore,
      latestActivity,
      types,
      scores: group,
    });
  }

  // Best score first (a scoreless candidate sorts last); recency breaks ties.
  return rows.sort((a, b) => {
    if (a.bestScore === null && b.bestScore === null) {
      return b.latestActivity.localeCompare(a.latestActivity);
    }
    if (a.bestScore === null) return 1;
    if (b.bestScore === null) return -1;
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return b.latestActivity.localeCompare(a.latestActivity);
  });
}

/** Case-insensitive match on name or email. Empty query returns all rows. */
export function filterTalent(rows: TalentRow[], query: string): TalentRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      (r.name?.toLowerCase().includes(q) ?? false) ||
      (r.email?.toLowerCase().includes(q) ?? false),
  );
}
