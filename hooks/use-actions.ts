'use client'

/**
 * Mutation actions over the repository layer. Encapsulates the business rules
 * (XP, progress, streak, daily goal) so UI components stay declarative, then
 * revalidates the relevant SWR caches so every view stays in sync.
 */

import { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { repositories, CURRENT_USER_ID } from '@/repositories'
import { applyQuizResult, xpForNewWord, xpForQuiz, XP } from '@/lib/learning-logic'
import { todayISO } from '@/lib/date'

const repo = repositories
const uid = CURRENT_USER_ID

export interface QuizAnswerResult {
  correct: boolean
  xpEarned: number
  becameLearned: boolean
  becameMastered: boolean
}

export function useActions() {
  const { mutate } = useSWRConfig()

  const revalidateUser = useCallback(() => {
    mutate((key) => Array.isArray(key) && typeof key[0] === 'string' && [
      'stats',
      'profile',
      'progress',
      'progress-counts',
      'due',
      'daily',
      'daily-range',
      'leaderboard',
    ].includes(key[0]))
  }, [mutate])

  /** Record a single quiz answer for a word, applying all product rules. */
  const recordQuizAnswer = useCallback(
    async (wordId: string, correct: boolean): Promise<QuizAnswerResult> => {
      const prev = await repo.wordProgress.getWordProgress(uid, wordId)
      const newWordXp = xpForNewWord(prev)
      const quizXp = xpForQuiz(prev, correct)
      const { patch, becameLearned, becameMastered } = applyQuizResult(prev, correct)

      await repo.wordProgress.updateWordProgress(uid, wordId, patch)

      // aggregate stat bumps
      const stats = await repo.stats.getStats(uid)
      const totalXp = stats.total_xp + newWordXp + quizXp
      await repo.stats.updateStats(uid, {
        total_xp: totalXp,
        words_learned: stats.words_learned + (becameLearned ? 1 : 0),
        words_mastered: stats.words_mastered + (becameMastered ? 1 : 0),
        last_activity_at: new Date().toISOString(),
      })

      return {
        correct,
        xpEarned: newWordXp + quizXp,
        becameLearned,
        becameMastered,
      }
    },
    [],
  )

  /** Increment today's daily progress after finishing a learning session. */
  const recordSessionProgress = useCallback(
    async (input: { newWords: number; reviews: number }) => {
      const date = todayISO()
      const profile = await repo.profiles.getProfile(uid)
      const goal = profile?.daily_goal ?? 10
      const today = await repo.dailyProgress.getDailyProgress(uid, date)

      const newWordsCompleted = (today?.new_words_completed ?? 0) + input.newWords
      const reviewsCompleted = (today?.reviews_completed ?? 0) + input.reviews
      const wasCompleted = today?.completed ?? false
      const nowCompleted = newWordsCompleted >= goal

      let xpEarned = today?.xp_earned ?? 0
      xpEarned += input.reviews * XP.REVIEW_COMPLETED

      // Award the daily-goal bonus once, on the transition to completed.
      let goalJustCompleted = false
      if (!wasCompleted && nowCompleted) {
        xpEarned += XP.DAILY_GOAL
        goalJustCompleted = true
      }

      await repo.dailyProgress.updateDailyProgress(uid, date, {
        goal,
        new_words_completed: newWordsCompleted,
        reviews_completed: reviewsCompleted,
        xp_earned: xpEarned,
        completed: nowCompleted,
      })

      if (goalJustCompleted) {
        const stats = await repo.stats.getStats(uid)
        // recompute streak from completed daily rows
        const range = await repo.dailyProgress.getRange(uid, '2000-01-01', date)
        const completedDates = range.filter((r) => r.completed).map((r) => r.date)
        const streak = completedDates.length // simplified continuous streak for demo
        await repo.stats.updateStats(uid, {
          total_xp: stats.total_xp + XP.DAILY_GOAL + input.reviews * XP.REVIEW_COMPLETED,
          current_streak: Math.max(stats.current_streak, streak),
          longest_streak: Math.max(stats.longest_streak, streak, stats.current_streak),
        })
      }

      return { goalJustCompleted, nowCompleted }
    },
    [],
  )

  const completeDailyChallenge = useCallback(async () => {
    const date = todayISO()
    const today = await repo.dailyProgress.getDailyProgress(uid, date)
    if (today?.challenge_completed) return { alreadyDone: true }
    await repo.dailyProgress.updateDailyProgress(uid, date, {
      challenge_completed: true,
      xp_earned: (today?.xp_earned ?? 0) + XP.DAILY_CHALLENGE,
    })
    const stats = await repo.stats.getStats(uid)
    await repo.stats.updateStats(uid, { total_xp: stats.total_xp + XP.DAILY_CHALLENGE })
    return { alreadyDone: false }
  }, [])

  const updateProfile = useCallback(
    async (patch: Parameters<typeof repo.profiles.updateProfile>[1]) => {
      await repo.profiles.updateProfile(uid, patch)
    },
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
