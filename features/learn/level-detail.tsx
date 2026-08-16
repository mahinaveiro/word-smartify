'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { BackButton } from '@/components/ui/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { WordStatusBadge } from '@/features/shared/word-status'
import { useLevel, useWordsForLevel, useAllProgress } from '@/hooks/use-data'
import type { WordStatus } from '@/types/database'

export function LevelDetail({ levelId }: { levelId: string }) {
  const router = useRouter()
  const levelQuery = useLevel(levelId)
  const wordsQuery = useWordsForLevel(levelId)
  const progressQuery = useAllProgress()
  const { data: level } = levelQuery
  const { data: words } = wordsQuery
  const { data: progress } = progressQuery

  if ([levelQuery, wordsQuery, progressQuery].some((query) => query.isLoading)) return <LevelDetailSkeleton />
  if ([levelQuery, wordsQuery, progressQuery].some((query) => query.error)) {
    return (
      <ErrorState
        title="This level couldn't be loaded"
        description="Your learning progress is safe. Try loading this level again."
        onRetry={() => Promise.all([levelQuery.mutate(), wordsQuery.mutate(), progressQuery.mutate()])}
      />
    )
  }
  if (!level || !words) {
    return <EmptyState title="Level not found" description="This level is no longer available." action={<BackButton href="/learn" />} />
  }

  const statusByWord = new Map<string, WordStatus>()
  for (const p of progress ?? []) statusByWord.set(p.word_id, p.status)

  const started = words.some((w) => (statusByWord.get(w.id) ?? 'new') !== 'new')
  const mastered = words.filter((w) => statusByWord.get(w.id) === 'mastered').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackButton href="/learn" className="-mb-2" />
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Level {level.level_number}
            </p>
            <h1 className="font-heading text-2xl font-bold sm:text-3xl">{level.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {words.length} words · {mastered} mastered
            </p>
          </div>
        </div>
      </div>

      <Button size="lg" onClick={() => router.push(`/session/${levelId}`)} className="w-full sm:w-auto">
        {started ? <RotateCcw className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        {started ? 'Continue session' : 'Start learning'}
      </Button>

      <div className="flex flex-col gap-2">
        {words.map((w) => {
          const status = statusByWord.get(w.id) ?? 'new'
          return (
            <Link key={w.id} href={`/word/${w.id}`} className="block">
              <Card className="transition-colors hover:bg-muted">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-heading text-base font-bold hover:underline">
                        {w.word}
                      </span>
                      {w.pronunciation ? (
                        <span className="truncate text-xs text-muted-foreground">{w.pronunciation}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{w.english_meaning}</p>
                  </div>
                  <WordStatusBadge status={status} />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function LevelDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-12 w-48" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
