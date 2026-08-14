import { repositories } from '@/repositories'
import { applyQuizResult } from '@/lib/learning-logic'
import {
  xpForDailyChallenge,
  xpForDailyGoal,
  xpForQuizAnswer,
  xpForReview,
  type QuizMode,
} from '@/lib/xp'
import { buildDailyPlan, type DailyPlan } from '@/lib/daily-plan'
import { computeStreak } from '@/lib/streak'
import {
  buildChallengeQueue,
  buildReviewQueue,
  DAILY_CHALLENGE_LIMIT,
  DEFAULT_REVIEW_QUEUE_LIMIT,
} from '@/lib/review-scheduler'
import { todayISO } from '@/lib/date'
import type { ISODate, QuizQuestion, Word } from '@/types/database'

export type { QuizMode } from '@/lib/xp'

export interface QuizAnswerResult {
  correct: boolean
  xpEarned: number
  becameLearned: boolean
  becameMastered: boolean
  reviewCredited: boolean
  goalJustCompleted: boolean
}

export interface SessionFinalizeResult {
  dayComplete: boolean
  today: {
    newWordsCompleted: number
    reviewsCompleted: number
  }
  streak: {
    current: number
    longest: number
  }
}

export interface ChallengeCard {
  word: Word
  question: QuizQuestion
}

async function refreshStreak(userId: string, date: ISODate) {
  const rows = await repositories.dailyProgress.getRange(userId, '2000-01-01', date)
  return computeStreak(rows, date)
}

export async function buildTodayPlan(
  userId: string,
  date = todayISO(),
): Promise<DailyPlan> {
  const profile = await repositories.profiles.getProfile(userId)
  const currentBook = profile?.current_book_id
    ? await repositories.books.getBook(profile.current_book_id)
    : null
  const allProgress = await repositories.wordProgress.getAllProgress(userId)
  const dueReviewQueue = buildReviewQueue(allProgress, { limit: DEFAULT_REVIEW_QUEUE_LIMIT })
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
  const answerXp = xpForQuizAnswer({
    previous,
    nextStatus: progressUpdate.patch.status ?? 'new',
    alreadyCreditedToday: alreadyReviewedToday,
    mode,
    correct,
  })
  const reviewCredited = xpForReview(previous, alreadyReviewedToday, mode) > 0

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
  userId: string,
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
    dayComplete: nowCompleted,
    today: {
      newWordsCompleted: today?.new_words_completed ?? 0,
      reviewsCompleted: today?.reviews_completed ?? 0,
    },
    streak,
  }
}

export async function buildDailyChallenge(
  userId: string,
): Promise<ChallengeCard[]> {
  const allProgress = await repositories.wordProgress.getAllProgress(userId)
  const queue = buildChallengeQueue(allProgress, DAILY_CHALLENGE_LIMIT)
  const cards = await Promise.all(
    queue.map(async (progress): Promise<ChallengeCard | null> => {
      const word = await repositories.words.getWord(progress.word_id)
      if (!word) return null
      const questions = await repositories.quizzes.getQuizQuestions(progress.word_id)
      const question = questions.find((item) => item.question_type === 'meaning') ?? questions[0]
      return question ? { word, question } : null
    }),
  )
  return cards.filter((card): card is ChallengeCard => card != null)
}

export async function completeDailyChallenge(
  userId: string,
  answeredWordIds: string[] = [],
  date = todayISO(),
) {
  const today = await repositories.dailyProgress.getDailyProgress(userId, date)
  if (today?.challenge_completed) return { alreadyDone: true }
  const uniqueWordIds = [...new Set(answeredWordIds)]
  if (uniqueWordIds.length === 0) {
    throw new Error('Complete the challenge quiz before claiming its reward.')
  }
  const progressRows = await Promise.all(
    uniqueWordIds.map((wordId) => repositories.wordProgress.getWordProgress(userId, wordId)),
  )
  const completedWords = progressRows.filter(
    (progress) => progress?.last_reviewed_at?.slice(0, 10) === date,
  )
  if (completedWords.length !== uniqueWordIds.length) {
    throw new Error('Complete every challenge word before claiming its reward.')
  }
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
