import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Check, ChevronRight, Clock3, Target } from 'lucide-react'
import { Wordmark } from '@/components/shell/wordmark'
import { Button } from '@/components/ui/button'
import { TOTAL_WORD_COUNT, WORD_SMART_1_COUNT, WORD_SMART_2_COUNT } from '@/types/database'

type Feature = {
  icon: typeof BookOpen
  title: string
  body: string
}

type BookLandingProps = {
  bookNumber: 1 | 2
}

const IBA_FEATURES: Feature[] = [
  {
    icon: Brain,
    title: 'Recall, not reread',
    body: 'Short lessons turn meanings into active recall before they fade.',
  },
  {
    icon: Target,
    title: 'Exam-shaped practice',
    body: 'Synonyms, antonyms, context, blanks, and analogies in one loop.',
  },
  {
    icon: Clock3,
    title: 'A useful 10 minutes',
    body: 'Keep a small daily goal and return to words that still feel shaky.',
  },
]

const BOOKS = [
  { href: '/word-smart-1', label: 'Word Smart I', count: WORD_SMART_1_COUNT },
  { href: '/word-smart-2', label: 'Word Smart II', count: WORD_SMART_2_COUNT },
]

export function IbaEnglishLandingPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="IBA English vocabulary"
        title="Build the vocabulary that shows up when the question gets hard."
        description="Practice Word Smart vocabulary with short lessons, memory hooks, active recall, and mixed question types made for serious admission preparation."
        primaryLabel="Start IBA practice"
        primaryHref="/auth?mode=signup"
        secondaryLabel="Try the demo"
        secondaryHref="/demo"
        panelTitle="Your practice loop"
        panelAccent="bg-mint"
        panelItems={[
          { value: '01', label: 'Learn the meaning' },
          { value: '02', label: 'Test the recall' },
          { value: '03', label: 'Review the weak words' },
        ]}
      />

      <section className="grid gap-4 pb-14 sm:grid-cols-3">
        {IBA_FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div key={feature.title} className="rounded-[--radius-md] border-2 border-foreground bg-card p-5 shadow-brutal-sm">
              <span className="grid size-10 place-items-center rounded-[--radius-sm] border-2 border-foreground bg-mint text-mint-foreground">
                <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <h2 className="mt-3 font-heading text-lg font-bold">{feature.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          )
        })}
      </section>

      <section className="border-t-2 border-foreground py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Choose your list</p>
            <h2 className="mt-2 font-heading text-3xl font-bold">Start with Word Smart.</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Two focused books. One place to learn, quiz, review, and see what needs another pass.</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {BOOKS.map((book, index) => (
            <Link key={book.href} href={book.href} className="group rounded-[--radius-md] border-2 border-foreground bg-card p-5 shadow-brutal-sm transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-11 place-items-center rounded-[--radius-sm] border-2 border-foreground font-heading text-lg font-bold ${index === 0 ? 'bg-coral' : 'bg-mint'}`}>
                  {index + 1}
                </span>
                <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <h3 className="mt-7 font-heading text-xl font-bold">{book.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{book.count.toLocaleString()} words · structured for steady practice</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-foreground py-14">
        <div className="rounded-[--radius-lg] border-2 border-foreground bg-foreground p-6 text-primary-foreground shadow-brutal-lg dark:bg-primary sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/65">Make the next session count</p>
              <h2 className="mt-2 font-heading text-3xl font-bold">Learn fewer words at a time. Remember more of them.</h2>
            </div>
            <Button asChild size="lg" className="shrink-0 bg-mint text-mint-foreground hover:bg-mint/90">
              <Link href="/auth?mode=signup">Start learning free <ArrowRight className="size-5" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}

export function BookLandingPage({ bookNumber }: BookLandingProps) {
  const isFirstBook = bookNumber === 1
  const bookName = isFirstBook ? 'Word Smart I' : 'Word Smart II'
  const wordCount = isFirstBook ? WORD_SMART_1_COUNT : WORD_SMART_2_COUNT
  const accent = isFirstBook ? 'bg-coral' : 'bg-mint'

  return (
    <MarketingShell>
      <MarketingHero
        eyebrow={`${bookName} vocabulary list`}
        title={`${bookName}: a clearer path through essential vocabulary.`}
        description={`Work through ${wordCount.toLocaleString()} words with plain meanings, memorable cues, and quizzes that make recall less predictable.`}
        primaryLabel={`Start ${bookName}`}
        primaryHref="/auth?mode=signup"
        secondaryLabel="Try the demo"
        secondaryHref="/demo"
        panelTitle={`${bookName} practice`}
        panelAccent={accent}
        panelItems={[
          { value: wordCount.toLocaleString(), label: 'words to work through' },
          { value: '5', label: 'question styles per word' },
          { value: '1', label: 'review loop that follows you' },
        ]}
      />

      <section className="grid gap-4 pb-14 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[--radius-md] border-2 border-foreground bg-card p-5 shadow-brutal-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-[--radius-sm] border-2 border-foreground ${accent}`}>
              <BookOpen className="size-5" aria-hidden="true" />
            </span>
            <h2 className="font-heading text-xl font-bold">What you practise</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {['Meaning and usage', 'Synonym and antonym recall', 'Context and fill-in-the-blank', 'Analogy-style relationships'].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-mint-foreground" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[--radius-md] border-2 border-foreground bg-muted p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">A good first session</p>
          <ol className="mt-4 space-y-4">
            {['Learn one small level.', 'Answer without looking back.', 'Return to the words that resisted recall.'].map((item, index) => (
              <li key={item} className="flex gap-3 text-sm">
                <span className="font-heading text-lg font-bold">0{index + 1}</span>
                <span className="pt-0.5 text-muted-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t-2 border-foreground py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Keep going</p>
            <h2 className="mt-2 font-heading text-3xl font-bold">Practice the full {TOTAL_WORD_COUNT.toLocaleString()}-word library.</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/iba-english">See the IBA practice path <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}

function MarketingHero({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  panelTitle,
  panelAccent,
  panelItems,
}: {
  eyebrow: string
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
  panelTitle: string
  panelAccent: string
  panelItems: { value: string; label: string }[]
}) {
  return (
    <section className="grid gap-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-16">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-mint px-3 py-1 text-xs font-semibold text-mint-foreground shadow-brutal-sm">
          {eyebrow}
        </span>
        <h1 className="mt-5 max-w-3xl text-pretty font-heading text-4xl font-bold leading-[1.02] md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href={primaryHref}>{primaryLabel} <ArrowRight className="size-5" /></Link></Button>
          <Button asChild variant="outline" size="lg"><Link href={secondaryHref}>{secondaryLabel}</Link></Button>
        </div>
        <p className="mt-4 text-xs font-medium text-muted-foreground">Free to start. Set a small goal and build from there.</p>
      </div>

      <div className="relative rounded-[--radius-lg] border-2 border-foreground bg-card p-4 shadow-brutal-lg md:p-6">
        <div className={`absolute -right-3 -top-3 rounded-full border-2 border-foreground ${panelAccent} px-3 py-1 text-xs font-bold shadow-brutal-sm`}>Learn · recall · retain</div>
        <div className="rounded-[--radius-md] border-2 border-foreground bg-foreground p-5 text-primary-foreground dark:bg-primary">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">{panelTitle}</p>
          <div className="mt-5 space-y-3">
            {panelItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 border-b border-primary-foreground/15 pb-3 last:border-0 last:pb-0">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 border-primary-foreground/70 font-heading text-xs font-bold ${panelAccent} text-foreground`}>{item.value}</span>
                <span className="text-sm text-primary-foreground/85">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b-2 border-foreground px-4 py-4 md:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/auth">Sign in</Link></Button>
          <Button asChild size="sm"><Link href="/auth?mode=signup">Get started</Link></Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 md:px-8">{children}</main>
      <footer className="border-t-2 border-foreground px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Word Smartify — focused vocabulary practice for serious learners.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 font-semibold text-foreground" aria-label="Public pages">
            <Link className="underline-offset-4 hover:underline" href="/iba-english">IBA English</Link>
            <Link className="underline-offset-4 hover:underline" href="/word-smart-1">Word Smart I</Link>
            <Link className="underline-offset-4 hover:underline" href="/word-smart-2">Word Smart II</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
