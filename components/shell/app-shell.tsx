'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { MobileTopBar } from './mobile-top-bar'

/** Routes that take over the screen for focused activities. */
function isFocusRoute(pathname: string): boolean {
  return (
    /^\/session\//.test(pathname) || // an active learning session
    /^\/mock-tests\/[^/]+/.test(pathname) // a running / reviewing mock test
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (isFocusRoute(pathname)) {
    // Full-bleed focus mode — global navigation hidden intentionally.
    return <div className="min-h-dvh bg-background">{children}</div>
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
