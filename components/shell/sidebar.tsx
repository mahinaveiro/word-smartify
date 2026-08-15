'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from './nav-items'
import { Wordmark } from './wordmark'
import { useAuth } from '@/features/auth/auth-provider'

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
  const router = useRouter()
  const { signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace('/auth')
  }

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

      <button
        type="button"
        onClick={handleSignOut}
        className="press mt-3 flex items-center gap-3 rounded-[--radius-md] border-2 border-transparent px-3 py-2.5 font-medium text-foreground/80 hover:border-foreground hover:bg-card"
      >
        <LogOut className="size-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
        <span className="text-[15px]">Sign out</span>
      </button>
    </aside>
  )
}
