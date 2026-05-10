/**
 * Interview field suggestions — calls the AI auto-fill endpoint.
 *
 * Used by CreateInterview Step 1 to pre-fill description / duration / type /
 * voice settings the moment the recruiter pauses typing the role title.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export interface InterviewSuggestion {
  description: string;
  duration_minutes: number;
  type: "screening" | "fitment";
  voice_type: "professional-female" | "professional-male";
  voice_accent: "indian" | "american" | "british";
  voice_speed: "slow" | "normal" | "fast";
}

export async function suggestFromTitle(
  title: string,
  signal?: AbortSignal,
): Promise<InterviewSuggestion> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/api/interviews/suggest-from-title`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ title }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`suggest-from-title failed: ${response.status}`);
  }
  return response.json();
}
