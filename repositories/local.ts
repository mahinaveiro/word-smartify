/**
 * LOCAL repository implementations.
 *
 * Content (books/levels/words/quizzes) comes from the deterministic dataset.
 * User data (profile/stats/progress/daily/mock tests) is persisted through the
 * local store. Every method mimics an async database call.
 *
 * These classes implement the interfaces in ./interfaces and are the ONLY
 * thing that will be swapped for Supabase later.
 */

import type {
  Book,
  BookProgressSummary,
  Chapter,
  DailyProgress,
  ISODate,
  Level,
  MockTest,
  MockTestAnswer,
  Profile,
  QuizQuestion,
  UserStats,
  UserWordProgress,
  UUID,
  Word,
  WordStatus,
  PublicProfile,
} from '@/types/database'
import type {
  BookRepository,
  ChapterRepository,
  DailyProgressRepository,
  LevelRepository,
  MockTestRepository,
  Paginated,
  ProfileRepository,
  QuizRepository,
  Repositories,
  StatsRepository,
  WordProgressRepository,
  WordRepository,
} from './interfaces'
import { getDataset, getQuizForWord, getWordsForBook } from '@/data/dataset'
import { makeId, makeRng, NOW, shuffle } from '@/data/seed-utils'
import {
  dailyKey,
  progressKey,
  readStore,
  writeStore,
} from '@/data/local-store'
import { ensureSeeded } from '@/data/seed-user'
import { LocalAuthRepository } from './local-auth'

/** Simulated latency — small so the app never feels slow. */
function delay<T>(value: T, ms = 40): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))

// ---------------------------------------------------------------------------
// Content repositories
// ---------------------------------------------------------------------------

class LocalBookRepository implements BookRepository {
  async getBooks(): Promise<Book[]> {
    return delay(clone(getDataset().books))
  }
  async getBook(idOrSlug: string): Promise<Book | null> {
    const b = getDataset().books.find((x) => x.id === idOrSlug || x.slug === idOrSlug)
    return delay(b ? clone(b) : null)
  }
}

class LocalChapterRepository implements ChapterRepository {
  async getChaptersForBook(bookId: UUID): Promise<Chapter[]> {
    const c = getDataset().chapters.filter((x) => x.book_id === bookId)
    return delay(clone(c))
  }
}

class LocalLevelRepository implements LevelRepository {
  async getLevelsForBook(bookId: UUID): Promise<Level[]> {
    const ds = getDataset()
    const chapterIds = new Set(ds.chapters.filter((c) => c.book_id === bookId).map((c) => c.id))
    const levels = ds.levels
      .filter((l) => chapterIds.has(l.chapter_id))
      .sort((a, b) => a.level_number - b.level_number)
    return delay(clone(levels))
  }
  async getLevel(id: UUID): Promise<Level | null> {
    const l = getDataset().levelById.get(id)
    return delay(l ? clone(l) : null)
  }
  async getLevelByNumber(levelNumber: number): Promise<Level | null> {
    const l = getDataset().levelByNumber.get(levelNumber)
    return delay(l ? clone(l) : null)
  }
}

class LocalWordRepository implements WordRepository {
  async getWordsForLevel(levelId: UUID): Promise<Word[]> {
    const w = getDataset().wordsByLevel.get(levelId) ?? []
    return delay(clone(w))
  }
  async getWord(id: UUID): Promise<Word | null> {
    const w = getDataset().wordById.get(id)
    return delay(w ? clone(w) : null)
  }
  async getWordByNumber(bookWordNumber: number): Promise<Word | null> {
    const w = getDataset().wordByNumber.get(bookWordNumber)
    return delay(w ? clone(w) : null)
  }
  async searchWords(query: string, limit = 20, offset = 0): Promise<Paginated<Word>> {
    const q = query.trim().toLowerCase()
    const all = getDataset().words
    const matched = q
      ? all.filter(
          (w) =>
            w.word.toLowerCase().includes(q) ||
            w.english_meaning.toLowerCase().includes(q) ||
            (w.bangla_meaning ?? '').toLowerCase().includes(q),
        )
      : all
    const items = matched.slice(offset, offset + limit).map(clone)
    return delay({ items, total: matched.length, offset, limit })
  }
}

class LocalQuizRepository implements QuizRepository {
  async getQuizQuestions(wordId: UUID): Promise<QuizQuestion[]> {
    return delay(clone(getQuizForWord(wordId)))
  }
  async getRandomQuestions(count: number, seed = 1): Promise<QuizQuestion[]> {
    const ds = getDataset()
    const rng = makeRng(seed * 31 + count)
    const words = shuffle(ds.words, rng).slice(0, count)
    const questions = words.map((w) => {
      const qs = getQuizForWord(w.id)
      return qs[Math.floor(rng() * qs.length)]
    })
    return delay(clone(questions))
  }
  async getQuestion(id: UUID): Promise<QuizQuestion | null> {
    // Question ids encode the word number; brute-force lookup is avoided by
    // scanning only when needed (mock tests keep their own copies).
    return delay(null)
  }
}

// ---------------------------------------------------------------------------
// User repositories
// ---------------------------------------------------------------------------

class LocalProfileRepository implements ProfileRepository {
  async getProfile(userId: UUID): Promise<Profile | null> {
    ensureSeeded()
    const p = readStore().profiles[userId]
    return delay(p ? clone(p) : null)
  }
  async getPublicProfile(userId: UUID): Promise<PublicProfile | null> {
    ensureSeeded()
    const store = readStore()
    const profile = store.profiles[userId]
    const stats = store.stats[userId]
    if (!profile || !stats) return delay(null)
    const bookProgress = await localWordProgressRepository.getBookProgress(userId)
    return delay(clone({
      id: profile.id,
      display_name: profile.display_name,
      avatar_id: profile.avatar_id,
      current_streak: stats.current_streak,
      longest_streak: stats.longest_streak,
      total_xp: stats.total_xp,
      words_learned: stats.words_learned,
      words_mastered: stats.words_mastered,
      book_progress: bookProgress,
    }))
  }
  async updateProfile(
    userId: UUID,
    patch: Partial<Omit<Profile, 'id' | 'created_at'>>,
  ): Promise<Profile> {
    ensureSeeded()
    const updated = writeStore((draft) => {
      const existing = draft.profiles[userId]
      draft.profiles[userId] = {
        ...existing,
        ...patch,
        id: userId,
        updated_at: new Date().toISOString(),
      } as Profile
    }).profiles[userId]
    return delay(clone(updated))
  }
}

class LocalStatsRepository implements StatsRepository {
  async getStats(userId: UUID): Promise<UserStats> {
    ensureSeeded()
    const s = readStore().stats[userId] ?? emptyStats(userId)
    return delay(clone(s))
  }
  async updateStats(
    userId: UUID,
    patch: Partial<Omit<UserStats, 'user_id'>>,
  ): Promise<UserStats> {
    ensureSeeded()
    const s = writeStore((draft) => {
      draft.stats[userId] = { ...(draft.stats[userId] ?? emptyStats(userId)), ...patch, user_id: userId }
    }).stats[userId]
    return delay(clone(s))
  }
  async addXp(userId: UUID, amount: number): Promise<UserStats> {
    ensureSeeded()
    const s = writeStore((draft) => {
      const cur = draft.stats[userId] ?? emptyStats(userId)
      draft.stats[userId] = {
        ...cur,
        total_xp: cur.total_xp + Math.max(0, amount),
        last_activity_at: new Date().toISOString(),
      }
    }).stats[userId]
    return delay(clone(s))
  }
  async getLeaderboard(limit = 10): Promise<Array<{ rank: number; profile: Profile; stats: UserStats }>> {
    ensureSeeded()
    const store = readStore()
    const rows = Object.values(store.profiles)
      .map((profile) => {
        const stats = store.stats[profile.id]
        return stats ? { profile, stats } : null
      })
      .filter((row): row is { profile: Profile; stats: UserStats } => row != null)
      .sort((a, b) => b.stats.total_xp - a.stats.total_xp || a.profile.display_name.localeCompare(b.profile.display_name))
      .map((row, index) => ({ ...row, rank: index + 1 }))
    return delay(clone(rows.slice(0, limit)))
  }
}

function emptyStats(userId: string): UserStats {
  return {
    user_id: userId,
    total_xp: 0,
    current_streak: 0,
    longest_streak: 0,
    words_learned: 0,
    words_mastered: 0,
    last_activity_at: null,
  }
}

class LocalWordProgressRepository implements WordProgressRepository {
  async getWordProgress(userId: UUID, wordId: UUID): Promise<UserWordProgress | null> {
    ensureSeeded()
    const p = readStore().wordProgress[progressKey(userId, wordId)]
    return delay(p ? clone(p) : null)
  }
  async getAllProgress(userId: UUID): Promise<UserWordProgress[]> {
    ensureSeeded()
    const all = Object.values(readStore().wordProgress).filter((p) => p.user_id === userId)
    return delay(clone(all))
  }
  async getDueForReview(userId: UUID, now = new Date().toISOString()): Promise<UserWordProgress[]> {
    ensureSeeded()
    const due = Object.values(readStore().wordProgress).filter(
      (p) =>
        p.user_id === userId &&
        p.status !== 'mastered' &&
        p.next_review_at != null &&
        p.next_review_at <= now,
    )
    return delay(clone(due))
  }
  async countByStatus(userId: UUID): Promise<Record<WordStatus, number>> {
    ensureSeeded()
    const counts: Record<WordStatus, number> = { new: 0, learning: 0, familiar: 0, mastered: 0 }
    for (const p of Object.values(readStore().wordProgress)) {
      if (p.user_id === userId) counts[p.status]++
    }
    return delay(counts)
  }
  async getLevelProgress(userId: UUID, bookId: UUID) {
    ensureSeeded()
    const ds = getDataset()
    const chapterIds = new Set(ds.chapters.filter((c) => c.book_id === bookId).map((c) => c.id))
    const levels = ds.levels.filter((l) => chapterIds.has(l.chapter_id))
    const progress = readStore().wordProgress
    const byWord = new Map<string, WordStatus>()
    for (const p of Object.values(progress)) {
      if (p.user_id === userId) byWord.set(p.word_id, p.status)
    }
    const out: Record<string, { level_id: string; total: number; learned: number; mastered: number }> = {}
    for (const level of levels) {
      const words = ds.wordsByLevel.get(level.id) ?? []
      let learned = 0
      let mastered = 0
      for (const w of words) {
        const s = byWord.get(w.id)
        if (s && s !== 'new') learned++
        if (s === 'mastered') mastered++
      }
      out[level.id] = { level_id: level.id, total: words.length, learned, mastered }
    }
    return delay(out)
  }
  async getBookProgress(userId: UUID): Promise<BookProgressSummary[]> {
    ensureSeeded()
    const ds = getDataset()
    const store = readStore()
    const demo = store.demoBookProgress[userId]
    if (demo) return delay(clone(demo))
    const byWord = new Map(
      Object.values(store.wordProgress)
        .filter((progress) => progress.user_id === userId)
        .map((progress) => [progress.word_id, progress.status]),
    )
    return delay(clone(ds.books.map((book) => {
      const words = getWordsForBook(book.id)
      return {
        book_id: book.id,
        total: words.length,
        learned: words.filter((word) => byWord.get(word.id) != null && byWord.get(word.id) !== 'new').length,
        mastered: words.filter((word) => byWord.get(word.id) === 'mastered').length,
      }
    })))
  }
  async updateWordProgress(
    userId: UUID,
    wordId: UUID,
    patch: Partial<Omit<UserWordProgress, 'id' | 'user_id' | 'word_id' | 'created_at'>>,
  ): Promise<UserWordProgress> {
    ensureSeeded()
    const key = progressKey(userId, wordId)
    const now = new Date().toISOString()
    const result = writeStore((draft) => {
      const existing = draft.wordProgress[key]
      if (existing) {
        draft.wordProgress[key] = { ...existing, ...patch, updated_at: now }
      } else {
        draft.wordProgress[key] = {
          id: makeId('uwp', Object.keys(draft.wordProgress).length + 1),
          user_id: userId,
          word_id: wordId,
          status: 'new',
          correct_count: 0,
          wrong_count: 0,
          recall_streak: 0,
          next_review_at: null,
          last_reviewed_at: null,
          created_at: now,
          updated_at: now,
          ...patch,
        }
      }
    }).wordProgress[key]
    return delay(clone(result))
  }
}

const localWordProgressRepository = new LocalWordProgressRepository()

class LocalDailyProgressRepository implements DailyProgressRepository {
  async getDailyProgress(userId: UUID, date: ISODate): Promise<DailyProgress | null> {
    ensureSeeded()
    const d = readStore().dailyProgress[dailyKey(userId, date)]
    return delay(d ? clone(d) : null)
  }
  async getRange(userId: UUID, fromDate: ISODate, toDate: ISODate): Promise<DailyProgress[]> {
    ensureSeeded()
    const rows = Object.values(readStore().dailyProgress).filter(
      (d) => d.user_id === userId && d.date >= fromDate && d.date <= toDate,
    )
    rows.sort((a, b) => a.date.localeCompare(b.date))
    return delay(clone(rows))
  }
  async updateDailyProgress(
    userId: UUID,
    date: ISODate,
    patch: Partial<Omit<DailyProgress, 'id' | 'user_id' | 'date' | 'created_at'>>,
  ): Promise<DailyProgress> {
    ensureSeeded()
    const key = dailyKey(userId, date)
    const result = writeStore((draft) => {
      const existing = draft.dailyProgress[key]
      if (existing) {
        draft.dailyProgress[key] = { ...existing, ...patch }
      } else {
        draft.dailyProgress[key] = {
          id: makeId('dp', Object.keys(draft.dailyProgress).length + 1),
          user_id: userId,
          date,
          goal: 10,
          new_words_completed: 0,
          reviews_completed: 0,
          challenge_completed: false,
          xp_earned: 0,
          completed: false,
          created_at: new Date().toISOString(),
          ...patch,
        }
      }
    }).dailyProgress[key]
    return delay(clone(result))
  }
}

class LocalMockTestRepository implements MockTestRepository {
  async createMockTest(userId: UUID, input: { total_questions: number }): Promise<MockTest> {
    ensureSeeded()
    const id = makeId('mock', Date.now() % 1_000_000)
    const test: MockTest = {
      id,
      user_id: userId,
      total_questions: input.total_questions,
      correct_answers: 0,
      score: 0,
      time_taken_seconds: null,
      created_at: new Date().toISOString(),
    }
    writeStore((draft) => {
      draft.mockTests[id] = test
      draft.mockAnswers[id] = []
    })
    return delay(clone(test))
  }
  async saveMockAnswer(
    testId: UUID,
    answer: { question_id: UUID; user_answer: string | null; is_correct: boolean },
  ): Promise<MockTestAnswer> {
    const row: MockTestAnswer = {
      id: makeId('mans', Math.floor(Math.random() * 1_000_000)),
      test_id: testId,
      question_id: answer.question_id,
      user_answer: answer.user_answer,
      is_correct: answer.is_correct,
      created_at: new Date().toISOString(),
    }
    writeStore((draft) => {
      const answers = draft.mockAnswers[testId] ?? []
      const existingIndex = answers.findIndex((item) => item.question_id === answer.question_id)
      if (existingIndex >= 0) {
        answers[existingIndex] = row
        draft.mockAnswers[testId] = answers
      } else {
        draft.mockAnswers[testId] = [...answers, row]
      }
    })
    return delay(clone(row))
  }
  async finalizeMockTest(testId: UUID, input: { time_taken_seconds: number }): Promise<MockTest> {
    const result = writeStore((draft) => {
      const test = draft.mockTests[testId]
      if (!test) return
      const answers = draft.mockAnswers[testId] ?? []
      const latestAnswers = new Map<string, MockTestAnswer>()
      for (const answer of answers) {
        const previous = latestAnswers.get(answer.question_id)
        if (!previous || answer.created_at >= previous.created_at) {
          latestAnswers.set(answer.question_id, answer)
        }
      }
      const correct = [...latestAnswers.values()].filter((a) => a.is_correct).length
      test.correct_answers = correct
      test.score = test.total_questions > 0 ? Math.round((correct / test.total_questions) * 100) : 0
      test.time_taken_seconds = input.time_taken_seconds
    }).mockTests[testId]
    return delay(clone(result))
  }
  async getMockTest(
    testId: UUID,
  ): Promise<{ test: MockTest; answers: MockTestAnswer[] } | null> {
    const store = readStore()
    const test = store.mockTests[testId]
    if (!test) return delay(null)
    return delay({ test: clone(test), answers: clone(store.mockAnswers[testId] ?? []) })
  }
  async getMockTestsForUser(userId: UUID): Promise<MockTest[]> {
    const rows = Object.values(readStore().mockTests).filter((t) => t.user_id === userId)
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return delay(clone(rows))
  }
}

export function createLocalRepositories(): Repositories {
  return {
    auth: new LocalAuthRepository(),
    books: new LocalBookRepository(),
    chapters: new LocalChapterRepository(),
    levels: new LocalLevelRepository(),
    words: new LocalWordRepository(),
    quizzes: new LocalQuizRepository(),
    profiles: new LocalProfileRepository(),
    stats: new LocalStatsRepository(),
    wordProgress: localWordProgressRepository,
    dailyProgress: new LocalDailyProgressRepository(),
    mockTests: new LocalMockTestRepository(),
  }
}
