/**
 * Job description → structured blueprint seed.
 *
 * Mirrors resumeExtractApi but for JDs. Recruiter pastes text or uploads
 * a PDF/DOCX on the create-interview page; we parse it and return
 * title / domain / seniority / skills / responsibilities to pre-fill
 * the form. The backend also enforces the finance-only gate — non-finance
 * JDs come back as a 400 with the same "India finance hiring only" message
 * we surface elsewhere.
 *
 * Auth (W-FE-P1, 2026-05-28): backend now requires a recruiter JWT on
 * both routes. We attach the workspace `auth_token` so calls work the
 * same as the rest of the recruiter API surface.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type JDDomain = "accounting" | "taxation" | "management_consulting" | "other";
export type JDSeniority = "junior" | "mid" | "senior" | "lead" | "exec";

export interface ExtractedJD {
  title: string;
  domain: JDDomain;
  seniority: JDSeniority;
  requiredSkills: string[];
  responsibilities: string[];
  experienceYears: number;
  summary: string;
}

async function unwrapError(response: Response): Promise<never> {
  let detail = `JD extract failed: ${response.status}`;
  try {
    const body = await response.json();
    if (body?.detail) detail = body.detail;
  } catch {
    // body wasn't JSON; keep the status-based message
  }
  throw new Error(detail);
}

export async function extractFromJDText(
  text: string,
  signal?: AbortSignal,
): Promise<ExtractedJD> {
  const response = await fetch(`${API_BASE_URL}/api/blueprint/extract-from-jd-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!response.ok) await unwrapError(response);
  return response.json();
}

export async function extractFromJDFile(
  file: File,
  signal?: AbortSignal,
): Promise<ExtractedJD> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}/api/blueprint/extract-from-jd`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
    signal,
  });
  if (!response.ok) await unwrapError(response);
  return response.json();
}
