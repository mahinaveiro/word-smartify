import type { Metadata } from 'next'
import { IbaEnglishLandingPage } from '@/features/marketing/marketing-pages'

export const metadata: Metadata = {
  title: 'IBA English Vocabulary Practice',
  description: 'Practise IBA English vocabulary with Word Smart meanings, mnemonics, active recall, and mixed admission-style quizzes.',
  alternates: { canonical: '/iba-english' },
  openGraph: {
    title: 'IBA English Vocabulary Practice | Word Smartify',
    description: 'Build admission-ready vocabulary with short lessons, active recall, and mixed practice.',
    url: '/iba-english',
    type: 'website',
  },
}

export default function IbaEnglishPage() {
  return <IbaEnglishLandingPage />
}
