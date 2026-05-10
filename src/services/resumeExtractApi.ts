/**
 * Resume → structured candidate fields.
 *
 * Posts the uploaded file to the backend, which parses the PDF/DOCX and
 * asks Gemini to return phone / jobTitle / experience / location / linkedin.
 * Used by CandidateRegistration to pre-fill the form so candidates don't
 * re-type fields the resume already has.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export interface ExtractedResume {
  phone: string;
  jobTitle: string;
  experienceYears: number;
  location: string;
  linkedin: string;
  portfolioUrl: string;
  summary: string;
}

export async function extractFromResume(
  file: File,
  signal?: AbortSignal,
): Promise<ExtractedResume> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/candidates/extract-from-resume`, {
    method: "POST",
    body: formData,
    signal,
  });
  if (!response.ok) {
    throw new Error(`extract-from-resume failed: ${response.status}`);
  }
  return response.json();
}
