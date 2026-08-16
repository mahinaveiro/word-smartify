import type { Metadata } from 'next'
import { ReviewView } from '@/features/review/review-view'

export const metadata: Metadata = { title: 'Review quiz' }

export default function ReviewPage() {
  return <ReviewView />
}
