'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'press inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-heading font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-2 border-foreground bg-primary text-primary-foreground shadow-brutal hover:bg-foreground/90',
        accent:
          'border-2 border-foreground bg-mint text-mint-foreground shadow-brutal hover:brightness-105',
        outline:
          'border-2 border-foreground bg-card text-foreground shadow-brutal hover:bg-muted',
        ghost:
          'border-2 border-transparent bg-transparent text-foreground hover:bg-muted',
        coral:
          'border-2 border-foreground bg-coral text-coral-foreground shadow-brutal hover:brightness-105',
        destructive:
          'border-2 border-foreground bg-destructive text-destructive-foreground shadow-brutal hover:brightness-105',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        block: 'h-12 w-full px-5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  /** Render as the single child element (e.g. next/link) with button styles. */
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, asChild, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }))

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
        ...props,
      })
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
