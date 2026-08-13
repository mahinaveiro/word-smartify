import type { Metadata } from 'next'
import { MockTestsView } from '@/features/mock-tests/mock-tests-view'

export const metadata: Metadata = { title: 'Mock Tests' }

export default function MockTestsPage() {
  return <MockTestsView />
}
