"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/features/auth/auth-provider'
import { loadHistory, postCombat } from '@/features/combat/combat-api'
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
  const [leaveReminder, setLeaveReminder] = useState<{ matchId: string; seconds: number } | null>(null)
  const [forfeiting, setForfeiting] = useState(false)

  useEffect(() => {
    if (focusRoute) {
      const clear = window.setTimeout(() => setLeaveReminder(null), 0)
      return () => window.clearTimeout(clear)
    }
    if (!activeMatch) return
    const matchId = activeMatch.id
    const reveal = window.setTimeout(() => {
      try {
        if (window.sessionStorage.getItem('combat-leave-reminder') !== matchId) return
        window.sessionStorage.removeItem('combat-leave-reminder')
        setLeaveReminder({ matchId, seconds: 15 })
      } catch {
        // Session storage may be unavailable in privacy-restricted browsers.
      }
    }, 0)
    return () => window.clearTimeout(reveal)
  }, [activeMatch, focusRoute])

  const leaveReminderMatchId = leaveReminder?.matchId
  useEffect(() => {
    if (!leaveReminderMatchId) return
    const interval = window.setInterval(() => {
      setLeaveReminder((current) => {
        if (!current) return null
        return { ...current, seconds: Math.max(0, current.seconds - 1) }
      })
    }, 1000)
    const timeout = window.setTimeout(() => setLeaveReminder(null), 15000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [leaveReminderMatchId])

  const forfeitMatch = async () => {
    if (!leaveReminder || forfeiting) return
    setForfeiting(true)
    try {
      await postCombat({ action: 'forfeit', matchId: leaveReminder.matchId })
      setLeaveReminder(null)
      await activeMatches.mutate()
    } catch {
      // Keep the reminder visible if the authenticated forfeiture needs to be retried.
    } finally {
      setForfeiting(false)
    }
  }

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
          {leaveReminder ? (
            <div role="status" className="fixed bottom-[5.25rem] left-1/2 z-40 flex w-[min(92vw,24rem)] -translate-x-1/2 items-center gap-3 rounded-lg border-2 border-foreground bg-card px-3 py-2.5 shadow-brutal-sm md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-coral/15 text-coral-foreground" aria-hidden>{leaveReminder.seconds}</span>
              <Link href={`/combat/${leaveReminder.matchId}`} className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground">
                <span className="block text-xs font-bold">Resume your Combat match</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Resume within {leaveReminder.seconds}s. Use × to end the match explicitly.</span>
              </Link>
              <button type="button" onClick={() => void forfeitMatch()} disabled={forfeiting} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-coral/15 hover:text-coral-foreground disabled:opacity-60" aria-label="Forfeit and end Combat match" title="Forfeit and end match">
                <span aria-hidden>{forfeiting ? '…' : '×'}</span>
              </button>
            </div>
          ) : null}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
