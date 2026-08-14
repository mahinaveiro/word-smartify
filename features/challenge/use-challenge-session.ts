'use client'

import useSWR from 'swr'
import { useAuth } from '@/features/auth/auth-provider'
import { buildDailyChallenge, type ChallengeCard } from '@/services/daily-loop'

export function useChallengeSession() {
  const uid = useAuth().user?.id ?? null
  return useSWR(uid ? ['challenge-session', uid] : null, () => buildDailyChallenge(uid as string))
}
