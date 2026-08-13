'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from './nav-items'
import { Wordmark } from './wordmark'

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'press flex items-center gap-3 rounded-[--radius-md] border-2 px-3 py-2.5 font-medium',
        active
          ? 'border-foreground bg-mint text-mint-foreground shadow-brutal-sm'
          : 'border-transparent text-foreground/80 hover:border-foreground hover:bg-card',
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span className="text-[15px]">{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r-2 border-foreground bg-sidebar px-4 py-6 md:flex md:flex-col">
      <Link href="/dashboard" className="mb-8 inline-flex px-1">
        <Wordmark />
      </Link>

      <nav className="flex flex-1 flex-col gap-1.5" aria-label="Primary">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="my-4 border-t-2 border-dashed border-foreground/25" />

        {SECONDARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="mt-4 rounded-[--radius-md] border-2 border-foreground bg-muted px-3 py-3">
        <p className="font-heading text-sm font-semibold">Local mode</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Running on local sample data. Progress is saved on this device.
        </p>
      </div>
    </aside>
  )
}
