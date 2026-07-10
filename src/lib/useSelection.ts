/**
 * P3-4 — shared selection primitive. Owns "which rows are picked" as an ordered
 * set of ids, so a bulk action bar, checkboxes, and (later) keyboard triage all
 * read the same state. Insertion order is preserved so "compare in the order I
 * picked them" holds. Deliberately generic — it knows nothing about candidates.
 */
import { useCallback, useMemo, useState } from "react";

export interface Selection {
  /** Selected ids, in the order they were added. */
  ids: string[];
  count: number;
  isSelected: (id: string) => boolean;
  /** Add the id if absent, remove it if present. */
  toggle: (id: string) => void;
  /** Replace the whole selection. */
  set: (ids: string[]) => void;
  clear: () => void;
}

export function useSelection(initial: string[] = []): Selection {
  const [ids, setIds] = useState<string[]>(initial);

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const set = useCallback((next: string[]) => setIds([...next]), []);
  const clear = useCallback(() => setIds([]), []);

  const selectedSet = useMemo(() => new Set(ids), [ids]);
  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  return { ids, count: ids.length, isSelected, toggle, set, clear };
}
