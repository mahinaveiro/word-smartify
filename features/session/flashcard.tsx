'use client'

import { Lightbulb, Quote, RotateCw } from 'lucide-react'
import type { Word } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Flashcard({
  word,
  flipped,
  onFlip,
}: {
  word: Word
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-pressed={flipped}
      aria-label={flipped ? `Hide meaning of ${word.word}` : `Reveal meaning of ${word.word}`}
      className="press group relative block w-full rounded-lg border-2 border-foreground bg-card p-6 text-left shadow-brutal"
    >
      <span className="absolute right-4 top-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <RotateCw className="size-3.5" aria-hidden /> Tap to flip
      </span>

      {!flipped ? (
        <div className="flex min-h-[15rem] flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-balance font-heading text-4xl font-bold leading-tight">{word.word}</h2>
          {word.pronunciation ? (
            <p className="text-sm text-muted-foreground">{word.pronunciation}</p>
          ) : null}
          {word.difficulty ? (
            <Badge variant="muted" className="mt-2 capitalize">
              {word.difficulty}
            </Badge>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-[15rem] flex-col gap-3">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meaning
            </p>
            <p className="mt-1 text-pretty text-lg font-medium leading-relaxed">{word.english_meaning}</p>
            {word.bangla_meaning ? (
              <p lang="bn" className="font-bengali mt-1 text-sm text-muted-foreground">
                {word.bangla_meaning}
              </p>
            ) : null}
          </div>

          {word.example_sentence ? (
            <div className="flex gap-2">
              <Quote className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
              <p className="text-pretty text-sm italic leading-relaxed text-muted-foreground">
                {word.example_sentence}
              </p>
            </div>
          ) : null}

          {word.mnemonic ? (
            <div className="mt-auto flex gap-2 rounded-md border-2 border-foreground bg-mint/15 p-3">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="text-pretty text-sm leading-relaxed">{word.mnemonic}</p>
            </div>
          ) : null}
        </div>
      )}
    </button>
  )
}
