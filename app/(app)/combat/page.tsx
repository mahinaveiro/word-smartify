import type { Metadata } from 'next'
import { CombatView } from '@/features/combat/combat-view'

export const metadata: Metadata = {
  title: 'Combat',
}

export default function CombatPage() {
  return <CombatView />
}
