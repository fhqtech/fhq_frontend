import { cn } from "@/lib/utils";

export function Shimmer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function ShimmerCard() {
  return (
    <div className="flex items-center gap-3">
      <Shimmer className="w-9 h-9 rounded-lg shrink-0" />
      <div className="space-y-1 flex-1">
        <Shimmer className="h-6 w-12" />
        <Shimmer className="h-3 w-20" />
      </div>
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  const colWidths = ["w-24", "w-32", "w-20", "w-16", "w-20", "w-24", "w-28", "w-12"];
  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="flex gap-4 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className={cn("h-4", colWidths[i % colWidths.length])} />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Shimmer key={c} className={cn("h-4", colWidths[c % colWidths.length])} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} className={cn("h-3", i === 0 ? "w-3/4" : "w-1/2")} />
      ))}
    </div>
  );
}

export function PageSkeleton({
  header = true,
  cards = 4,
  rows = 5,
  cols = 6,
  message,
}: {
  header?: boolean;
  cards?: number;
  rows?: number;
  cols?: number;
  message?: string;
}) {
  return (
    <div
      className="container mx-auto py-6 space-y-6 animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {header && (
        <div className="space-y-3">
          <Shimmer className="h-8 w-64" />
          <Shimmer className="h-4 w-96" />
          {message && (
            <p className="text-sm text-foreground-muted pt-2">{message}</p>
          )}
        </div>
      )}
      {cards > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cards}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-8 w-16" />
            </div>
          ))}
        </div>
      )}
      {rows > 0 && (
        <div className="rounded-lg border border-border p-4">
          <ShimmerTable rows={rows} cols={cols} />
        </div>
      )}
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

export function ShimmerInterviewConfig() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Shimmer className="h-4 w-16" />
          <Shimmer className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-5 w-16" />
        </div>
        <div className="space-y-2">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-5 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Shimmer className="h-4 w-28" />
          <div className="flex gap-2">
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}