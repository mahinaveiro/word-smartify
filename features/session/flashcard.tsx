'use client'

import { Lightbulb, Quote, RotateCw } from 'lucide-react'
import type { Word } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function formatPartOfSpeech(value: Word['part_of_speech']) {
  return value.replaceAll('_', ' ')
}

function RelatedWords({
  label,
  items,
  tone,
}: {
  label: string
  items: string[]
  tone: 'mint' | 'coral'
}) {
  if (!items.length) return null

  return (
    <div className="min-w-0 rounded-md border border-foreground/15 bg-muted/35 px-2.5 py-2">
      <p
        className={cn(
          'font-heading text-[10px] font-bold uppercase tracking-[0.12em]',
          tone === 'mint' ? 'text-mint' : 'text-coral',
        )}
      >
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={`${label}-${item}`}
            className="max-w-full truncate rounded-sm border border-foreground/20 bg-card px-1.5 py-1 text-xs font-medium leading-tight"
            title={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Flashcard({
  word,
  flipped,
  onFlip,
}: {
  word: Word
  flipped: boolean
  onFlip: () => void
}) {
  const synonyms = (word.synonyms ?? []).filter((item) => item.trim().length > 0)
  const antonyms = (word.antonyms ?? []).filter((item) => item.trim().length > 0)

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
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="neutral" className="capitalize">
              {formatPartOfSpeech(word.part_of_speech)}
            </Badge>
            {word.difficulty ? (
              <Badge variant="muted" className="capitalize">
                {word.difficulty}
              </Badge>
            ) : null}
          </div>
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

          {synonyms.length || antonyms.length ? (
            <div className="grid grid-cols-2 gap-2 border-t-2 border-foreground/15 pt-3">
              <RelatedWords label="Synonyms" items={synonyms} tone="mint" />
              <RelatedWords label="Antonyms" items={antonyms} tone="coral" />
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
