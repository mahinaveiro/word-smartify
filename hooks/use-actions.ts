'use client'

/**
 * Thin mutation hooks. Business rules live in services/daily-loop.ts; this
 * layer only supplies the active user and refreshes affected SWR resources.
 */

import { useCallback } from 'react'
import { useSWRConfig } from 'swr'
import { repositories, getActiveUserId } from '@/repositories'
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
      ].includes(key[0]),
    )
  }, [mutate])

  const recordQuizAnswer = useCallback(
    (wordId: string, correct: boolean, mode: QuizMode = 'learning') =>
      recordAnswer(getActiveUserId(), wordId, correct, mode),
    [],
  )

  const recordSessionProgress = useCallback(
    () => finalizeSession(getActiveUserId()),
    [],
  )

  const completeDailyChallenge = useCallback(
    (answeredWordIds: string[]) => completeChallenge(getActiveUserId(), answeredWordIds),
    [],
  )

  const updateProfile = useCallback(
    (patch: Parameters<typeof repositories.profiles.updateProfile>[1]) =>
      repositories.profiles.updateProfile(getActiveUserId(), patch),
    [],
  )

  return {
    recordQuizAnswer,
    recordSessionProgress,
    completeDailyChallenge,
    updateProfile,
    revalidateUser,
  }
}
