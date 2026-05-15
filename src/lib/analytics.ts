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

const ENABLED = Boolean(import.meta.env.VITE_POSTHOG_KEY);

interface Identity {
  user_id: string;
  user_kind: "workspace" | "applicant";
  workspace_id?: string | null;
  email?: string | null;
}

let currentIdentity: Identity | null = null;

function dispatch(_event: string, _props: Props): void {
  // Real provider goes here. Today we only enqueue when VITE_POSTHOG_KEY
  // is set so we don't pay any network cost in dev. The console mirror
  // below is the dev-only feedback loop.
  if (!ENABLED) return;
  // TODO(F23): forward to posthog-js when the key lands.
}

/** Tag every subsequent track() call with who's doing it. */
export function identify(identity: Identity): void {
  currentIdentity = identity;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics] identify", identity);
  }
}

/** Clear identity on logout — prevents next-user attribution leakage. */
export function reset(): void {
  currentIdentity = null;
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
