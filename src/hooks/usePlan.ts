/**
 * Frontend gating hooks for workspace plan + credit state.
 *
 * Wraps the AuthContext's `activeWorkspacePlan` block so feature/limit
 * checks at render sites stay one-liners:
 *
 *   const { allowed, requiredPlan } = usePlanFeature("ct_blueprints", "EDIT");
 *   if (!allowed) return <UpgradeCard requiredPlan={requiredPlan} />;
 *
 * The plan check here is for UX hiding/showing — the backend's
 * `require_feature` dep is the actual security boundary.
 *
 * P-Plans F9: live matrix is fetched once on first import from
 * `GET /api/plans/matrix` (public endpoint). If the fetch succeeds, we
 * use it instead of the hardcoded fallback below; this lets a backend
 * matrix update reach the frontend without a redeploy. If the fetch
 * fails (offline, server down), the hardcoded matrix is used.
 */
import { useAuth, type FeatureLevel, type PlanId } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

let LIVE_PLAN_FEATURES: Record<PlanId, Record<string, FeatureLevel>> | null = null;
let LIVE_PLAN_ORDER: PlanId[] | null = null;
let _matrixFetched = false;

function fetchMatrixOnce() {
  if (_matrixFetched) return;
  _matrixFetched = true;
  fetch(`${API_BASE_URL}/api/plans/matrix`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && d.plans && d.order) {
        LIVE_PLAN_FEATURES = d.plans;
        LIVE_PLAN_ORDER = d.order;
      }
    })
    .catch(() => { /* fall back to hardcoded */ });
}

// Kick off the fetch on module load. Non-blocking.
if (typeof window !== "undefined") {
  fetchMatrixOnce();
}

const LEVEL_RANK: Record<FeatureLevel, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  PARTIAL: 2,
  FULL: 3,
};

const PLAN_ORDER: PlanId[] = ["free", "pro", "enterprise"];

const PLAN_FEATURES: Record<PlanId, Record<string, FeatureLevel>> = {
  free: {
    ct_projects: "FULL", ct_finops: "VIEW", ct_talent_pool: "NONE",
    ct_pii: "VIEW", ct_blueprints: "VIEW", ct_roles: "VIEW",
    ct_integrations: "NONE", ct_security: "NONE",
    rp_lists: "FULL", rp_interviews: "FULL", rp_review: "FULL",
    rp_analytics: "VIEW", rp_candidates: "FULL", rp_pii: "VIEW",
  },
  pro: {
    ct_projects: "FULL", ct_finops: "FULL", ct_talent_pool: "FULL",
    ct_pii: "FULL", ct_blueprints: "FULL", ct_roles: "FULL",
    ct_integrations: "EDIT", ct_security: "VIEW",
    rp_lists: "FULL", rp_interviews: "FULL", rp_review: "FULL",
    rp_analytics: "FULL", rp_candidates: "FULL", rp_pii: "FULL",
  },
  enterprise: {
    ct_projects: "FULL", ct_finops: "FULL", ct_talent_pool: "FULL",
    ct_pii: "FULL", ct_blueprints: "FULL", ct_roles: "FULL",
    ct_integrations: "FULL", ct_security: "FULL",
    rp_lists: "FULL", rp_interviews: "FULL", rp_review: "FULL",
    rp_analytics: "FULL", rp_candidates: "FULL", rp_pii: "FULL",
  },
};

function hasAccess(granted: FeatureLevel | undefined, required: FeatureLevel): boolean {
  return LEVEL_RANK[granted ?? "NONE"] >= LEVEL_RANK[required];
}

function requiredPlanFor(feature: string, level: FeatureLevel): PlanId | null {
  // Prefer the live matrix from /api/plans/matrix if it's been fetched.
  const matrix = LIVE_PLAN_FEATURES ?? PLAN_FEATURES;
  const order = LIVE_PLAN_ORDER ?? PLAN_ORDER;
  for (const p of order) {
    if (hasAccess(matrix[p]?.[feature], level)) return p;
  }
  return null;
}

export interface PlanFeatureCheck {
  allowed: boolean;
  plan: PlanId;
  requiredPlan: PlanId | null;
  /** Frontend route to send the user to for upgrade flow. */
  upgradeHref: string;
}

/**
 * Check whether the active workspace's plan unlocks `feature` at `level`.
 *
 * When `activeWorkspacePlan` is not yet loaded (e.g. user just logged in
 * but hasn't picked a workspace), defaults to allowed=true so the UI
 * doesn't flash an upgrade prompt during the loading window — the
 * backend will still gate the action.
 */
export function usePlanFeature(feature: string, level: FeatureLevel = "VIEW"): PlanFeatureCheck {
  const { user } = useAuth();
  const plan = user?.activeWorkspacePlan;
  if (!plan) {
    return { allowed: true, plan: "free", requiredPlan: null, upgradeHref: "/settings/plan" };
  }
  // Past-due / canceled lock down to billing only.
  if (plan.status !== "active" && feature !== "ct_finops") {
    return {
      allowed: false,
      plan: plan.plan,
      requiredPlan: plan.plan,
      upgradeHref: "/settings/plan",
    };
  }
  const granted = plan.features[feature];
  return {
    allowed: hasAccess(granted, level),
    plan: plan.plan,
    requiredPlan: requiredPlanFor(feature, level),
    upgradeHref: "/settings/plan",
  };
}

export interface CreditsState {
  remaining: number;
  granted: number;
  consumed: number;
  /** True when remaining < 1 — the next interview run will be blocked. */
  empty: boolean;
}

export function useCredits(): CreditsState {
  const { user } = useAuth();
  const c = user?.activeWorkspacePlan?.credits ?? { remaining: 0, granted: 0, consumed: 0 };
  return { ...c, empty: c.remaining < 1 };
}

/**
 * Refetch the active workspace's plan + credit balance from the backend.
 *
 * W-FE-P1 (2026-05-28): call this from the `onSuccess` of any credit-
 * consuming mutation (invite, resend, bulk start) so the Header badge,
 * `useCredits()`, and `<UpgradeCard />` reflect the true post-action
 * balance immediately rather than waiting for a manual page refresh.
 *
 * Safe to call without an active workspace — the underlying
 * `refreshWorkspacePlan(undefined)` resolves to a no-op when there's
 * nothing to fetch.
 */
export function useRefreshCredits(): () => Promise<void> {
  const { user, refreshWorkspacePlan } = useAuth();
  const wsId = user?.activeWorkspacePlan?.workspaceId;
  return async () => {
    try {
      await refreshWorkspacePlan(wsId);
    } catch (err) {
      // Telemetry-only failure — UI still shows stale value, backend is the
      // source of truth on the next request anyway.
      console.warn("useRefreshCredits: refresh failed", err);
    }
  };
}

export interface LimitState {
  cap: number | null;
  current: number;
  remaining: number | null;
  withinLimit: boolean;
}

/** Check a numeric plan limit (e.g. maxMembers) against a current count. */
export function usePlanLimit(key: string, current: number): LimitState {
  const { user } = useAuth();
  const limits = user?.activeWorkspacePlan?.limits;
  const cap = limits?.[key] ?? null;
  if (cap === null || cap === undefined) {
    return { cap: null, current, remaining: null, withinLimit: true };
  }
  return {
    cap,
    current,
    remaining: Math.max(0, cap - current),
    withinLimit: current < cap,
  };
}
