import type { Metadata } from 'next'
import { BookLandingPage } from '@/features/marketing/marketing-pages'

export const metadata: Metadata = {
  title: 'Word Smart I Vocabulary List',
  description: 'Study the Word Smart I vocabulary list with meanings, memory cues, quizzes, and review built for steady admission preparation.',
  alternates: { canonical: '/word-smart-1' },
  openGraph: {
    title: 'Word Smart I Vocabulary List | Word Smartify',
    description: 'Learn and practise Word Smart I vocabulary with active recall and focused review.',
    url: '/word-smart-1',
    type: 'website',
  },
}

export default function WordSmartOnePage() {
  return <BookLandingPage bookNumber={1} />
}
