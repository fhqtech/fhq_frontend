/**
 * AnimatedCounter — count-up number reveal.
 *
 * BuildUI recipe (https://buildui.com/recipes/animated-counter): use a
 * Framer Motion spring on a synthetic motion value, subscribe in a
 * span via useTransform → format to integer. font-mono tabular-nums
 * means the digit columns don't reflow as the number changes.
 *
 * F24: used by TAG score reveal (F24.4), Dashboard KPIs (F24.5), and
 * marketing scroll-driven stats (F24.7). transform + opacity only.
 */
import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  /** Animation duration in ms. Default 600. */
  duration?: number;
  /** Start value. Default 0 (counts up from zero on mount). */
  from?: number;
  /** Number formatter. Default: integer with no separators. */
  format?: (n: number) => string;
  /** Tailwind classes for the wrapping span. font-mono tabular-nums applied automatically. */
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 600,
  from = 0,
  format = (n) => Math.round(n).toString(),
  className,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(from);
  const rounded = useTransform(motionValue, (v) => format(v));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: [0.16, 1, 0.3, 1], // ease-out-expo
    });
    return () => controls.stop();
  }, [motionValue, value, duration]);

  return (
    <motion.span
      className={cn("font-mono tabular-nums", className)}
      aria-label={format(value)}
    >
      {rounded}
    </motion.span>
  );
}
