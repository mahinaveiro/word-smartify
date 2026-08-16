'use client'

import { useCallback } from 'react'
import { useSWRConfig } from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { trackProductEvent } from '@/lib/product-analytics'
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
        'saved-words',
        'saved-word',
        'library-search',
      ].includes(key[0]),
    )
  }, [mutate])

  const recordQuizAnswer = useCallback(
    (wordId: string, correct: boolean, mode: QuizMode = 'learning') => {
      trackProductEvent('answer_submitted', { mode, correct })
      return recordAnswer(requireUserId(), wordId, correct, mode)
    },
    [requireUserId],
  )

  const recordSessionProgress = useCallback(() => finalizeSession(requireUserId()), [requireUserId])

  const completeDailyChallenge = useCallback(
    (answeredWordIds: string[]) => completeChallenge(requireUserId(), answeredWordIds),
    [requireUserId],
  )

  const updateProfile = (patch: Parameters<typeof repositories.profiles.updateProfile>[1]) =>
    repositories.profiles.updateProfile(requireUserId(), patch)

  const saveWord = useCallback(
    async (wordId: string) => {
      const saved = await repositories.savedWords.saveWord(requireUserId(), wordId)
      await revalidateUser()
      return saved
    },
    [requireUserId, revalidateUser],
  )

  const removeSavedWord = useCallback(
    async (wordId: string) => {
      await repositories.savedWords.removeSavedWord(requireUserId(), wordId)
      await revalidateUser()
    },
    [requireUserId, revalidateUser],
  )

  const addToReview = useCallback(
    async (wordId: string) => {
      const now = new Date().toISOString()
      const progress = await repositories.wordProgress.updateWordProgress(requireUserId(), wordId, {
        status: 'learning',
        next_review_at: now,
      })
      await revalidateUser()
      return progress
    },
    [requireUserId, revalidateUser],
  )

  return {
    recordQuizAnswer,
    recordSessionProgress,
    completeDailyChallenge,
    updateProfile,
    saveWord,
    removeSavedWord,
    addToReview,
    revalidateUser,
  }
}
