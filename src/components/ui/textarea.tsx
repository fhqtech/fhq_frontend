import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // F24.1: same magnetic focus pattern as Input.
          "flex min-h-[80px] w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted-2 transition-[box-shadow,border-color] duration-150 ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 focus-visible:border-gold-ink disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
