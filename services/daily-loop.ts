import { repositories, getActiveUserId } from '@/repositories'
import { applyQuizResult } from '@/lib/learning-logic'
import {
  xpForCorrectQuiz,
  xpForDailyChallenge,
  xpForDailyGoal,
  xpForNewWord,
  xpForReview,
} from '@/lib/xp'
import { buildDailyPlan, type DailyPlan } from '@/lib/daily-plan'
import { computeStreak } from '@/lib/streak'
import { getDueWords } from '@/lib/review-scheduler'
import { todayISO } from '@/lib/date'
import type { ISODate } from '@/types/database'

export type QuizMode = 'learning' | 'review' | 'challenge'

export interface QuizAnswerResult {
  correct: boolean
  xpEarned: number
  becameLearned: boolean
  becameMastered: boolean
  reviewCredited: boolean
  goalJustCompleted: boolean
}

export interface SessionFinalizeResult {
  goalJustCompleted: boolean
  nowCompleted: boolean
}

async function refreshStreak(userId: string, date: ISODate) {
  const rows = await repositories.dailyProgress.getRange(userId, '2000-01-01', date)
  return computeStreak(rows, date)
}

export async function buildTodayPlan(
  userId = getActiveUserId(),
  date = todayISO(),
): Promise<DailyPlan> {
  const profile = await repositories.profiles.getProfile(userId)
  const currentBook = profile?.current_book_id
    ? await repositories.books.getBook(profile.current_book_id)
    : null
  const allProgress = await repositories.wordProgress.getAllProgress(userId)
  const dueReviewQueue = getDueWords(allProgress)
  const levels = currentBook ? await repositories.levels.getLevelsForBook(currentBook.id) : []
  const levelProgress = currentBook
    ? await repositories.wordProgress.getLevelProgress(userId, currentBook.id)
    : {}
  const today = await repositories.dailyProgress.getDailyProgress(userId, date)
  return buildDailyPlan({
    date,
    dailyGoal: profile?.daily_goal ?? 10,
    currentBook,
    today,
    allProgress,
    dueReviewQueue,
    levels,
    levelProgress,
  })
}

export async function recordQuizAnswer(
  userId: string,
  wordId: string,
  correct: boolean,
  mode: QuizMode = 'learning',
  nowMs = Date.now(),
): Promise<QuizAnswerResult> {
  const date = new Date(nowMs).toISOString().slice(0, 10)
  const previous = await repositories.wordProgress.getWordProgress(userId, wordId)
  const progressUpdate = applyQuizResult(previous, correct, nowMs)
  const alreadyReviewedToday =
    previous?.last_reviewed_at?.slice(0, 10) === date
  const newWordXp = xpForNewWord(previous, progressUpdate.patch.status)
  const quizXp =
    mode === 'review' && alreadyReviewedToday
      ? 0
      : xpForCorrectQuiz(previous, correct)
  const reviewCredited = mode === 'review' && xpForReview(previous, alreadyReviewedToday) > 0
  const reviewXp = reviewCredited ? xpForReview(previous, alreadyReviewedToday) : 0
  const answerXp = newWordXp + quizXp + reviewXp

  await repositories.wordProgress.updateWordProgress(userId, wordId, progressUpdate.patch)

  const profile = await repositories.profiles.getProfile(userId)
  const goal = profile?.daily_goal ?? 10
  const today = await repositories.dailyProgress.getDailyProgress(userId, date)
  const newWordsCompleted = (today?.new_words_completed ?? 0) + (progressUpdate.becameLearned ? 1 : 0)
  const reviewsCompleted = (today?.reviews_completed ?? 0) + (reviewCredited ? 1 : 0)
  const nowCompleted = newWordsCompleted >= goal
  const goalXp = xpForDailyGoal(today?.completed ?? false, nowCompleted)
  const totalTodayXp = (today?.xp_earned ?? 0) + answerXp + goalXp
  await repositories.dailyProgress.updateDailyProgress(userId, date, {
    goal,
    new_words_completed: newWordsCompleted,
    reviews_completed: reviewsCompleted,
    xp_earned: totalTodayXp,
    completed: nowCompleted,
  })

  const stats = await repositories.stats.getStats(userId)
  const streak = await refreshStreak(userId, date)
  await repositories.stats.updateStats(userId, {
    total_xp: stats.total_xp + answerXp + goalXp,
    current_streak: streak.current,
    longest_streak: streak.longest,
    words_learned: stats.words_learned + (progressUpdate.becameLearned ? 1 : 0),
    words_mastered: stats.words_mastered + (progressUpdate.becameMastered ? 1 : 0),
    last_activity_at: new Date(nowMs).toISOString(),
  })

  return {
    correct,
    xpEarned: answerXp + goalXp,
    becameLearned: progressUpdate.becameLearned,
    becameMastered: progressUpdate.becameMastered,
    reviewCredited,
    goalJustCompleted: goalXp > 0,
  }
}

export async function finalizeSession(
  userId = getActiveUserId(),
  _input: { newWords?: number; reviews?: number } = {},
  date = todayISO(),
): Promise<SessionFinalizeResult> {
  const today = await repositories.dailyProgress.getDailyProgress(userId, date)
  const profile = await repositories.profiles.getProfile(userId)
  const nowCompleted = (today?.new_words_completed ?? 0) >= (profile?.daily_goal ?? 10)
  const streak = await refreshStreak(userId, date)
  await repositories.stats.updateStats(userId, {
    current_streak: streak.current,
    longest_streak: streak.longest,
  })
  return {
    goalJustCompleted: false,
    nowCompleted,
  }
}

export async function completeDailyChallenge(
  userId = getActiveUserId(),
  date = todayISO(),
) {
  const today = await repositories.dailyProgress.getDailyProgress(userId, date)
  if (today?.challenge_completed) return { alreadyDone: true }
  const profile = await repositories.profiles.getProfile(userId)
  const goal = profile?.daily_goal ?? 10
  const challengeXp = xpForDailyChallenge(false)
  const newWordsCompleted = today?.new_words_completed ?? 0
  await repositories.dailyProgress.updateDailyProgress(userId, date, {
    goal,
    challenge_completed: true,
    xp_earned: (today?.xp_earned ?? 0) + challengeXp,
    completed: newWordsCompleted >= goal,
  })
  const stats = await repositories.stats.getStats(userId)
  const streak = await refreshStreak(userId, date)
  await repositories.stats.updateStats(userId, {
    total_xp: stats.total_xp + challengeXp,
    current_streak: streak.current,
    longest_streak: streak.longest,
    last_activity_at: new Date().toISOString(),
  })
  return { alreadyDone: false }
}
