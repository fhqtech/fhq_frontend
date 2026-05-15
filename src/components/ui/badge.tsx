import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink text-paper hover:bg-ink/90",
        secondary: "border-transparent bg-paper-3 text-ink hover:bg-paper-4",
        destructive: "border-transparent bg-danger text-paper hover:bg-danger/90",
        outline: "text-ink border-rule",
      },
      tone: {
        neutral: "border-transparent bg-paper-3 text-ink",
        gold: "border-transparent bg-gold-soft text-gold-ink",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-danger-soft text-danger",
        info: "border-transparent bg-info-soft text-info",
      },
      kicker: {
        true: "font-mono uppercase tracking-wide text-[11px]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      kicker: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
