import type { Metadata } from 'next'
import { MockTestReviewView } from '@/features/mock-tests/mock-test-review-view'

export const metadata: Metadata = { title: 'Review Mock Test' }

export default async function MockTestReviewPage({
  params,
}: {
  params: Promise<{ testId: string }>
}) {
  const { testId } = await params
  return <MockTestReviewView testId={testId} />
}
