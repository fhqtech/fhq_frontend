/**
 * ServiceStatusWidget — live health of upstream AI services.
 *
 * S3.3 (P0-7). Polls /api/ready/upstream every 60s and shows three
 * dots: Reasoning (Gemini) / Speech recognition (AssemblyAI) /
 * Voice (Cartesia). Recruiters don't need vendor names — the
 * rebranded labels match how the rest of the dashboard talks about
 * the system.
 *
 * Color mapping mirrors the backend status enum:
 *   ok        → success (green)
 *   degraded  → warning (amber)
 *   down      → danger  (red)
 *
 * When overall === "down", the inline banner above the dots makes
 * the failure mode obvious to recruiters about to create or open an
 * interview ("Interview service is degraded. New interviews may
 * fail."). This is the difference between recruiters discovering an
 * outage themselves and getting a confused candidate email three
 * hours later.
 *
 * Latency tooltip: clicking the widget reveals raw per-service
 * latency_ms — useful for the engineer triaging from the same
 * dashboard, invisible to recruiters who don't click.
 *
 * Why 60s polling: the backend caches results for 30s, so 60s is
 * the slowest cadence that still catches every fresh probe. Faster
 * polling would surface stale cache hits without value.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

// Poll cadence — see component docstring for the 60s rationale.
const POLL_INTERVAL_MS = 60_000;

type ServiceStatus = "ok" | "degraded" | "down";

interface ServiceHealth {
  status: ServiceStatus;
  latency_ms: number;
  error: string | null;
}

interface UpstreamHealth {
  checked_at: string;
  services: {
    gemini: ServiceHealth;
    assemblyai: ServiceHealth;
    cartesia: ServiceHealth;
  };
  overall: ServiceStatus;
  cached: boolean;
}

// Rebranded labels — recruiter-facing. Vendor names stay backend-only.
const SERVICE_LABELS: Record<keyof UpstreamHealth["services"], string> = {
  gemini: "Reasoning",
  assemblyai: "Speech",
  cartesia: "Voice",
};

const STATUS_DOT_CLASS: Record<ServiceStatus, string> = {
  ok: "bg-success",
  degraded: "bg-warning",
  down: "bg-danger",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  ok: "Healthy",
  degraded: "Slow",
  down: "Down",
};

export function ServiceStatusWidget() {
  const [health, setHealth] = useState<UpstreamHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ready/upstream`, {
        method: "GET",
        // No credentials needed — endpoint is intentionally open so
        // monitoring systems (Cloud Monitoring uptime checks) can probe
        // it without juggling service-account auth.
      });
      if (!res.ok) {
        // The endpoint itself returns 200 even when upstreams fail.
        // A non-200 here means the backend itself is sick — surface
        // it as an unknown state rather than guessing.
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as UpstreamHealth;
      setHealth(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = window.setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchHealth]);

  // While we have no data yet, render nothing to avoid layout shift.
  // Recruiters shouldn't see a flash of "everything is fine" before
  // the first probe completes.
  if (!health && !error) {
    return null;
  }

  // Backend itself is unreachable — render a minimal warning so the
  // recruiter knows the dashboard's "live" indicator is stale.
  if (error && !health) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-xs text-muted px-3 py-2 rounded-md border border-rule bg-paper-2"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-muted" />
        <span>Service status unavailable</span>
      </div>
    );
  }

  // Narrowed: health is non-null here.
  const h = health as UpstreamHealth;
  const showOutageBanner = h.overall === "down";

  return (
    <div className="space-y-2">
      {showOutageBanner && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rule bg-danger-soft px-3 py-2 text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-danger" aria-hidden />
          <p className="text-danger font-medium">
            Interview service is degraded. New interviews may fail.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Toggle service status details"
        className={cn(
          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-rule",
          "bg-paper-2 hover:bg-paper-3 transition-colors",
          "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        )}
      >
        <div className="flex items-center gap-4">
          {(Object.keys(SERVICE_LABELS) as Array<keyof typeof SERVICE_LABELS>).map((key) => {
            const svc = h.services[key];
            return (
              <span
                key={key}
                className="flex items-center gap-1.5 text-xs text-ink-soft"
                aria-label={`${SERVICE_LABELS[key]} ${STATUS_LABEL[svc.status]}`}
              >
                <span
                  className={cn(
                    "inline-block w-2 h-2 rounded-full",
                    STATUS_DOT_CLASS[svc.status],
                  )}
                  aria-hidden
                />
                <span>{SERVICE_LABELS[key]}</span>
              </span>
            );
          })}
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="rounded-md border border-rule bg-paper-2 px-3 py-2 text-xs">
          <table className="w-full font-mono tabular-nums">
            <tbody className="divide-y divide-rule">
              {(Object.keys(SERVICE_LABELS) as Array<keyof typeof SERVICE_LABELS>).map((key) => {
                const svc = h.services[key];
                return (
                  <tr key={key}>
                    <td className="py-1.5 pr-3 text-ink-soft font-sans">
                      {SERVICE_LABELS[key]}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={cn(
                          "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                          STATUS_DOT_CLASS[svc.status],
                        )}
                        aria-hidden
                      />
                      <span className="font-sans text-ink-soft">{STATUS_LABEL[svc.status]}</span>
                    </td>
                    <td className="py-1.5 text-right text-ink">
                      {svc.latency_ms} ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-muted font-sans">
            Checked {new Date(h.checked_at).toLocaleTimeString()}
            {h.cached ? " (cached)" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

export default ServiceStatusWidget;
