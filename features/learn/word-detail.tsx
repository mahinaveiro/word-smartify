'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lightbulb, Quote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { BackButton } from '@/components/ui/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { WordStatusBadge } from '@/features/shared/word-status'
import { useWord, useWordProgress } from '@/hooks/use-data'

export function WordDetail({ wordId }: { wordId: string }) {
  const router = useRouter()
  const wordQuery = useWord(wordId)
  const progressQuery = useWordProgress(wordId)
  const { data: word } = wordQuery
  const { data: progress } = progressQuery
  // Bangla is a deliberate reveal — English stays primary until the learner asks.
  const [showBangla, setShowBangla] = useState(false)

  if (wordQuery.isLoading || progressQuery.isLoading) return <WordDetailSkeleton />
  if (wordQuery.error || progressQuery.error) {
    return (
      <ErrorState
        title="This word couldn't be loaded"
        description="The word details are unavailable right now. Try again."
        onRetry={() => Promise.all([wordQuery.mutate(), progressQuery.mutate()])}
      />
    )
  }
  if (!word) {
    return <EmptyState title="Word not found" description="This word is no longer available." action={<button type="button" onClick={() => router.back()} className="font-heading text-sm font-bold underline underline-offset-4">Go back</button>} />
  }

  const status = progress?.status ?? 'new'

  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={() => router.back()} className="-mb-2 self-start" />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-balance font-heading text-3xl font-bold leading-tight">{word.word}</h1>
              {word.pronunciation ? (
                <p className="mt-1 text-sm text-muted-foreground">{word.pronunciation}</p>
              ) : null}
            </div>
            <WordStatusBadge status={status} />
          </div>

          <div className="mt-5 rounded-md border-2 border-foreground bg-muted/50 p-4">
            <p className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meaning
            </p>
            <p className="mt-1 text-pretty text-base font-medium leading-relaxed">{word.english_meaning}</p>
            {word.bangla_meaning ? (
              <div className="mt-3 border-t-2 border-dashed border-foreground/15 pt-3">
                {showBangla ? (
                  <div className="flex items-start justify-between gap-3">
                    <p lang="bn" className="font-bengali text-pretty text-sm leading-relaxed text-foreground">
                      {word.bangla_meaning}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowBangla(false)}
                      className="press inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      aria-expanded={true}
                    >
                      <EyeOff className="size-3.5" aria-hidden /> Hide
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowBangla(true)}
                    className="press inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    aria-expanded={false}
                  >
                    <Eye className="size-3.5" aria-hidden /> Show Bangla meaning
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {word.example_sentence ? (
            <div className="mt-4 flex gap-3">
              <Quote className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
              <p className="text-pretty text-sm italic leading-relaxed text-muted-foreground">
                {word.example_sentence}
              </p>
            </div>
          ) : null}

          {word.mnemonic ? (
            <div className="mt-4 flex gap-3 rounded-md border-2 border-foreground bg-mint/15 p-3">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
              <div>
                <p className="font-heading text-xs font-bold uppercase tracking-wide">Memory hook</p>
                <p className="mt-0.5 text-pretty text-sm leading-relaxed">{word.mnemonic}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {word.synonyms?.length ? (
        <WordChips title="Synonyms" items={word.synonyms} tone="mint" />
      ) : null}
      {word.antonyms?.length ? (
        <WordChips title="Antonyms" items={word.antonyms} tone="coral" />
      ) : null}

      {progress ? (
        <Card flat className="border-foreground/15 bg-muted/30">
          <CardContent className="flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm">
            <Stat label="Correct" value={progress.correct_count} />
            <Stat label="Wrong" value={progress.wrong_count} />
            <Stat label="Recall streak" value={progress.recall_streak} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function WordChips({ title, items, tone }: { title: string; items: string[]; tone: 'mint' | 'coral' }) {
  return (
    <div>
      <p className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Badge key={s} variant={tone}>
            {s}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-heading text-lg font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  )
}

function WordDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
