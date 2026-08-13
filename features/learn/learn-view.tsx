'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Search, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useBooks, useLevelsForBook, useLevelProgress } from '@/hooks/use-data'
import type { Level } from '@/types/database'
import type { LevelProgressSummary } from '@/repositories/interfaces'
import { WordSearchResults } from './word-search'

export function LearnView() {
  const { data: books } = useBooks()
  const [activeBook, setActiveBook] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const bookId = activeBook ?? books?.[0]?.id ?? null
  const { data: levels } = useLevelsForBook(bookId)
  const { data: progress } = useLevelProgress(bookId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Vocabulary"
        title="Learn"
        description="Work through levels of 10 words. Master each word by getting its quizzes right."
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all 1,888 words…"
          className="pl-9"
          aria-label="Search words"
        />
      </div>

      {query.trim() ? (
        <WordSearchResults query={query.trim()} />
      ) : (
        <>
          {/* Book tabs */}
          <div className="flex gap-2" role="tablist" aria-label="Books">
            {books ? (
              books.map((b) => {
                const active = b.id === bookId
                return (
                  <button
                    key={b.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveBook(b.id)}
                    className={cn(
                      'press flex-1 rounded-md border-2 border-foreground px-3 py-2.5 text-left font-heading text-sm font-bold transition-colors',
                      active
                        ? 'bg-foreground text-primary-foreground shadow-brutal-sm'
                        : 'bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {b.name}
                    <span className="mt-0.5 block text-xs font-medium opacity-70">
                      {b.word_count.toLocaleString()} words
                    </span>
                  </button>
                )
              })
            ) : (
              <>
                <Skeleton className="h-14 flex-1" />
                <Skeleton className="h-14 flex-1" />
              </>
            )}
          </div>

          {/* Level grid */}
          {levels ? (
            <LevelGrid levels={levels} progress={progress} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LevelGrid({
  levels,
  progress,
}: {
  levels: Level[]
  progress: Record<string, LevelProgressSummary> | undefined
}) {
  // A level unlocks when the previous one is fully learned (first is always open).
  let prevComplete = true
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {levels.map((level) => {
        const p = progress?.[level.id]
        const learned = p?.learned ?? 0
        const total = p?.total ?? level.word_count
        const mastered = p?.mastered ?? 0
        const complete = total > 0 && learned >= total
        const locked = !prevComplete && learned === 0
        const unlocked = !locked
        prevComplete = complete
        const pct = total > 0 ? Math.round((learned / total) * 100) : 0

        return (
          <LevelCard
            key={level.id}
            level={level}
            learned={learned}
            total={total}
            mastered={mastered}
            pct={pct}
            complete={complete}
            locked={locked}
            unlocked={unlocked}
          />
        )
      })}
    </div>
  )
}

function LevelCard({
  level,
  learned,
  total,
  mastered,
  pct,
  complete,
  locked,
  unlocked,
}: {
  level: Level
  learned: number
  total: number
  mastered: number
  pct: number
  complete: boolean
  locked: boolean
  unlocked: boolean
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className="font-heading text-lg font-bold leading-none">{level.level_number}</span>
        {locked ? (
          <Lock className="size-4 text-muted-foreground" aria-hidden />
        ) : complete ? (
          <span className="grid size-6 place-items-center rounded-full border-2 border-foreground bg-mint text-mint-foreground">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-auto">
        <p className="text-xs font-medium text-muted-foreground">
          {locked ? 'Locked' : `${learned}/${total} learned`}
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full border-2 border-foreground bg-card">
          <div
            className={cn('h-full', mastered >= total && total > 0 ? 'bg-mint' : 'bg-coral')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  )

  const base =
    'flex h-24 flex-col rounded-md border-2 border-foreground p-3 text-left'

  if (locked) {
    return (
      <div className={cn(base, 'bg-muted/50 opacity-70')} aria-disabled="true">
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/learn/level/${level.id}`}
      className={cn(base, 'press bg-card shadow-brutal-sm hover:bg-muted/40', complete && 'bg-mint/10')}
      aria-label={`Level ${level.level_number}, ${learned} of ${total} learned`}
    >
      {inner}
    </Link>
  )
}
