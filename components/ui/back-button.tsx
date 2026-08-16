import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonBaseProps {
  label?: string
  className?: string
  disabled?: boolean
}

type BackButtonProps =
  | (BackButtonBaseProps & { href: string; onClick?: never })
  | (BackButtonBaseProps & { href?: never; onClick: () => void })

const backButtonClassName = 'press inline-flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-card text-foreground shadow-brutal-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50'

function BackIcon() {
  return <ArrowLeft className="size-6" strokeWidth={2.5} aria-hidden="true" />
}

export function BackButton({ label = 'Go back', className, ...props }: BackButtonProps) {
  const accessibleLabel = label || 'Go back'
  const classes = cn(backButtonClassName, className)

  if ('href' in props) {
    return (
      <Link href={props.href} aria-label={accessibleLabel} title={accessibleLabel} className={classes}>
        <BackIcon />
      </Link>
    )
  }

  return (
    <button type="button" aria-label={accessibleLabel} title={accessibleLabel} onClick={props.onClick} className={classes} disabled={props.disabled}>
      <BackIcon />
    </button>
  )
}
