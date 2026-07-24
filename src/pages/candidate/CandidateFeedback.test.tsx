/**
 * P12 — CandidateFeedback consent-first + honesty contract.
 *
 * These tests mock fetch (no network) and assert the non-negotiable candidate
 * safety behaviours:
 *   - the consent card renders BEFORE any skill data (and no feedback is even
 *     fetched until consent is on record);
 *   - the unverified mark ALWAYS renders (AI assessment, not a verified score);
 *   - an empty / degraded report renders the EmptyState, never an all-gaps list.
 *
 * The candidate auth context is stubbed so the page needs only a router.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CandidateFeedback from "./CandidateFeedback";

vi.mock("@/contexts/CandidateAuthContext", () => ({
  useCandidateAuth: () => ({
    account: { name: "Priya Sharma", email: "priya@example.in" },
    logout: vi.fn(),
  }),
}));

type Json = Record<string, unknown>;
const ok = (body: Json) => ({ ok: true, status: 200, json: async () => body });

// Per-test response programming.
let consentGet: Json = {};
let consentPost: Json = {};
let feedbackGet: Json = {};
let fetchSpy: ReturnType<typeof vi.fn>;

function installFetch() {
  fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.endsWith("/consent")) {
      return ok(method === "POST" ? consentPost : consentGet);
    }
    return ok(feedbackGet); // GET /api/candidate-me/feedback/{programId}
  });
  vi.stubGlobal("fetch", fetchSpy);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/candidate/feedback/prog1"]}>
      <Routes>
        <Route path="/candidate/feedback/:programId" element={<CandidateFeedback />} />
      </Routes>
    </MemoryRouter>,
  );
}

const feedbackUrls = () =>
  fetchSpy.mock.calls
    .map((c) => String(c[0]))
    .filter((u) => u.includes("/api/candidate-me/feedback/") && !u.endsWith("/consent"));

beforeEach(() => {
  localStorage.setItem("candidate_auth_token", "tok");
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("CandidateFeedback — consent-first", () => {
  it("shows the consent card and NO skill data before consent is given", async () => {
    consentGet = {
      enabled: true,
      consented: false,
      consent_version: "v1-2026-07",
      consent_text: "I agree that FlowDot AI can show me a summary of my own interview.",
    };
    // If the page ever fetched feedback here, it would (wrongly) get real items.
    feedbackGet = {
      enabled: true,
      ready: true,
      items: [{ skill_name: "Reconciliation", status: "gap" }],
    };

    renderPage();

    expect(await screen.findByText(/a quick consent, first/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i agree/i })).toBeInTheDocument();
    // No skill item leaked before consent.
    expect(screen.queryByText("Reconciliation")).toBeNull();
    // And feedback was never even requested pre-consent.
    expect(feedbackUrls()).toHaveLength(0);
  });

  it("loads the status-only report after the candidate agrees", async () => {
    consentGet = { enabled: true, consented: false, consent_version: "v1-2026-07" };
    consentPost = { enabled: true, consented: true, consent_version: "v1-2026-07" };
    feedbackGet = {
      enabled: true,
      ready: true,
      consent_required: false,
      items: [
        { skill_name: "GST compliance", status: "strong" },
        { skill_name: "Reconciliation", status: "gap" },
      ],
      retention_until: "2028-07-10T00:00:00Z",
    };

    renderPage();
    await screen.findByRole("button", { name: /i agree/i });
    await userEvent.click(screen.getByRole("button", { name: /i agree/i }));

    expect(await screen.findByText("GST compliance")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Area to grow")).toBeInTheDocument();
    // The report is status-only — no numeric hire-bar framing on screen.
    expect(screen.queryByText(/target/i)).toBeNull();
  });
});

describe("CandidateFeedback — unverified mark", () => {
  it("always renders the unverified mark (pre-consent)", async () => {
    consentGet = { enabled: true, consented: false, consent_version: "v1-2026-07" };
    renderPage();
    await screen.findByText(/a quick consent, first/i);
    expect(screen.getAllByText(/unverified/i).length).toBeGreaterThan(0);
  });

  it("always renders the unverified mark (with a ready report)", async () => {
    consentGet = { enabled: true, consented: true, consent_version: "v1-2026-07" };
    feedbackGet = {
      enabled: true,
      ready: true,
      items: [{ skill_name: "GST compliance", status: "strong" }],
    };
    renderPage();
    await screen.findByText("GST compliance");
    expect(screen.getAllByText(/unverified/i).length).toBeGreaterThan(0);
  });
});

describe("CandidateFeedback — honest degraded", () => {
  it("renders an EmptyState (not an all-gaps list) when there's no evidence", async () => {
    consentGet = { enabled: true, consented: true, consent_version: "v1-2026-07" };
    feedbackGet = { enabled: true, ready: false, reason: "no_evidence", items: [] };

    renderPage();

    expect(await screen.findByText(/isn't available yet/i)).toBeInTheDocument();
    // Honest-empty must never fabricate skill rows.
    expect(screen.queryByText("Area to grow")).toBeNull();
    expect(screen.queryByText("Strong")).toBeNull();
    // The unverified mark still stands.
    expect(screen.getAllByText(/unverified/i).length).toBeGreaterThan(0);
  });

  it("shows a graceful notice when the backend slice is disabled", async () => {
    consentGet = { enabled: false };
    renderPage();
    expect(await screen.findByText(/isn't available yet/i)).toBeInTheDocument();
    // Never attempts to fetch feedback when disabled.
    await waitFor(() => expect(feedbackUrls()).toHaveLength(0));
  });
});
