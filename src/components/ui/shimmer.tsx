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

export function ShimmerTable() {
  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="flex gap-4 pb-2">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-24" />
      </div>
      {/* Table Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Shimmer className="h-4 w-24" />
          <div className="space-y-1">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-3 w-28" />
          </div>
          <Shimmer className="h-6 w-16 rounded-full" />
          <Shimmer className="h-4 w-8" />
          <Shimmer className="h-4 w-12" />
          <Shimmer className="h-4 w-20" />
        </div>
      ))}
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