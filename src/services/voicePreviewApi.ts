/**
 * Voice preview — Cartesia-backed sample matching the runtime interviewer voice.
 * Returns base64 mp3 so the UI can play it via <audio src="data:audio/mp3;base64,…">.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export interface VoicePreviewRequest {
  voice_type: string;
  voice_speed: string;
  voice_accent?: string;
  sample_text: string;
}

export interface VoicePreviewResponse {
  audio_base64: string;
  mime: string;
}

export async function previewVoice(
  body: VoicePreviewRequest,
  signal?: AbortSignal,
): Promise<VoicePreviewResponse> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/api/interviews/preview-voice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(`preview-voice failed: ${response.status}`);
  }
  return response.json();
}
