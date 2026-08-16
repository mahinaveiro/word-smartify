import type { Metadata } from 'next'
import { ReviewView } from '@/features/review/review-view'

export const metadata: Metadata = { title: 'Weak-word drill' }

export default async function WeakReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>
}) {
  const params = await searchParams
  const sourceTestId = typeof params.test === 'string' && params.test.length > 0 ? params.test : undefined
  return <ReviewView mode={sourceTestId ? 'mock_recovery' : 'weak'} sourceTestId={sourceTestId} />
}
