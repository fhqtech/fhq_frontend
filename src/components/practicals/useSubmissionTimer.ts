import { useEffect, useRef, useState } from "react";

/**
 * Counts down to a submission deadline (epoch ms). Returns the remaining ms,
 * or null when there is no deadline (a multi-day / untimed submission). Fires
 * onExpire exactly once when the clock reaches zero — the workspace uses it to
 * auto-submit the current draft on a timed sprint.
 */
export function useSubmissionTimer(
  deadline: number | null,
  onExpire?: () => void,
): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(
    deadline == null ? null : Math.max(0, deadline - Date.now()),
  );
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (deadline == null) {
      setRemainingMs(null);
      return;
    }
    fired.current = false;
    const tick = () => {
      const rem = Math.max(0, deadline - Date.now());
      setRemainingMs(rem);
      if (rem <= 0 && !fired.current) {
        fired.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return remainingMs;
}
