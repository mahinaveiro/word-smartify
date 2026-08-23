'use client'

import { useCallback } from 'react'
import { useSWRConfig } from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { trackProductEvent } from '@/lib/product-analytics'
import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import type { QuizMode } from '@/lib/xp'
import { callSecureAction } from '@/lib/secure-action'

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

  const acknowledgeBadgeAwards = useCallback(
    async (awardIds: string[]) => {
      await repositories.badges.acknowledgeAwards(requireUserId(), awardIds)
      await mutate(['pending-badge-awards', requireUserId()])
    },
    [mutate, requireUserId],
  )

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
        'display-badges',
        'pending-badge-awards',
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
    (wordId: string, event: QuizAnswerEvent, mode: QuizMode = 'learning') => {
      trackProductEvent('answer_submitted', { mode, correct: event.isCorrect })
      return callSecureAction<QuizAnswerResult>('quiz-answer', {
        wordId,
        questionId: event.questionId,
        selectedAnswer: event.selectedAnswer,
        mode,
      })
    },
    [],
  )

  const recordSessionProgress = useCallback(
    () => callSecureAction('finalize-session'),
    [],
  )

  const completeDailyChallenge = useCallback(
    (answeredWordIds: string[]) =>
      callSecureAction('complete-daily-challenge', { answeredWordIds }),
    [],
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
      const progress = await callSecureAction('add-to-review', { wordId })
      await revalidateUser()
      return progress
    },
    [revalidateUser],
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
    acknowledgeBadgeAwards,
  }
}
