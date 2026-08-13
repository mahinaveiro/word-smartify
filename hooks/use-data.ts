'use client'

/**
 * SWR-based read hooks over the repository layer. Components never touch
 * repositories directly for reads — they use these, which gives caching and
 * cross-component sync for free.
 */

import useSWR from 'swr'
import { repositories, CURRENT_USER_ID } from '@/repositories'

const repo = repositories
const uid = CURRENT_USER_ID

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
  return useSWR(['profile', uid], () => repo.profiles.getProfile(uid))
}

export function useStats() {
  return useSWR(['stats', uid], () => repo.stats.getStats(uid))
}

export function useLeaderboard(limit = 10) {
  return useSWR(['leaderboard', limit], () => repo.stats.getLeaderboard(limit))
}

export function useAllProgress() {
  return useSWR(['progress', uid], () => repo.wordProgress.getAllProgress(uid))
}

export function useWordProgress(wordId: string | null) {
  return useSWR(wordId ? ['word-progress', uid, wordId] : null, () =>
    repo.wordProgress.getWordProgress(uid, wordId as string),
  )
}

export function useProgressCounts() {
  return useSWR(['progress-counts', uid], () => repo.wordProgress.countByStatus(uid))
}

export function useDueForReview() {
  return useSWR(['due', uid], () => repo.wordProgress.getDueForReview(uid))
}

export function useLevelProgress(bookId: string | null) {
  return useSWR(bookId ? ['level-progress', uid, bookId] : null, () =>
    repo.wordProgress.getLevelProgress(uid, bookId as string),
  )
}

export function useDailyProgress(date: string) {
  return useSWR(['daily', uid, date], () => repo.dailyProgress.getDailyProgress(uid, date))
}

export function useDailyRange(fromDate: string, toDate: string) {
  return useSWR(['daily-range', uid, fromDate, toDate], () =>
    repo.dailyProgress.getRange(uid, fromDate, toDate),
  )
}

export function useMockTests() {
  return useSWR(['mock-tests', uid], () => repo.mockTests.getMockTestsForUser(uid))
}
