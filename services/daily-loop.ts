import { repositories } from '@/repositories'
import type { Repositories } from '@/repositories/interfaces'
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
  DAILY_CHALLENGE_LIMIT,
  getDueWords,
  getWeakWords,
} from '@/lib/review-scheduler'
import { todayISO } from '@/lib/date'
import { prepareQuizQuestion } from '@/lib/quiz-randomizer'
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

async function refreshStreak(userId: string, date: ISODate, repos: Repositories = repositories) {
  const rows = await repos.dailyProgress.getRange(userId, '2000-01-01', date)
  return computeStreak(rows, date)
}

export async function buildTodayPlan(
  userId: string,
  date = todayISO(),
  repos: Repositories = repositories,
): Promise<DailyPlan> {
  const profile = await repos.profiles.getProfile(userId)
  const currentBook = profile?.current_book_id
    ? await repos.books.getBook(profile.current_book_id)
    : null
  const allProgress = await repos.wordProgress.getAllProgress(userId)
  const dueReviewQueue = getDueWords(allProgress)
  const dueWordIds = new Set(dueReviewQueue.map((progress) => progress.word_id))
  const weakWordCount = getWeakWords(allProgress).filter((progress) => !dueWordIds.has(progress.word_id)).length
  const levels = currentBook ? await repos.levels.getLevelsForBook(currentBook.id) : []
  const levelProgress = currentBook
    ? await repos.wordProgress.getLevelProgress(userId, currentBook.id)
    : {}
  const today = await repos.dailyProgress.getDailyProgress(userId, date)
  return buildDailyPlan({
    date,
    dailyGoal: profile?.daily_goal ?? 10,
    currentBook,
    today,
    dueReviewQueue,
    weakWordCount,
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
  repos: Repositories = repositories,
): Promise<QuizAnswerResult> {
  const date = new Date(nowMs).toISOString().slice(0, 10)
  const previous = await repos.wordProgress.getWordProgress(userId, wordId)
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

  await repos.wordProgress.updateWordProgress(userId, wordId, progressUpdate.patch)

  const profile = await repos.profiles.getProfile(userId)
  const goal = profile?.daily_goal ?? 10
  const today = await repos.dailyProgress.getDailyProgress(userId, date)
  const newWordsCompleted = (today?.new_words_completed ?? 0) + (progressUpdate.becameLearned ? 1 : 0)
  const reviewsCompleted = (today?.reviews_completed ?? 0) + (reviewCredited ? 1 : 0)
  const nowCompleted = newWordsCompleted >= goal
  const goalXp = xpForDailyGoal(today?.completed ?? false, nowCompleted)
  const totalTodayXp = (today?.xp_earned ?? 0) + answerXp + goalXp
  await repos.dailyProgress.updateDailyProgress(userId, date, {
    goal,
    new_words_completed: newWordsCompleted,
    reviews_completed: reviewsCompleted,
    xp_earned: totalTodayXp,
    completed: nowCompleted,
  })

  const stats = await repos.stats.addXp(userId, answerXp + goalXp)
  const streak = await refreshStreak(userId, date, repos)
  await repos.stats.updateStats(userId, {
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
  repos: Repositories = repositories,
): Promise<SessionFinalizeResult> {
  const today = await repos.dailyProgress.getDailyProgress(userId, date)
  const profile = await repos.profiles.getProfile(userId)
  const nowCompleted = (today?.new_words_completed ?? 0) >= (profile?.daily_goal ?? 10)
  const streak = await refreshStreak(userId, date, repos)
  await repos.stats.updateStats(userId, {
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
  date = todayISO(),
  repos: Repositories = repositories,
): Promise<ChallengeCard[]> {
  const seed = [...`${userId}:${date}`].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) | 0, 7)
  const words = await repos.words.getWordsForChallenge(DAILY_CHALLENGE_LIMIT, seed)
  const cards = await Promise.all(
    words.map(async (word): Promise<ChallengeCard | null> => {
      const questions = await repos.quizzes.getQuizQuestions(word.id)
      const question = questions.find((item) => item.question_type === 'meaning') ?? questions[0]
      return question ? { word, question: prepareQuizQuestion(question) } : null
    }),
  )
  return cards.filter((card): card is ChallengeCard => card != null)
}

export async function completeDailyChallenge(
  userId: string,
  answeredWordIds: string[] = [],
  date = todayISO(),
  repos: Repositories = repositories,
) {
  const today = await repos.dailyProgress.getDailyProgress(userId, date)
  if (today?.challenge_completed) return { alreadyDone: true }
  const uniqueWordIds = [...new Set(answeredWordIds)]
  if (uniqueWordIds.length === 0) {
    throw new Error('Complete the challenge quiz before claiming its reward.')
  }
  const progressRows = await Promise.all(
    uniqueWordIds.map((wordId) => repos.wordProgress.getWordProgress(userId, wordId)),
  )
  const completedWords = progressRows.filter(
    (progress) => progress?.last_reviewed_at?.slice(0, 10) === date,
  )
  if (completedWords.length !== uniqueWordIds.length) {
    throw new Error('Complete every challenge word before claiming its reward.')
  }
  const profile = await repos.profiles.getProfile(userId)
  const goal = profile?.daily_goal ?? 10
  const challengeXp = xpForDailyChallenge(false)
  const newWordsCompleted = today?.new_words_completed ?? 0
  await repos.dailyProgress.updateDailyProgress(userId, date, {
    goal,
    challenge_completed: true,
    xp_earned: (today?.xp_earned ?? 0) + challengeXp,
    completed: newWordsCompleted >= goal,
  })
  await repos.stats.addXp(userId, challengeXp)
  const streak = await refreshStreak(userId, date, repos)
  await repos.stats.updateStats(userId, {
    current_streak: streak.current,
    longest_streak: streak.longest,
    last_activity_at: new Date().toISOString(),
  })
  return { alreadyDone: false }
}
