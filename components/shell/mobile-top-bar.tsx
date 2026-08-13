'use client'

import Link from 'next/link'
import { Flame } from 'lucide-react'
import { Wordmark } from './wordmark'
import { useStats } from '@/hooks/use-data'

export function MobileTopBar() {
  const { data: stats } = useStats()
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-foreground bg-card px-4 py-3 md:hidden">
      <Link href="/dashboard" aria-label="Word Smartify home">
        <Wordmark />
      </Link>
      <div
        className="flex items-center gap-1.5 rounded-[--radius-sm] border-2 border-foreground bg-coral px-2.5 py-1 font-heading text-sm font-bold text-coral-foreground shadow-brutal-sm"
        aria-label={`${stats?.current_streak ?? 0} day streak`}
      >
        <Flame className="size-4" strokeWidth={2.5} aria-hidden="true" />
        <span>{stats?.current_streak ?? 0}</span>
      </div>
    </header>
  )
}
