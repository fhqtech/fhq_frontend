/**
 * P5-2 — candidate-360 page (behind the `candidate_360` flag).
 *
 * READ-ONLY. Fans one human's six scattered records into a single view at read
 * time (lib/candidate360.composeCandidate360, on top of the P5-1 canonical
 * resolver) and renders them via Candidate360Content — reusing the marquee TAG,
 * the P4 trust marker, and the journeyAction NBA verb. Every source is fetched
 * with a GET; there are ZERO writes. The durable canonical map + merge/unmerge is
 * the deferred write (P5-4), out of scope.
 *
 * Flag gate: off (or outside any FlagProvider) → the legacy NotFound, so the live
 * pilot is untouched. The route /roles/:programId/candidates/:candidateId is NEW;
 * RoleContainer already navigates there (it 404s today), so off === today.
 *
 * TENANCY (DPDP): the fan-in is scoped to the recruiter's active workspace — the
 * resolver namespaces every join key by workspace and drops another tenant's rows.
 * `/api/scores/all` is recruiter-scoped and candidate docs carry no workspace_id,
 * so this is "candidates this recruiter has assessed" (the pilot's workspace).
 * Raw PII is never logged.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useFlag } from "@/lib/flags/FlagProvider";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { scoreAnalyticsApi } from "@/services/scoreAnalyticsApi";
import {
  recruiterJourneysApi,
  type GapResult,
  type JourneyInstance,
  type RoleTag,
} from "@/services/recruiterJourneysApi";
import { assessmentsRecruiterApi, type ProfileResponse } from "@/services/assessmentsRecruiterApi";
import { composeCandidate360, type Candidate360View } from "@/lib/candidate360";
import { Candidate360Content } from "@/components/candidate/Candidate360Content";
import NotFound from "./NotFound";

function Candidate360Container() {
  const { programId, candidateId } = useParams<{ programId?: string; candidateId?: string }>();
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id ?? null;

  const [view, setView] = useState<Candidate360View | null>(null);
  const [roleTitle, setRoleTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ws || !candidateId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [scores, program, roleTag, gap, journeys] = await Promise.all([
          scoreAnalyticsApi.getAllScores(),
          programId ? recruiterJourneysApi.getProgram(ws, programId).catch(() => null) : Promise.resolve(null),
          programId
            ? recruiterJourneysApi.getRoleTag(ws, programId, candidateId).catch(() => null as RoleTag | null)
            : Promise.resolve(null),
          programId
            ? recruiterJourneysApi.getGap(ws, programId, candidateId).catch(() => null as GapResult | null)
            : Promise.resolve(null),
          programId
            ? recruiterJourneysApi.listJourneys(ws, programId).catch(() => [] as JourneyInstance[])
            : Promise.resolve([] as JourneyInstance[]),
        ]);

        const journey = journeys.find((j) => j.candidate_id === candidateId) ?? null;
        // Cross-mode fused profile is the fallback claim source when there is no
        // role-tag for this (candidate, program). Keyed by candidate_id.
        let fusedProfile: ProfileResponse | null = null;
        if (!roleTag) {
          fusedProfile = await assessmentsRecruiterApi.getFusedProfile(candidateId).catch(() => null);
        }

        if (cancelled) return;
        setRoleTitle(program?.title ?? "");
        setView(
          composeCandidate360({
            candidateId,
            workspaceId: ws,
            sources: { scores, roleTag, gap, fusedProfile, journey },
          }),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this candidate");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ws, programId, candidateId, reloadKey]);

  const onRetry = useCallback(() => setReloadKey((k) => k + 1), []);

  const fallbackView = composeCandidate360({
    candidateId: candidateId ?? "",
    workspaceId: ws,
    sources: { scores: [] },
  });

  return (
    <Candidate360Content
      view={view ?? fallbackView}
      roleTitle={roleTitle}
      loading={loading || !ws}
      error={error}
      onRetry={onRetry}
      roleHref={programId ? `/roles/${programId}` : undefined}
    />
  );
}

export default function Candidate360() {
  const on = useFlag("candidate_360");
  // Off (or outside any FlagProvider) → today's behavior: this URL 404s.
  if (!on) return <NotFound />;
  return <Candidate360Container />;
}
