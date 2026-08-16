'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Check, LibraryBig, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { useBooks, useLevelsForBook, useLevelProgress } from '@/hooks/use-data'
import type { Level } from '@/types/database'
import type { LevelProgressSummary } from '@/repositories/interfaces'

export function LearnView() {
  const booksQuery = useBooks()
  const { data: books } = booksQuery
  const [activeBook, setActiveBook] = useState<string | null>(null)
  const bookId = activeBook ?? books?.[0]?.id ?? null
  const levelsQuery = useLevelsForBook(bookId)
  const progressQuery = useLevelProgress(bookId)
  const { data: levels } = levelsQuery
  const { data: progress } = progressQuery

  if (booksQuery.error) {
    return (
      <ErrorState
        title="Your library couldn't be loaded"
        description="The vocabulary library is still available to you. Try again."
        onRetry={() => booksQuery.mutate()}
      />
    )
  }
  if (!booksQuery.isLoading && books && books.length === 0) {
    return <EmptyState title="No vocabulary books available" description="There are no books to learn on this device yet." />
  }
  if (levelsQuery.error || progressQuery.error) {
    return (
      <ErrorState
        title="This learning path couldn't be loaded"
        description="Your progress is safe. Try loading the selected book again."
        onRetry={() => Promise.all([levelsQuery.mutate(), progressQuery.mutate()])}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Vocabulary"
        title="Learn"
        description="Work through levels of 10 words. Master each word by getting its quizzes right."
      />

      <Card className="flex min-w-0 flex-col items-start justify-between gap-4 overflow-hidden bg-mint/35 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
            <LibraryBig className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-heading font-bold">Need a reference view?</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse every Word Smart word, search meanings, and save words for later.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/library">Open Library <ArrowRight className="size-4" aria-hidden /></Link>
        </Button>
      </Card>

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}
      </>
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
  return (
    <div className="overflow-x-auto pb-2 md:overflow-visible">
      <div className="grid min-w-max auto-cols-[7.5rem] grid-flow-col grid-rows-2 gap-2 md:min-w-0 md:grid-flow-row md:grid-rows-none md:grid-cols-4 md:gap-3 lg:grid-cols-5 xl:grid-cols-6">
      {levels.map((level, index) => {
        const p = progress?.[level.id]
        const learned = p?.learned ?? 0
        const total = p?.total ?? level.word_count
        const mastered = p?.mastered ?? 0
        const complete = total > 0 && learned >= total
        const previousLevel = levels[index - 1]
        const previousProgress = previousLevel ? progress?.[previousLevel.id] : undefined
        const previousLearned = previousProgress?.learned ?? 0
        const previousTotal = previousProgress?.total ?? previousLevel?.word_count ?? 0
        const prevComplete = index === 0 || (previousTotal > 0 && previousLearned >= previousTotal)
        const locked = !prevComplete && learned === 0
        const unlocked = !locked
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
    'flex h-20 w-28 flex-col rounded-md border-2 border-foreground p-2.5 text-left md:h-24 md:w-auto md:p-3'

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
