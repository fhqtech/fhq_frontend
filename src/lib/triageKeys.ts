/**
 * P3-6 — keyboard triage key map. Pure: a raw KeyboardEvent.key → a triage
 * intent, or null when the key isn't ours (so the surface leaves other keys
 * alone). Letter keys are case-insensitive. The component decides what each
 * intent does and whether write intents (toggle) are permitted.
 */
export type TriageAction = "next" | "prev" | "toggle" | "open" | "compare" | "help" | "clear";

export function resolveTriageAction(key: string): TriageAction | null {
  switch (key) {
    case "j":
    case "J":
    case "ArrowDown":
      return "next";
    case "k":
    case "K":
    case "ArrowUp":
      return "prev";
    case "x":
    case "X":
    case " ":
      return "toggle";
    case "Enter":
    case "o":
    case "O":
      return "open";
    case "c":
    case "C":
      return "compare";
    case "?":
      return "help";
    case "Escape":
      return "clear";
    default:
      return null;
  }
}

/** The shortcuts, for the discoverable help overlay. */
export const TRIAGE_SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "j / k", label: "Move between candidates" },
  { keys: "x", label: "Select or unselect" },
  { keys: "c", label: "Compare the selected (2–4)" },
  { keys: "enter", label: "Open the candidate" },
  { keys: "esc", label: "Clear selection" },
  { keys: "?", label: "Toggle this help" },
];
