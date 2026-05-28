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

/** Pydantic 422 — request body failed validation. Backend schema:
 *  title min 2 / max 200, description max 1000, notes max 1000. The
 *  rail uses this to show a precise "shorten the description" message
 *  instead of "Couldn't generate preview." */
export class PreviewValidationError extends Error {
  code = "validation_error";
  constructor(message: string) {
    super(message);
    this.name = "PreviewValidationError";
  }
}

function pydanticDetailToMessage(detail: unknown): string | null {
  // FastAPI 422 shape: { detail: [{ loc: ["body", "description"],
  // msg: "...", type: "value_error.any_str.max_length", ctx: {...} }] }
  if (!Array.isArray(detail) || detail.length === 0) return null;
  const first = detail[0] as { loc?: unknown[]; msg?: string; type?: string };
  const field = Array.isArray(first.loc)
    ? first.loc.filter((part) => part !== "body").join(".")
    : "field";
  const baseMsg = first.msg || "Invalid value";
  // Friendlier copy for the two limits the rail actually hits in practice.
  if (typeof first.type === "string" && first.type.includes("max_length")) {
    return `${field} is too long — shorten it and try again.`;
  }
  if (typeof first.type === "string" && first.type.includes("min_length")) {
    return `${field} is too short — add more detail and try again.`;
  }
  return `${field}: ${baseMsg}`;
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
    // 2026-05-28: surface Pydantic 422 with a useful message instead of
    // "Couldn't generate preview." — the most common cause is
    // description > 1000 chars when the recruiter pastes a long JD.
    if (response.status === 422) {
      try {
        const body = await response.json();
        const msg = pydanticDetailToMessage(body?.detail);
        if (msg) throw new PreviewValidationError(msg);
      } catch (e) {
        if (e instanceof PreviewValidationError) throw e;
        // fall through
      }
    }
    throw new Error(`preview-blueprint failed: ${response.status}`);
  }
  return response.json();
}
