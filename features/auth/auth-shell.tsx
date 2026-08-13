import Link from 'next/link'
import { Wordmark } from '@/components/shell/wordmark'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Word Smartify home">
            <Wordmark />
          </Link>
        </div>

        <div className="rounded-lg border-2 border-foreground bg-card p-6 shadow-brutal-lg">
          <div className="mb-5">
            <h1 className="text-balance font-heading text-xl font-bold">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
      </div>
    </div>
  )
}
