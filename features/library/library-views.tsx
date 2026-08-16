'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Filter,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { BackButton } from '@/components/ui/back-button'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  useBook,
  useBooks,
  useChaptersForBook,
  useLevel,
  useLevelsForBook,
  useLibrarySearch,
  useSavedWord,
  useSavedWords,
  useWord,
  useWordsForLevel,
} from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useQuizEngine } from '@/hooks/use-quiz-engine'
import type { Book, DictionarySearchFilters, Level, Word } from '@/types/database'
import { QuizCard } from '@/features/session/quiz-card'

function libraryWordHref(wordId: string, bookSlug?: string | null) {
  return bookSlug ? `/library/${bookSlug}/word/${wordId}` : `/library/word/${wordId}`
}

function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}

function LibraryBackButton({ href, label = 'Go back' }: { href: string; label?: string }) {
  return <BackButton href={href} label={label} className="-mb-2" />
}

type FilterOption = { value: string | null; label: string }

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: string | null
  placeholder: string
  options: FilterOption[]
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)?.label ?? placeholder

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span>{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'relative flex h-10 w-full items-center justify-between rounded-md border-2 border-foreground bg-card px-3 pr-10 text-left text-sm font-medium normal-case tracking-normal text-foreground transition-colors',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown className={cn('pointer-events-none absolute right-3 size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <div role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-50 mt-1 h-56 overflow-y-auto overscroll-contain rounded-md border-2 border-foreground bg-card p-1 shadow-brutal-sm">
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value ?? 'all'}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm normal-case tracking-normal transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'bg-mint/45 font-semibold',
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function LibraryLandingView() {
  const query = useBooks()

  if (query.error) {
    return <ErrorState title="Library couldn't be loaded" description="Your vocabulary is safe. Try again." onRetry={() => void query.mutate()} />
  }
  if (!query.data && query.isLoading) return <LoadingRows count={2} />
  if (!query.data?.length) return <EmptyState title="No books available" description="There are no vocabulary books available right now." />

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <LibraryBackButton href="/dashboard" label="Back to home" />
      <PageHeader title="Library" />

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Card className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden bg-mint/40 p-3.5 sm:gap-5 sm:p-6">
          <div className="min-w-0">
            <Badge variant="mint">Dictionary</Badge>
            <h2 className="mt-2 font-heading text-lg font-bold sm:mt-3 sm:text-xl">Search the whole vocabulary</h2>
            <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Search the vocabulary.</p>
          </div>
          <Button asChild variant="primary" size="sm" className="w-fit">
            <Link href="/library/dictionary">
              <Search className="size-4" aria-hidden />
              Open dictionary
            </Link>
          </Button>
        </Card>
        <Card className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden bg-coral/35 p-3.5 sm:gap-5 sm:p-6">
          <div className="min-w-0">
            <Badge variant="coral">Private shelf</Badge>
            <h2 className="mt-2 font-heading text-lg font-bold sm:mt-3 sm:text-xl">Saved words</h2>
            <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Keep words for review.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href="/library/saved">
              <Bookmark className="size-4" aria-hidden />
              View saved words
            </Link>
          </Button>
        </Card>
      </div>

      <section className="flex flex-col gap-2.5 sm:gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Curriculum</p>
            <h2 className="font-heading text-xl font-bold sm:text-2xl">Choose a book</h2>
          </div>
          <span className="text-sm text-muted-foreground">{query.data.length} available</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {query.data.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>
    </div>
  )
}

function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/library/${book.slug}`} className="group block min-w-0">
      <Card className="flex h-full min-w-0 max-w-full items-start justify-between gap-2.5 overflow-hidden p-3 transition-transform duration-normal group-hover:-translate-y-0.5 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm sm:size-11">
            <BookOpen className="size-4 sm:size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-heading text-lg font-bold">{book.name}</h3>
            <p className="mt-1 line-clamp-1 break-words text-xs text-muted-foreground sm:text-sm">{book.description || 'Word Smart vocabulary.'}</p>
            <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:mt-3 sm:text-xs">{book.word_count.toLocaleString()} words</p>
          </div>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
      </Card>
    </Link>
  )
}

export function LibraryBookView({ bookSlug }: { bookSlug: string }) {
  const bookQuery = useBook(bookSlug)
  const chaptersQuery = useChaptersForBook(bookQuery.data?.id ?? null)
  const levelsQuery = useLevelsForBook(bookQuery.data?.id ?? null)

  if (bookQuery.error || chaptersQuery.error || levelsQuery.error) {
    return <ErrorState title="This book couldn't be loaded" description="Try opening the book again." onRetry={() => void Promise.all([bookQuery.mutate(), chaptersQuery.mutate(), levelsQuery.mutate()])} />
  }
  if (!bookQuery.data || !chaptersQuery.data || !levelsQuery.data) return <LoadingRows count={6} />
  const book = bookQuery.data

  const levelsByChapter = new Map<string, Level[]>()
  levelsQuery.data.forEach((level) => {
    const current = levelsByChapter.get(level.chapter_id) ?? []
    current.push(level)
    levelsByChapter.set(level.chapter_id, current)
  })

  return (
    <div className="flex flex-col gap-6">
      <LibraryBackButton href="/library" label="Back to library" />
      <PageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>{book.name}</span>
            <span className="text-sm font-semibold text-muted-foreground sm:text-base">{levelsQuery.data.length} levels</span>
          </span>
        }
      />
      <div className="flex w-full justify-center">
        <Button asChild variant="accent" size="sm" className="w-full justify-center">
          <Link href={`/library/${book.slug}/dictionary`}>
            <Search className="size-4" aria-hidden />
            Search this book
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chaptersQuery.data.flatMap((chapter) => levelsByChapter.get(chapter.id) ?? []).map((level) => (
          <Link key={level.id} href={`/library/${book.slug}/level/${level.level_number}`} className="group block min-w-0">
            <Card className="flex min-w-0 items-center justify-between gap-3 overflow-hidden p-4 transition-transform duration-normal group-hover:-translate-y-0.5 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Level {level.level_number}</p>
                <h3 className="mt-1 break-words font-heading font-bold">{level.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{level.word_count} words</p>
              </div>
              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function LibraryLevelView({ bookSlug, levelNumber }: { bookSlug: string; levelNumber: number }) {
  const bookQuery = useBook(bookSlug)
  const levelsQuery = useLevelsForBook(bookQuery.data?.id ?? null)
  const level = levelsQuery.data?.find((candidate) => candidate.level_number === levelNumber) ?? null
  const wordsQuery = useWordsForLevel(level?.id ?? null)

  if (bookQuery.error || levelsQuery.error || wordsQuery.error) {
    return <ErrorState title="This level couldn't be loaded" description="Try opening the level again." onRetry={() => void Promise.all([bookQuery.mutate(), levelsQuery.mutate(), wordsQuery.mutate()])} />
  }
  if (!bookQuery.data || !levelsQuery.data || !level || !wordsQuery.data) return <LoadingRows count={8} />
  const book = bookQuery.data

  return (
    <div className="flex flex-col gap-6">
      <LibraryBackButton href={`/library/${book.slug}`} label={`Back to ${book.name}`} />
      <PageHeader title={level.title} />
      <div className="grid gap-2">
        {wordsQuery.data.map((word, index) => (
          <WordRow key={word.id} word={word} bookSlug={book.slug} number={index + 1} />
        ))}
      </div>
      {!wordsQuery.data.length ? <EmptyState title="No words in this level" description="This level does not contain vocabulary yet." /> : null}
    </div>
  )
}

function WordRow({ word, bookSlug, number }: { word: Word; bookSlug?: string; number?: number }) {
  return (
    <Link href={libraryWordHref(word.id, bookSlug)} className="group block min-w-0 max-w-full">
      <Card className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden p-3 transition-transform duration-normal group-hover:-translate-y-0.5 sm:gap-3 sm:px-5 sm:py-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded border-2 border-foreground bg-muted font-heading text-[0.7rem] font-bold sm:size-8 sm:text-xs">{number ?? word.book_word_number}</span>
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate font-heading text-sm font-bold sm:text-base">{word.word}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:text-sm">{word.english_meaning}</span>
        </span>
        {word.difficulty ? <Badge variant="muted" className="hidden capitalize sm:inline-flex">{word.difficulty}</Badge> : null}
        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
      </Card>
    </Link>
  )
}

export function LibraryDictionaryView({ bookSlug }: { bookSlug?: string }) {
  const bookQuery = useBook(bookSlug ?? null)
  const booksQuery = useBooks()
  const [query, setQuery] = useState('')
  const [bookId, setBookId] = useState<string | null>(bookQuery.data?.id ?? null)
  const [levelId, setLevelId] = useState<string | null>(null)
  const [letter, setLetter] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const effectiveBookId = bookSlug ? (bookQuery.data?.id ?? null) : bookId
  const levelsQuery = useLevelsForBook(effectiveBookId)
  const filters: DictionarySearchFilters = {
    query: query.trim() || undefined,
    book_id: effectiveBookId,
    level_id: levelId,
    letter,
  }
  const resultsQuery = useLibrarySearch(filters, 24, page * 24)
  const activeBook = booksQuery.data?.find((book) => book.id === effectiveBookId)

  const updateFilter = (setter: (value: string | null) => void, value: string | null) => {
    setter(value)
    setPage(0)
  }

  if (resultsQuery.error || booksQuery.error || bookQuery.error || levelsQuery.error) {
    return <ErrorState title="Dictionary couldn't be loaded" description="Try the search again." onRetry={() => void Promise.all([resultsQuery.mutate(), booksQuery.mutate(), bookQuery.mutate(), levelsQuery.mutate()])} />
  }

  return (
    <div className="flex flex-col gap-6">
      <LibraryBackButton href={activeBook ? `/library/${activeBook.slug}` : '/library'} label={activeBook ? `Back to ${activeBook.name}` : 'Back to library'} />
      <PageHeader title="Search the vocabulary" />

        <Card className="relative z-20 flex flex-col gap-4 overflow-visible bg-muted/45 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Search a word, meaning, synonym…" className="pl-9" aria-label="Search dictionary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Book"
            value={effectiveBookId}
            placeholder="All books"
            disabled={Boolean(bookSlug)}
            options={[
              { value: null, label: 'All books' },
              ...(booksQuery.data?.map((book) => ({ value: book.id, label: book.name })) ?? []),
            ]}
            onChange={(value) => { updateFilter(setBookId, value); setLevelId(null) }}
          />
          <FilterSelect
            label="Level"
            value={levelId}
            placeholder="All levels"
            disabled={!effectiveBookId}
            options={[
              { value: null, label: 'All levels' },
              ...(levelsQuery.data?.map((level) => ({ value: level.id, label: `Level ${level.level_number}` })) ?? []),
            ]}
            onChange={(value) => updateFilter(setLevelId, value)}
          />
          <FilterSelect
            label="First letter"
            value={letter}
            placeholder="A–Z"
            options={[
              { value: null, label: 'A–Z' },
              ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((value) => ({ value, label: value })),
            ]}
            onChange={(value) => updateFilter(setLetter, value)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Filter className="size-4" aria-hidden /> {resultsQuery.data?.total ?? 0} matching words</span>
          {(query || bookId || levelId || letter) ? <Button type="button" variant="ghost" size="sm" onClick={() => { setQuery(''); setBookId(null); setLevelId(null); setLetter(null); setPage(0) }}><X className="size-4" aria-hidden /> Clear</Button> : null}
        </div>
      </Card>

      {resultsQuery.isLoading && !resultsQuery.data ? <LoadingRows count={6} /> : resultsQuery.data?.items.length ? (
        <>
          <div className="grid gap-2">
            {resultsQuery.data.items.map((word) => <WordRow key={word.id} word={word} />)}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ArrowLeft className="size-4" aria-hidden /> Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button type="button" variant="outline" size="sm" disabled={(page + 1) * 24 >= (resultsQuery.data.total ?? 0)} onClick={() => setPage((value) => value + 1)}>Next <ArrowRight className="size-4" aria-hidden /></Button>
          </div>
        </>
      ) : <EmptyState title="No matching words" description="Try a broader spelling, meaning, synonym, or filter." />}
    </div>
  )
}

export function LibrarySavedView() {
  const query = useSavedWords(100)

  if (query.error) return <ErrorState title="Saved words couldn't be loaded" description="Your bookmarks are safe. Try again." onRetry={() => void query.mutate()} />
  if (!query.data && query.isLoading) return <LoadingRows count={5} />

  return (
    <div className="flex flex-col gap-6">
      <LibraryBackButton href="/library" label="Back to library" />
      <PageHeader title="Saved words" />
      {!query.data?.items.length ? <EmptyState title="No saved words yet" description="Open a word in Library and use Save word to build your private shelf." /> : (
        <div className="grid gap-2">
          {query.data.items.map((saved) => <WordRow key={saved.id} word={saved.word} />)}
        </div>
      )}
    </div>
  )
}

export function LibraryWordDetailView({ wordId, bookSlug }: { wordId: string; bookSlug?: string }) {
  const wordQuery = useWord(wordId)
  const levelQuery = useLevel(wordQuery.data?.level_id ?? null)
  const wordsQuery = useWordsForLevel(wordQuery.data?.level_id ?? null)
  const savedQuery = useSavedWord(wordId)
  const { saveWord, removeSavedWord, addToReview } = useActions()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'review' | null>(null)
  const [testMe, setTestMe] = useState(false)
  const tryMeQuestion = useMemo(() => {
    const currentWord = wordQuery.data
    const levelWords = wordsQuery.data
    if (!currentWord || !levelWords) return null

    const candidates = levelWords.filter((candidate) => candidate.id !== currentWord.id && candidate.english_meaning.trim())
    if (candidates.length < 4) return null

    const targetIndex = Math.abs(currentWord.book_word_number) % candidates.length
    const target = candidates[targetIndex]
    const distractors = candidates.filter((candidate) => candidate.id !== target.id).slice(0, 3)
    if (distractors.length < 3) return null

    return {
      id: `try-me-${currentWord.id}-${target.id}`,
      word_id: target.id,
      question_type: 'meaning' as const,
      question: `Which word means “${target.english_meaning}”?`,
      options: [target.word, ...distractors.map((candidate) => candidate.word)],
      correct_answer: target.word,
      explanation: `${target.word} means “${target.english_meaning}.”`,
      difficulty: target.difficulty,
      created_at: target.created_at,
    }
  }, [wordQuery.data, wordsQuery.data])
  const quiz = useQuizEngine(tryMeQuestion)

  useEffect(() => {
    if (!testMe || !quiz.revealed) return
    const timeout = window.setTimeout(() => {
      setTestMe(false)
      quiz.reset()
    }, 1400)
    return () => window.clearTimeout(timeout)
  }, [quiz.revealed, quiz.reset, testMe])

  if (wordQuery.error || levelQuery.error || wordsQuery.error || savedQuery.error) {
    return <ErrorState title="Word details couldn't be loaded" description="Try opening the word again." onRetry={() => void Promise.all([wordQuery.mutate(), levelQuery.mutate(), wordsQuery.mutate(), savedQuery.mutate()])} />
  }
  if (!wordQuery.data || !levelQuery.data || !wordsQuery.data || savedQuery.data == null) return <LoadingRows count={6} />

  const word = wordQuery.data
  const index = wordsQuery.data.findIndex((item) => item.id === word.id)
  const previous = index > 0 ? wordsQuery.data[index - 1] : null
  const next = index >= 0 && index < wordsQuery.data.length - 1 ? wordsQuery.data[index + 1] : null
  const resolvedBookSlug = bookSlug ?? null

  const closeTestMe = () => {
    setTestMe(false)
    quiz.reset()
    setFeedback(null)
  }

  const toggleSave = async () => {
    setBusy('save')
    setFeedback(null)
    try {
      if (savedQuery.data) {
        await removeSavedWord(word.id)
        setFeedback('Removed from saved words.')
      } else {
        await saveWord(word.id)
        setFeedback('Saved to your private shelf.')
      }
      await savedQuery.mutate()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The bookmark could not be updated.')
    } finally {
      setBusy(null)
    }
  }

  const review = async () => {
    setBusy('review')
    setFeedback(null)
    try {
      await addToReview(word.id)
      setFeedback('Added to Review.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The word could not be scheduled for review.')
    } finally {
      setBusy(null)
    }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: word.word, text: `${word.word} — ${word.english_meaning}`, url })
        setFeedback('Share sheet opened.')
      } else {
        await navigator.clipboard.writeText(url)
        setFeedback('Word link copied.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setFeedback('This browser could not share the word link.')
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="flex items-center justify-between gap-2">
        <BackButton href={resolvedBookSlug ? `/library/${resolvedBookSlug}/level/${levelQuery.data.level_number}` : '/library/dictionary'} label="Back to previous page" />
        <span className="text-xs text-muted-foreground">Word {word.book_word_number}</span>
      </div>

      <Card className="relative flex flex-col gap-3 overflow-hidden bg-card p-4 sm:gap-5 sm:p-6">
        <div className="absolute left-3 top-3 z-10 sm:left-4 sm:top-4">
          <IconButton
            label={savedQuery.data ? 'Remove from saved words' : 'Save word'}
            variant={savedQuery.data ? 'accent' : 'solid'}
            size="sm"
            onClick={() => void toggleSave()}
            disabled={busy === 'save'}
          >
            {savedQuery.data ? <Check aria-hidden /> : <Bookmark aria-hidden />}
          </IconButton>
        </div>
        <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
          <IconButton label="Share word" variant="solid" size="sm" onClick={() => void share()}>
            <Share2 aria-hidden />
          </IconButton>
        </div>

        <div className="min-w-0 px-10 pt-1 sm:px-12">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Word detail</p>
          <h1 className="mt-1 break-words font-heading text-3xl font-black tracking-tight sm:text-5xl">{word.word}</h1>
          {word.pronunciation ? <p className="mt-1 font-mono text-xs text-muted-foreground sm:text-sm">{word.pronunciation}</p> : null}
          <Badge className="mt-2" variant="neutral">Level {levelQuery.data.level_number}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <DetailSection title="Meaning"><p className="text-base leading-snug sm:text-lg">{word.english_meaning}</p>{word.bangla_meaning ? <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{word.bangla_meaning}</p> : null}</DetailSection>
          <DetailSection title="Example"><p className="text-sm leading-snug text-muted-foreground sm:text-base">{word.example_sentence || 'No example sentence yet.'}</p></DetailSection>
          <DetailSection title="Mnemonic"><p className="text-sm leading-snug text-muted-foreground sm:text-base">{word.mnemonic || 'No mnemonic yet.'}</p></DetailSection>
          <DetailSection title="Related words">
            <div className="flex flex-wrap gap-1.5">
              {(word.synonyms ?? []).map((item) => <Badge key={`syn-${item}`} variant="neutral">{item}</Badge>)}
              {(word.antonyms ?? []).map((item) => <Badge key={`ant-${item}`} variant="coral">{item}</Badge>)}
              {!word.synonyms?.length && !word.antonyms?.length ? <span className="text-sm text-muted-foreground">None listed.</span> : null}
            </div>
          </DetailSection>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t-2 border-foreground pt-3 sm:gap-3 sm:pt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => void review()} loading={busy === 'review'}><Sparkles className="size-4" aria-hidden /> Add to Review</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { setTestMe(true); setFeedback(null) }}><Clipboard className="size-4" aria-hidden /> Try Me</Button>
        </div>
        {feedback ? <p role="status" className="text-xs font-semibold text-muted-foreground">{feedback}</p> : null}
      </Card>

      <Modal open={testMe} onClose={closeTestMe} title={`Try Me: ${word.word}`} description="Choose the word that matches the meaning." className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {!tryMeQuestion ? <EmptyState title="Quiz unavailable" description="This level needs more words for a quick test." /> : (
          <QuizCard
            question={tryMeQuestion}
            selected={quiz.selected}
            onSelect={(option) => {
              const event = quiz.submit(option)
              if (event) setFeedback(event.isCorrect ? 'Correct.' : `Not quite. The answer is ${tryMeQuestion.correct_answer}.`)
            }}
            revealed={quiz.revealed}
          />
        )}
      </Modal>

      <div className="flex items-center justify-between gap-3">
        {previous ? <Button asChild variant="outline" size="sm"><Link href={libraryWordHref(previous.id, resolvedBookSlug)}><ArrowLeft className="size-4" aria-hidden /> Previous</Link></Button> : <span />}
        {next ? <Button asChild variant="outline" size="sm"><Link href={libraryWordHref(next.id, resolvedBookSlug)}>Next <ArrowRight className="size-4" aria-hidden /></Link></Button> : <span />}
      </div>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border-2 border-foreground bg-muted/30 p-3 sm:p-4">
      <h2 className="mb-1.5 font-heading text-[0.68rem] font-bold uppercase tracking-[0.12em] sm:text-sm">{title}</h2>
      {children}
    </section>
  )
}
