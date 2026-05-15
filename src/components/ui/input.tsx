import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // F24.1: magnetic focus — ring expands smoothly via transition-shadow
          // duration-150. Border + ring move together so the input feels
          // "received" rather than just outlined.
          "flex h-10 w-full rounded-md border border-rule bg-paper px-3 py-2 text-base text-ink placeholder:text-muted-2 transition-[box-shadow,border-color] duration-150 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:border-gold-ink disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
