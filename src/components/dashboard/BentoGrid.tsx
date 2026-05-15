/**
 * BentoGrid — 12-col responsive grid wrapper for the dashboard.
 *
 * Children pass `cols` (1-12) + optional `rows` for grid-row spans.
 * On mobile, every cell collapses to full-width single column.
 *
 * SaaSFrame 2026 finance-dashboard guidance: hero KPI takes 4-6 cols
 * × 2 rows; secondary KPIs 2-3 cols × 1 row. We follow that pattern.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-fr",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BentoCellProps {
  children: ReactNode;
  /** Column span on md+ (1-12). Defaults to 4 (one-third). */
  cols?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12;
  /** Row span on md+ (1-3). Defaults to 1. */
  rows?: 1 | 2 | 3;
  className?: string;
}

const COL_CLASS: Record<NonNullable<BentoCellProps["cols"]>, string> = {
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  12: "md:col-span-12",
};

const ROW_CLASS: Record<NonNullable<BentoCellProps["rows"]>, string> = {
  1: "md:row-span-1",
  2: "md:row-span-2",
  3: "md:row-span-3",
};

export function BentoCell({ children, cols = 4, rows = 1, className }: BentoCellProps) {
  return (
    <div className={cn(COL_CLASS[cols], ROW_CLASS[rows], className)}>
      {children}
    </div>
  );
}
