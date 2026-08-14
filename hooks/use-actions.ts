'use client'

import { useCallback } from 'react'
import { useSWRConfig } from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import {
  completeDailyChallenge as completeChallenge,
  finalizeSession,
  recordQuizAnswer as recordAnswer,
  type QuizMode,
} from '@/services/daily-loop'

export interface QuizAnswerResult {
  correct: boolean
  xpEarned: number
  becameLearned: boolean
  becameMastered: boolean
  reviewCredited: boolean
  goalJustCompleted: boolean
}

export function useActions() {
  const { mutate } = useSWRConfig()
  const { user } = useAuth()
  const userId = user?.id

  const requireUserId = useCallback(() => {
    if (!userId) throw new Error('Please sign in to continue.')
    return userId
  }, [userId])

  const revalidateUser = useCallback(() => {
    return mutate((key) =>
      Array.isArray(key) &&
      typeof key[0] === 'string' &&
      [
        'stats',
        'profile',
        'public-profile',
        'progress',
        'progress-counts',
        'progress-summary',
        'book-progress',
        'due',
        'daily',
        'daily-range',
        'daily-plan',
        'leaderboard',
        'level-progress',
        'mock-tests',
        'mock-test',
      ].includes(key[0]),
    )
  }, [mutate])

  const recordQuizAnswer = useCallback(
    (wordId: string, correct: boolean, mode: QuizMode = 'learning') =>
      recordAnswer(requireUserId(), wordId, correct, mode),
    [requireUserId],
  )

  const recordSessionProgress = useCallback(() => finalizeSession(requireUserId()), [requireUserId])

  const completeDailyChallenge = useCallback(
    (answeredWordIds: string[]) => completeChallenge(requireUserId(), answeredWordIds),
    [requireUserId],
  )

  const updateProfile = (patch: Parameters<typeof repositories.profiles.updateProfile>[1]) =>
    repositories.profiles.updateProfile(requireUserId(), patch)

  return {
    recordQuizAnswer,
    recordSessionProgress,
    completeDailyChallenge,
    updateProfile,
    revalidateUser,
  }
}
