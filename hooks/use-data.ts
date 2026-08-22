'use client'

import useSWR from 'swr'
import { repositories } from '@/repositories'
import { useAuth } from '@/features/auth/auth-provider'
import { buildTodayPlan } from '@/services/daily-loop'
import { buildProgressSummary } from '@/services/progress'
import { getMockTestData } from '@/services/mock-test'
import type { DictionarySearchFilters, LeaderboardMode } from '@/types/database'

const repo = repositories

function useOptionalUserId() {
  return useAuth().user?.id ?? null
}

export function useBooks() {
  return useSWR('books', () => repo.books.getBooks())
}

export function useBook(idOrSlug: string | null) {
  return useSWR(idOrSlug ? ['book', idOrSlug] : null, () => repo.books.getBook(idOrSlug as string))
}

export function useLevelsForBook(bookId: string | null) {
  return useSWR(bookId ? ['levels', bookId] : null, () => repo.levels.getLevelsForBook(bookId as string))
}

export function useChaptersForBook(bookId: string | null) {
  return useSWR(bookId ? ['chapters', bookId] : null, () => repo.chapters.getChaptersForBook(bookId as string))
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

export function useLibrarySearch(filters: DictionarySearchFilters, limit = 24, offset = 0) {
  return useSWR(
    ['library-search', filters.query ?? '', filters.book_id ?? '', filters.level_id ?? '', filters.letter ?? '', limit, offset],
    () => repo.words.searchLibraryWords(filters, limit, offset),
    { keepPreviousData: true },
  )
}

export function useSavedWords(limit = 100) {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['saved-words', uid, limit] : null, () => repo.savedWords.getSavedWords(uid as string, limit))
}

export function useSavedWord(wordId: string | null) {
  const uid = useOptionalUserId()
  return useSWR(uid && wordId ? ['saved-word', uid, wordId] : null, () =>
    repo.savedWords.isWordSaved(uid as string, wordId as string),
  )
}

export function useQuizForWord(wordId: string | null) {
  return useSWR(wordId ? ['quiz', wordId] : null, () => repo.quizzes.getQuizQuestions(wordId as string))
}

export function useProfile() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['profile', uid] : null, () => repo.profiles.getProfile(uid as string))
}

export function useStats() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['stats', uid] : null, () => repo.stats.getStats(uid as string))
}

export function usePublicProfile(userId: string | null) {
  return useSWR(userId ? ['public-profile', userId] : null, () =>
    repositories.profiles.getPublicProfile(userId as string),
  )
}

export function useMyDisplayBadges() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['display-badges', uid] : null, async () => {
    const badgeMap = await repo.badges.getDisplayBadgesForUsers([uid as string])
    return badgeMap[uid as string] ?? []
  })
}

export function usePendingBadgeAwards() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['pending-badge-awards', uid] : null, () => repo.badges.getPendingAwards(uid as string), {
    revalidateOnFocus: false,
  })
}

export function useLeaderboard(modeOrLimit: LeaderboardMode | number = 'all_time', requestedLimit = 10) {
  const uid = useOptionalUserId()
  const mode: LeaderboardMode = typeof modeOrLimit === 'number' ? 'all_time' : modeOrLimit
  const limit = typeof modeOrLimit === 'number' ? modeOrLimit : requestedLimit
  return useSWR(uid ? ['leaderboard', mode, uid, limit] : null, () => repo.stats.getLeaderboard(mode, uid as string, limit), {
    revalidateOnFocus: false,
  })
}

export function useAllProgress() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['progress', uid] : null, () => repo.wordProgress.getAllProgress(uid as string))
}

export function useWordProgress(wordId: string | null) {
  const uid = useOptionalUserId()
  return useSWR(uid && wordId ? ['word-progress', uid, wordId] : null, () =>
    repo.wordProgress.getWordProgress(uid as string, wordId as string),
  )
}

export function useProgressCounts() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['progress-counts', uid] : null, () => repo.wordProgress.countByStatus(uid as string))
}

export function useDueForReview() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['due', uid] : null, () => repo.wordProgress.getDueForReview(uid as string))
}

export function useLevelProgress(bookId: string | null) {
  const uid = useOptionalUserId()
  return useSWR(uid && bookId ? ['level-progress', uid, bookId] : null, () =>
    repo.wordProgress.getLevelProgress(uid as string, bookId as string),
  )
}

export function useBookProgress() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['book-progress', uid] : null, () => repositories.wordProgress.getBookProgress(uid as string))
}

export function useDailyProgress(date: string) {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['daily', uid, date] : null, () => repo.dailyProgress.getDailyProgress(uid as string, date))
}

export function useDailyRange(fromDate: string, toDate: string) {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['daily-range', uid, fromDate, toDate] : null, () =>
    repo.dailyProgress.getRange(uid as string, fromDate, toDate),
  )
}

export function useDailyPlan() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['daily-plan', uid] : null, () => buildTodayPlan(uid as string))
}

export function useProgressSummary() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['progress-summary', uid] : null, () => buildProgressSummary(uid as string))
}

export function useMockTests() {
  const uid = useOptionalUserId()
  return useSWR(uid ? ['mock-tests', uid] : null, () => repo.mockTests.getMockTestsForUser(uid as string))
}

export function useMockTest(testId: string | null) {
  const uid = useOptionalUserId()
  return useSWR(
    uid && testId ? ['mock-test', uid, testId] : null,
    () => getMockTestData(testId as string, uid as string),
  )
}
