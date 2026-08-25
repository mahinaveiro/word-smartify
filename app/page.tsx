import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Flame, LockKeyhole, Target } from 'lucide-react'
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
    body: 'Short definitions become durable vocabulary through recall, spaced review, and varied quizzes.',
  },
  {
    icon: Flame,
    title: 'A daily habit that sticks',
    body: 'Set a realistic goal, protect your streak, and see progress that reflects real practice.',
  },
  {
    icon: Target,
    title: 'Practice under pressure',
    body: 'Use mixed mock tests to find gaps before they matter in an exam or interview.',
  },
]

const FAQS = [
  ['What is Word Smartify?', 'It is a focused vocabulary trainer built around the Word Smart I and II word lists, with definitions, memory hooks, quizzes, review, and mock tests.'],
  ['Can I explore before creating an account?', 'Yes. Use the public demo to preview a small sample from both books and try several quiz formats. Your full library and learning history are unlocked after sign-in.'],
  ['How much should I study each day?', 'Start with a goal you can keep on busy days. You can choose 5, 10, 15, 20, or 30 new words and change it later in Settings.'],
  ['Does it work on phones and desktops?', 'Yes. Word Smartify is responsive and installable as a progressive web app, so it works in a browser or as an app-like experience.'],
]

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalApplication',
      name: 'Word Smartify',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, Android, iOS',
      url: 'https://word-smartify.vercel.app',
      image: 'https://word-smartify.vercel.app/og-image.jpg',
      description: 'Master Word Smart and IBA English vocabulary with mnemonics, quizzes, spaced review, and mock tests.',
      educationalUse: ['Vocabulary building', 'Exam preparation', 'Active recall'],
      learningResourceType: 'Interactive vocabulary lessons and quizzes',
      isAccessibleForFree: true,
    },
    {
      '@type': 'WebSite',
      name: 'Word Smartify',
      url: 'https://word-smartify.vercel.app',
      description: 'Word Smart and IBA English vocabulary practice with short lessons, quizzes, and recall tools.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="flex items-center justify-between border-b-2 border-foreground px-4 py-4 md:px-8">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth?mode=signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-mint px-3 py-1 text-xs font-semibold text-mint-foreground shadow-brutal-sm">
              {TOTAL_WORD_COUNT.toLocaleString()} words · one calm daily habit
            </span>
            <h1 className="mt-5 max-w-3xl text-pretty font-heading text-4xl font-bold leading-[1.02] md:text-7xl">
              Make better words come to mind faster.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Learn essential vocabulary with short lessons, active recall, useful explanations, and practice that feels more like progress than paperwork.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/auth?mode=signup">
                  Start learning free
                  <ArrowRight className="size-5" strokeWidth={2.25} />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/demo">Explore the demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs font-medium text-muted-foreground">No credit card. Begin with a small goal and build from there.</p>
          </div>

          <div className="relative rounded-[--radius-lg] border-2 border-foreground bg-card p-4 shadow-brutal-lg md:p-6">
            <div className="absolute -right-3 -top-3 rounded-full border-2 border-foreground bg-coral px-3 py-1 text-xs font-bold shadow-brutal-sm">Learn · recall · retain</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { n: TOTAL_WORD_COUNT.toLocaleString(), l: 'words' },
                { n: '189', l: 'levels' },
                { n: '2', l: 'books' },
              ].map((stat) => (
                <div key={stat.l} className="rounded-[--radius-md] border-2 border-foreground bg-muted py-4">
                  <div className="font-heading text-2xl font-bold md:text-3xl">{stat.n}</div>
                  <div className="text-xs font-medium text-muted-foreground">{stat.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[--radius-md] border-2 border-foreground bg-foreground p-5 text-primary-foreground dark:bg-primary">
              <p className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">Today&apos;s word</p>
              <p className="mt-2 font-heading text-3xl font-bold">Ephemeral</p>
              <p className="mt-1 text-sm text-primary-foreground/80">Lasting a very short time; fleeting.</p>
              <div className="mt-5 flex items-center justify-between border-t border-primary-foreground/20 pt-4 text-xs text-primary-foreground/70">
                <span>Recall check</span>
                <span className="rounded-full bg-mint px-2 py-1 font-semibold text-mint-foreground">1 of 5</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {FEATURES.map((feature) => {
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

        <section className="grid gap-6 border-t-2 border-foreground py-16 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">A preview before commitment</p>
            <h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">See the learning loop in action.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Try real sample words and mixed question types in the demo. When you are ready, sign in to unlock the full curriculum and your personal progress.</p>
            <Button asChild className="mt-5">
              <Link href="/demo">Open the demo <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Definition', body: 'Understand the word in plain language before you practice it.' },
              { title: 'Sound hook', body: 'Attach a short memory cue that gives the meaning somewhere to stick.' },
              { title: 'Recall quiz', body: 'Retrieve the answer actively so recognition becomes usable recall.' },
            ].map((step, index) => (
              <div key={step.title} className="rounded-[--radius-md] border-2 border-foreground bg-muted p-4">
                <span className="font-heading text-2xl font-bold">0{index + 1}</span>
                <p className="mt-8 font-heading text-sm font-bold">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t-2 border-foreground py-16">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Questions, answered</p>
            <h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">A clearer way to start.</h2>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {FAQS.map(([question, answer]) => (
              <details key={question} className="group rounded-[--radius-md] border-2 border-foreground bg-card p-5 shadow-brutal-sm">
                <summary className="cursor-pointer list-none pr-6 font-heading font-bold marker:hidden">{question}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-foreground px-4 py-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Word Smartify — a study companion for the Word Smart series.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/iba-english">IBA English practice</Link>
            <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/demo"><LockKeyhole className="mr-1 inline size-4" />Try the demo</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
