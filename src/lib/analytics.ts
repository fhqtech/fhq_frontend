/**
 * Lightweight analytics shim.
 *
 * Goal: capture activation events without locking in a vendor or
 * shipping any third-party SDK in the bundle until VITE_POSTHOG_KEY (or
 * equivalent) is configured. When unset, every call is a quiet no-op
 * that costs nothing — safe to leave the call sites in place across
 * the codebase.
 *
 * Wire a real provider later by:
 *   1. Adding `VITE_POSTHOG_KEY=phc_…` to .env / hosting env.
 *   2. Implementing `dispatch()` to forward to posthog-js (or whatever).
 *
 * Naming convention for events: `noun.verb` in past tense ("workspace.signed_up",
 * "interview.created", "applicant.session_started"). Properties are flat,
 * snake_case, primitive types only — keeps any vendor happy.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
// EU host by default — DPDP-aligned default for India workloads. Override
// with VITE_POSTHOG_HOST if you self-host or use the US cloud.
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com";
const ENABLED = Boolean(POSTHOG_KEY);

interface Identity {
  user_id: string;
  user_kind: "workspace" | "applicant";
  workspace_id?: string | null;
  email?: string | null;
}

let currentIdentity: Identity | null = null;
let posthogPromise: Promise<typeof import("posthog-js").default> | null = null;

function getPosthog(): Promise<typeof import("posthog-js").default> | null {
  if (!ENABLED || typeof window === "undefined") return null;
  if (!posthogPromise) {
    posthogPromise = import("posthog-js").then((mod) => {
      mod.default.init(POSTHOG_KEY!, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        autocapture: false,
        // Session replay opt-in via consent boundary; off by default for DPDP.
        disable_session_recording: true,
        // Workspace + applicant flows both rely on first-party cookies; no
        // cross-domain bridging.
        persistence: "localStorage+cookie",
      });
      return mod.default;
    });
  }
  return posthogPromise;
}

function dispatch(event: string, props: Props): void {
  const ph = getPosthog();
  if (!ph) return;
  void ph.then((posthog) => {
    posthog.capture(event, props);
  });
}

/** Tag every subsequent track() call with who's doing it. */
export function identify(identity: Identity): void {
  currentIdentity = identity;
  const ph = getPosthog();
  if (ph) {
    void ph.then((posthog) => {
      posthog.identify(identity.user_id, {
        user_kind: identity.user_kind,
        workspace_id: identity.workspace_id ?? undefined,
        // email intentionally omitted — DPDP minimization. Backfill
        // server-side via /api/posthog-identify if you ever need it.
      });
      if (identity.workspace_id) {
        posthog.group("workspace", identity.workspace_id);
      }
    });
  }
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics] identify", identity);
  }
}

/** Clear identity on logout — prevents next-user attribution leakage. */
export function reset(): void {
  currentIdentity = null;
  const ph = getPosthog();
  if (ph) {
    void ph.then((posthog) => posthog.reset());
  }
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics] reset");
  }
}

/**
 * Fire-and-forget event. Safe to call from event handlers, useEffect,
 * or after navigation. Never throws.
 */
export function track(event: string, props: Props = {}): void {
  try {
    const enriched: Props = {
      ...props,
      user_id: currentIdentity?.user_id,
      user_kind: currentIdentity?.user_kind,
      workspace_id: currentIdentity?.workspace_id,
      ts: Date.now(),
    };
    dispatch(event, enriched);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${event}`, enriched);
    }
  } catch {
    // Telemetry must never break the app.
  }
}

/**
 * Canonical event names. Centralized so call sites stay typo-free and
 * the dashboard schema stays stable as we wire a vendor.
 */
export const Events = {
  workspace: {
    signedUp: "workspace.signed_up",
    signedIn: "workspace.signed_in",
  },
  applicant: {
    portalOpened: "applicant.portal_opened",
    sessionStarted: "applicant.session_started",
    sessionCompleted: "applicant.session_completed",
  },
  interview: {
    created: "interview.created",
    started: "interview.started",
    completed: "interview.completed",
    resultsViewed: "interview.results_viewed",
  },
  tag: {
    opened: "tag.opened",
    skillClicked: "tag.skill_clicked",
  },
} as const;
