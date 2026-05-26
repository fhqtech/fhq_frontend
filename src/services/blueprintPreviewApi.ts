/**
 * Lightweight blueprint preview — what the recruiter sees while typing.
 * Returns 10 skill chips, no persistence.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export type SkillType = "technical" | "behavioral" | "cultural";

export interface PreviewSkill {
  shortName: string;
  name: string;
  skill_type: SkillType;
}

export interface BlueprintPreview {
  skills: PreviewSkill[];
}

export interface PreviewRequest {
  title: string;
  type?: "screening" | "fitment";
  description?: string;
  /** Free-text refinement notes the recruiter typed below the preview.
   *  Passed to the blueprint agent as `topics`. */
  notes?: string;
}

/** R8.2: structured error from a domain-gate rejection.
 *  Surfaced when the backend's title classifier returns verdict='other'
 *  and the route raises HTTPException(400, detail={code, message}). */
export class PreviewOutOfScopeError extends Error {
  code = "out_of_scope";
  constructor(message: string) {
    super(message);
    this.name = "PreviewOutOfScopeError";
  }
}

export async function previewBlueprint(
  body: PreviewRequest,
  signal?: AbortSignal,
): Promise<BlueprintPreview> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/api/interviews/preview-blueprint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    // R8.2: detect the finance-only domain rejection. The 400 carries
    // { detail: { code: "out_of_scope", message: "..." } } — surface the
    // message to the rail's error UI so the recruiter sees actionable
    // copy instead of "Couldn't generate preview."
    if (response.status === 400) {
      try {
        const body = await response.json();
        const detail = body?.detail;
        if (detail && typeof detail === "object" && detail.code === "out_of_scope") {
          throw new PreviewOutOfScopeError(
            detail.message || "This platform supports finance roles only.",
          );
        }
      } catch (e) {
        if (e instanceof PreviewOutOfScopeError) throw e;
        // fall through to the generic error
      }
    }
    throw new Error(`preview-blueprint failed: ${response.status}`);
  }
  return response.json();
}
