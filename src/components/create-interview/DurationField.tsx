/**
 * DurationField — number input + three quick-set chips.
 *
 * Design: input-first. The numeric input is the source of truth in the UI
 * and is always visible. Below it, three small chips (10 / 15 / 20) act
 * as one-click shortcuts. Picking a chip writes to the input; typing in
 * the input un-styles the chips that don't match.
 *
 * Two pieces of state:
 *   - `value` (controlled prop, the canonical form value, "" or "10".."60")
 *   - `draft` (local string buffer so partial input — including empty
 *     string while the user backspaces — doesn't bounce the value or
 *     unmount the field).
 *
 * On blur or Enter, draft is clamped to [5, 60] and synced back to value.
 */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DurationFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** When this matches a chip's `recommendedFor`, a "Recommended" hint shows under it. */
  recommendedFor?: string;
}

const CHIPS: Array<{ value: string; recommendedFor?: string }> = [
  { value: "10", recommendedFor: "screening" },
  { value: "15" },
  { value: "20", recommendedFor: "fitment" },
];

const MIN = 5;
const MAX = 60;

export function DurationField({ value, onChange, recommendedFor }: DurationFieldProps) {
  const [draft, setDraft] = useState(value);

  // External value changes (e.g. chip click, form reset) flow into the draft.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (raw: string) => {
    if (raw === "") {
      onChange("");
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setDraft(value); // revert
      return;
    }
    const clamped = Math.max(MIN, Math.min(MAX, parsed));
    const next = String(clamped);
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Input
          type="number"
          min={MIN}
          max={MAX}
          step={1}
          inputMode="numeric"
          placeholder="15"
          value={draft}
          onChange={(e) => {
            // Buffer freely; commit only on blur / Enter / chip click.
            setDraft(e.target.value);
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-20 h-10 text-center font-mono tabular-nums text-base"
          aria-label="Interview duration in minutes"
        />
        <span className="text-xs text-muted">min</span>
      </div>
      <div className="flex items-center gap-1.5">
        {CHIPS.map((chip) => {
          const isSelected = value === chip.value;
          const isRecommended =
            recommendedFor && chip.recommendedFor === recommendedFor;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => {
                setDraft(chip.value);
                onChange(chip.value);
              }}
              className={cn(
                "h-6 min-w-[2.25rem] px-2 rounded text-[11px] font-mono font-medium tabular-nums transition-colors",
                isSelected
                  ? "bg-ink text-paper"
                  : "border border-rule text-ink-soft hover:bg-paper-3 hover:text-ink",
              )}
              title={
                isRecommended
                  ? `Recommended for ${recommendedFor}`
                  : `Set to ${chip.value} min`
              }
            >
              {chip.value}
              {isRecommended && (
                <span className="ml-1 text-gold-ink">·</span>
              )}
            </button>
          );
        })}
      </div>
      <span className="text-[10px] text-muted">5–60 min</span>
    </div>
  );
}
