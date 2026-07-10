/**
 * Blueprint readiness predicate — shared UX gate.
 *
 * The backend rejects invites against a broken blueprint with a 422
 * `blueprint_invalid` (see backend `blueprint_preflight.blueprint_invite_block`,
 * which blocks when the interview-doc `blueprintStatus` is "failed" or "error").
 * The frontend mirrors that check so we can disable the invite affordances
 * before the recruiter spends a round-trip on a guaranteed rejection.
 *
 * Kept pure + dependency-free so it can be unit-tested and reused by both the
 * Add-candidates button (InterviewDetails) and the modal itself.
 */
export function isBlueprintBroken(status: string | null | undefined): boolean {
  return status === "failed" || status === "error";
}
