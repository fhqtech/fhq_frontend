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
    throw new Error(`preview-blueprint failed: ${response.status}`);
  }
  return response.json();
}
