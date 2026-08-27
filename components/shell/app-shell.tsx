'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-provider'
import { loadHistory } from '@/features/combat/combat-api'
import type { CombatMatch } from '@/types/database'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { MobileTopBar } from './mobile-top-bar'

/** Routes that take over the screen for focused activities. */
function isFocusRoute(pathname: string): boolean {
  return (
    /^\/session\//.test(pathname) || // an active learning session
    /^\/mock-tests\/[^/]+/.test(pathname) || // a running / reviewing mock test
    /^\/combat\/[^/]+/.test(pathname) // a Combat lobby, match, or result
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const focusRoute = isFocusRoute(pathname)
  const { user } = useAuth()
  const activeMatches = useSWR<CombatMatch[]>(user && !focusRoute ? ['combat-active-shell', user.id] : null, loadHistory, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })
  const activeMatch = activeMatches.data?.find((match) => match.status === 'active')

  if (focusRoute) {
    // Full-bleed focus mode — global navigation hidden intentionally.
    return <div className="min-h-dvh bg-background">{children}</div>
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
          {children}
          {activeMatch ? <Link href={`/combat/${activeMatch.id}`} className="fixed bottom-[5.25rem] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-foreground bg-foreground px-3 py-2 text-xs font-bold text-primary-foreground shadow-brutal-sm transition-transform hover:-translate-y-0.5 md:bottom-6 md:left-auto md:right-6 md:translate-x-0" aria-label="Return to your active Combat match"><span className="size-2 rounded-full bg-mint" aria-hidden />Return to Combat<span className="text-primary-foreground/60">· R{activeMatch.current_question_index + 1}</span></Link> : null}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
