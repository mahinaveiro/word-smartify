import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border-2 border-foreground px-2 py-0.5 font-heading text-xs font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-card text-foreground',
        mint: 'bg-mint text-mint-foreground',
        coral: 'bg-coral text-coral-foreground',
        ink: 'bg-primary text-primary-foreground',
        muted: 'border-muted-foreground/40 bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
