'use client'

import useSWR from 'swr'
import { getActiveUserId } from '@/repositories'
import { buildDailyChallenge, type ChallengeCard } from '@/services/daily-loop'

export function useChallengeSession() {
  const uid = getActiveUserId()
  return useSWR(['challenge-session', uid], () => buildDailyChallenge(uid))
}
