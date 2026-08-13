'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV, isActive } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-foreground bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="press flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-[--radius-sm] border-2 transition-colors',
                    active
                      ? 'border-foreground bg-mint text-mint-foreground shadow-brutal-sm'
                      : 'border-transparent text-foreground/70',
                  )}
                >
                  <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <span className={cn(active ? 'text-foreground' : 'text-foreground/70')}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
