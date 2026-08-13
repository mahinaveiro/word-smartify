import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Flame, Target } from 'lucide-react'
import { Wordmark } from '@/components/shell/wordmark'
import { Button } from '@/components/ui/button'
import {
  TOTAL_WORD_COUNT,
  WORD_SMART_1_COUNT,
  WORD_SMART_2_COUNT,
} from '@/types/database'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Two complete books',
    body: `Word Smart I and II — ${WORD_SMART_1_COUNT.toLocaleString()} + ${WORD_SMART_2_COUNT.toLocaleString()} words across 189 bite-sized levels.`,
  },
  {
    icon: Brain,
    title: 'Learn, then prove it',
    body: 'Opening a word is not mastery. You earn each word through spaced quizzes that adapt to your recall.',
  },
  {
    icon: Flame,
    title: 'Streaks that mean something',
    body: 'Hit your daily goal to keep your streak alive. Miss it, and it resets — real accountability.',
  },
  {
    icon: Target,
    title: 'Mock tests',
    body: 'Pull random questions from the whole vocabulary and see where you really stand.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b-2 border-foreground px-4 py-4 md:px-8">
        <Wordmark />
        <Button asChild variant="outline" size="sm">
          <Link href="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 md:px-8">
        <section className="grid gap-8 py-12 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-mint px-3 py-1 text-xs font-semibold text-mint-foreground shadow-brutal-sm">
              Installable vocabulary trainer
            </span>
            <h1 className="mt-5 text-pretty font-heading text-4xl font-bold leading-[1.05] md:text-6xl">
              Build a formidable vocabulary, one word at a time.
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Word Smartify turns {TOTAL_WORD_COUNT.toLocaleString()} essential words into a
              daily habit — with spaced review, honest streaks, and quizzes that make the
              words stick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Start learning
                  <ArrowRight className="size-5" strokeWidth={2.25} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/learn">Browse the words</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[--radius-lg] border-2 border-foreground bg-card p-6 shadow-brutal-lg">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { n: TOTAL_WORD_COUNT.toLocaleString(), l: 'words' },
                { n: '189', l: 'levels' },
                { n: '2', l: 'books' },
              ].map((s) => (
                <div key={s.l} className="rounded-[--radius-md] border-2 border-foreground bg-muted py-4">
                  <div className="font-heading text-2xl font-bold md:text-3xl">{s.n}</div>
                  <div className="text-xs font-medium text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[--radius-md] border-2 border-foreground bg-foreground p-4 text-primary-foreground">
              <p className="font-heading text-sm font-semibold">Today&apos;s idea</p>
              <p className="mt-1 text-2xl font-bold">Ephemeral</p>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Lasting a very short time; fleeting.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-[--radius-md] border-2 border-foreground bg-card p-5 shadow-brutal-sm"
              >
                <span className="grid size-10 place-items-center rounded-[--radius-sm] border-2 border-foreground bg-mint text-mint-foreground">
                  <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
                </span>
                <h2 className="mt-3 font-heading text-lg font-bold">{f.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            )
          })}
        </section>
      </main>

      <footer className="border-t-2 border-foreground px-4 py-6 md:px-8">
        <p className="text-sm text-muted-foreground">
          Word Smartify — a study companion for the Word Smart series.
        </p>
      </footer>
    </div>
  )
}
