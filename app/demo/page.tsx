import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, BookOpen, Check, LockKeyhole, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/shell/wordmark'

export const metadata: Metadata = { title: 'Try the demo' }

const WORDS = [
  { book: 'Word Smart I', word: 'Abase', meaning: 'to make someone feel ashamed, embarrassed, or less important', hook: 'A base is where you bring someone down.' },
  { book: 'Word Smart I', word: 'Abet', meaning: 'to help or encourage someone to do something wrong', hook: 'You abet when you aid a bad bet.' },
  { book: 'Word Smart II', word: 'Aberration', meaning: 'a departure from what is normal, expected, or usual', hook: 'An aberration is a bizarre deviation.' },
  { book: 'Word Smart II', word: 'Acumen', meaning: 'the ability to make good judgments and quick decisions', hook: 'Acumen is acute-minded judgment.' },
]

const QUIZZES = [
  { type: 'Synonym', prompt: 'Which word is closest in meaning to “Abase”?', options: ['Elevate', 'Humiliate', 'Celebrate', 'Ignore'], answer: 'Humiliate' },
  { type: 'Fill in the blank', prompt: 'The unusual result was an ________ from the normal pattern.', options: ['aberration', 'acumen', 'abet', 'acclaim'], answer: 'aberration' },
  { type: 'Meaning check', prompt: 'What does “acumen” describe?', options: ['Sharp judgment', 'A loud argument', 'A brief visit', 'A formal promise'], answer: 'Sharp judgment' },
]

export default function DemoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b-2 border-foreground px-4 py-4 md:px-8">
        <Wordmark />
        <Button asChild size="sm"><Link href="/auth?mode=signup">Sign up free</Link></Button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8 md:py-16">
        <section className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Public preview</p>
          <h1 className="mt-3 font-heading text-4xl font-bold leading-tight md:text-6xl">A small taste of the full vocabulary loop.</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">Explore a few words from both books, then try different kinds of recall questions. The full 1,888-word library and personal progress unlock after sign-in.</p>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {WORDS.map((item) => (
            <article key={item.word} className="rounded-[--radius-md] border-2 border-foreground bg-card p-5 shadow-brutal-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><BookOpen className="size-4" />{item.book}</span>
                <span className="rounded-full border border-foreground bg-mint px-2 py-1 text-[10px] font-bold text-mint-foreground">Preview</span>
              </div>
              <h2 className="mt-5 font-heading text-2xl font-bold">{item.word}</h2>
              <p className="mt-2 text-sm leading-relaxed">{item.meaning}.</p>
              <p className="mt-4 rounded-md bg-muted p-3 text-sm font-medium">{item.hook}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 border-t-2 border-foreground pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Mixed practice</p>
              <h2 className="mt-2 font-heading text-3xl font-bold">Try three question styles.</h2>
            </div>
            <Sparkles className="hidden size-8 text-coral sm:block" aria-hidden />
          </div>
          <div className="mt-6 grid gap-4">
            {QUIZZES.map((quiz, index) => (
              <article key={quiz.type} className="rounded-[--radius-md] border-2 border-foreground bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-coral px-2.5 py-1 text-xs font-bold text-coral-foreground">0{index + 1} · {quiz.type}</span>
                  <span className="text-xs text-muted-foreground">Preview answer: {quiz.answer}</span>
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold">{quiz.prompt}</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {quiz.options.map((option, optionIndex) => (
                    <div key={option} className="flex items-center gap-3 rounded-md border-2 border-foreground px-3 py-3 text-sm">
                      <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-foreground text-xs font-bold uppercase">{String.fromCharCode(97 + optionIndex)}</span>
                      <span>{option}</span>
                      {option === quiz.answer ? <Check className="ml-auto size-4 text-mint-foreground" aria-hidden /> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative mt-16 overflow-hidden rounded-[--radius-lg] border-2 border-foreground bg-foreground p-6 text-primary-foreground shadow-brutal-lg dark:bg-primary md:p-10">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
          <div className="relative z-10 max-w-2xl">
            <LockKeyhole className="size-8 text-mint" aria-hidden />
            <h2 className="mt-5 font-heading text-3xl font-bold md:text-4xl">The rest is waiting behind the lock.</h2>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75 md:text-base">Sign in to access all 1,888 words, thousands of varied quizzes, spaced review, streaks, mock tests, and a learning plan that remembers what you need next.</p>
            <Button asChild className="mt-6 bg-mint text-mint-foreground hover:bg-mint/90">
              <Link href="/auth?mode=signup">Sign in to unlock <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
