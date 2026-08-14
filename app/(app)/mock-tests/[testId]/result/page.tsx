import type { Metadata } from 'next'
import { MockTestResultView } from '@/features/mock-tests/mock-test-result-view'

export const metadata: Metadata = { title: 'Mock Test Result' }

export default async function MockTestResultPage({
  params,
}: {
  params: Promise<{ testId: string }>
}) {
  const { testId } = await params
  return <MockTestResultView testId={testId} />
}
