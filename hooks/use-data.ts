'use client'

/**
 * SWR-based read hooks over the repository layer. Components never touch
 * repositories directly for reads — they use these, which gives caching and
 * cross-component sync for free.
 *
 * User-scoped hooks resolve the ACTIVE user id (from the auth session) at call
 * time and include it in the SWR key, so switching accounts naturally
 * refetches the right data.
 */

import useSWR from 'swr'
import { repositories, getActiveUserId } from '@/repositories'
import { buildTodayPlan } from '@/services/daily-loop'
import { buildProgressSummary } from '@/services/progress'

const repo = repositories

export function useBooks() {
  return useSWR('books', () => repo.books.getBooks())
}

export function useBook(idOrSlug: string | null) {
  return useSWR(idOrSlug ? ['book', idOrSlug] : null, () => repo.books.getBook(idOrSlug as string))
}

export function useLevelsForBook(bookId: string | null) {
  return useSWR(bookId ? ['levels', bookId] : null, () => repo.levels.getLevelsForBook(bookId as string))
}

export function useLevel(levelId: string | null) {
  return useSWR(levelId ? ['level', levelId] : null, () => repo.levels.getLevel(levelId as string))
}

export function useLevelByNumber(levelNumber: number | null) {
  return useSWR(
    levelNumber != null ? ['level-num', levelNumber] : null,
    () => repo.levels.getLevelByNumber(levelNumber as number),
  )
}

export function useWordsForLevel(levelId: string | null) {
  return useSWR(levelId ? ['words', levelId] : null, () => repo.words.getWordsForLevel(levelId as string))
}

export function useWord(wordId: string | null) {
  return useSWR(wordId ? ['word', wordId] : null, () => repo.words.getWord(wordId as string))
}

export function useWordSearch(query: string, limit = 20) {
  return useSWR(['search', query, limit], () => repo.words.searchWords(query, limit))
}

export function useQuizForWord(wordId: string | null) {
  return useSWR(wordId ? ['quiz', wordId] : null, () => repo.quizzes.getQuizQuestions(wordId as string))
}

export function useProfile() {
  const uid = getActiveUserId()
  return useSWR(['profile', uid], () => repo.profiles.getProfile(uid))
}

export function useStats() {
  const uid = getActiveUserId()
  return useSWR(['stats', uid], () => repo.stats.getStats(uid))
}

export function usePublicProfile(userId: string | null) {
  return useSWR(userId ? ['public-profile', userId] : null, () =>
    repositories.profiles.getPublicProfile(userId as string),
  )
}

export function useLeaderboard(limit = 10) {
  return useSWR(['leaderboard', limit], () => repo.stats.getLeaderboard(limit))
}

export function useAllProgress() {
  const uid = getActiveUserId()
  return useSWR(['progress', uid], () => repo.wordProgress.getAllProgress(uid))
}

export function useWordProgress(wordId: string | null) {
  const uid = getActiveUserId()
  return useSWR(wordId ? ['word-progress', uid, wordId] : null, () =>
    repo.wordProgress.getWordProgress(uid, wordId as string),
  )
}

export function useProgressCounts() {
  const uid = getActiveUserId()
  return useSWR(['progress-counts', uid], () => repo.wordProgress.countByStatus(uid))
}

export function useDueForReview() {
  const uid = getActiveUserId()
  return useSWR(['due', uid], () => repo.wordProgress.getDueForReview(uid))
}

export function useLevelProgress(bookId: string | null) {
  const uid = getActiveUserId()
  return useSWR(bookId ? ['level-progress', uid, bookId] : null, () =>
    repo.wordProgress.getLevelProgress(uid, bookId as string),
  )
}

export function useBookProgress() {
  const uid = getActiveUserId()
  return useSWR(['book-progress', uid], () => repositories.wordProgress.getBookProgress(uid))
}

export function useDailyProgress(date: string) {
  const uid = getActiveUserId()
  return useSWR(['daily', uid, date], () => repo.dailyProgress.getDailyProgress(uid, date))
}

export function useDailyRange(fromDate: string, toDate: string) {
  const uid = getActiveUserId()
  return useSWR(['daily-range', uid, fromDate, toDate], () =>
    repo.dailyProgress.getRange(uid, fromDate, toDate),
  )
}

export function useDailyPlan() {
  const uid = getActiveUserId()
  return useSWR(['daily-plan', uid], () => buildTodayPlan(uid))
}

export function useProgressSummary() {
  const uid = getActiveUserId()
  return useSWR(['progress-summary', uid], () => buildProgressSummary(uid))
}

export function useMockTests() {
  const uid = getActiveUserId()
  return useSWR(['mock-tests', uid], () => repo.mockTests.getMockTestsForUser(uid))
}
