import type { Metadata } from 'next'
import { CombatMatchView } from '@/features/combat/combat-match-view'

export const metadata: Metadata = {
  title: 'Combat match',
}

export default async function CombatMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  return <CombatMatchView matchId={matchId} />
}
