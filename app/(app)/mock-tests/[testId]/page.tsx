import type { Metadata } from 'next'
import { MockTestRunView } from '@/features/mock-tests/mock-test-run-view'

export const metadata: Metadata = { title: 'Mock Test' }

export default async function MockTestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params
  return <MockTestRunView testId={testId} />
}
