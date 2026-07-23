/**
 * Autosave a candidate's in-progress submission (markdown notes + AI-use
 * disclosure) to localStorage, keyed per interview/submission id, so a refresh
 * or accidental navigation doesn't lose hours of case work. Uploaded File
 * objects can't be persisted, so only the text answer is saved. Best-effort:
 * every access is guarded and a corrupt value reads back as null.
 */
export interface SubmissionDraft {
  notes: string;
  aiDisclosed: boolean;
}

const PREFIX = "flowdot:submission-draft:";

export function saveDraft(key: string, draft: SubmissionDraft): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(draft));
  } catch {
    /* storage full/unavailable — autosave is best-effort */
  }
}

export function loadDraft(key: string): SubmissionDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.notes === "string") {
      return { notes: parsed.notes, aiDisclosed: Boolean(parsed.aiDisclosed) };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}
