import type { Metadata } from 'next'
import { LeaderboardView } from '@/features/leaderboard/leaderboard-view'

export const metadata: Metadata = { title: 'Leaderboard' }

export default function LeaderboardPage() {
  return <LeaderboardView />
}
