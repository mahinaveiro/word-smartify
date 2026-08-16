import type { Metadata } from 'next'
import { BookLandingPage } from '@/features/marketing/marketing-pages'

export const metadata: Metadata = {
  title: 'Word Smart II Vocabulary List',
  description: 'Study the Word Smart II vocabulary list with meanings, memory cues, quizzes, and review built for steady admission preparation.',
  alternates: { canonical: '/word-smart-2' },
  openGraph: {
    title: 'Word Smart II Vocabulary List | Word Smartify',
    description: 'Learn and practise Word Smart II vocabulary with active recall and focused review.',
    url: '/word-smart-2',
    type: 'website',
  },
}

export default function WordSmartTwoPage() {
  return <BookLandingPage bookNumber={2} />
}
