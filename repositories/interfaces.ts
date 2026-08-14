/**
 * Repository interfaces — the ONLY surface the UI / business logic talks to.
 *
 * Current implementation: local (in-memory / deterministic).
 * Future implementation: Supabase-backed, swapped without touching the UI.
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
import type { AuthUser, SignUpInput, SignUpResult } from '@/types/auth'

export interface Paginated<T> {
  items: T[]
  total: number
  offset: number
  limit: number
}

export interface BookRepository {
  getBooks(): Promise<Book[]>
  getBook(idOrSlug: string): Promise<Book | null>
}

export interface ChapterRepository {
  getChaptersForBook(bookId: UUID): Promise<Chapter[]>
}

export interface LevelRepository {
  /** Levels belonging to a book, ordered by global level_number. */
  getLevelsForBook(bookId: UUID): Promise<Level[]>
  getLevel(id: UUID): Promise<Level | null>
  getLevelByNumber(levelNumber: number): Promise<Level | null>
}

export interface WordRepository {
  /** Words for a level, ordered by book_word_number. */
  getWordsForLevel(levelId: UUID): Promise<Word[]>
  getWord(id: UUID): Promise<Word | null>
  getWordByNumber(bookWordNumber: number): Promise<Word | null>
  /** Lightweight search across word + meaning; paginated for performance. */
  searchWords(query: string, limit?: number, offset?: number): Promise<Paginated<Word>>
}

export interface QuizRepository {
  /** All quiz questions for a single word (up to 5). */
  getQuizQuestions(wordId: UUID): Promise<QuizQuestion[]>
  /** A pool of questions across many words, for mock tests. */
  getRandomQuestions(count: number, seed?: number): Promise<QuizQuestion[]>
  getQuestion(id: UUID): Promise<QuizQuestion | null>
}

export interface ProfileRepository {
  getProfile(userId: UUID): Promise<Profile | null>
  getPublicProfile(userId: UUID): Promise<PublicProfile | null>
  updateProfile(userId: UUID, patch: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile>
}

export interface StatsRepository {
  getStats(userId: UUID): Promise<UserStats>
  updateStats(userId: UUID, patch: Partial<Omit<UserStats, 'user_id'>>): Promise<UserStats>
  /** Adds XP and updates last_activity; returns the new stats. */
  addXp(userId: UUID, amount: number): Promise<UserStats>
  /** Leaderboard is DERIVED from user_stats.total_xp (no separate table). */
  getLeaderboard(limit?: number): Promise<Array<{ rank: number; profile: Profile; stats: UserStats }>>
}

export interface LevelProgressSummary {
  level_id: UUID
  total: number
  learned: number
  mastered: number
}

export interface WordProgressRepository {
  getWordProgress(userId: UUID, wordId: UUID): Promise<UserWordProgress | null>
  getAllProgress(userId: UUID): Promise<UserWordProgress[]>
  getDueForReview(userId: UUID, now?: string): Promise<UserWordProgress[]>
  countByStatus(userId: UUID): Promise<Record<WordStatus, number>>
  /**
   * Per-level learned/mastered rollup for a book. Backed later by a Supabase
   * view or RPC joining user_word_progress -> words grouped by level_id.
   */
  getLevelProgress(userId: UUID, bookId: UUID): Promise<Record<UUID, LevelProgressSummary>>
  getBookProgress(userId: UUID): Promise<BookProgressSummary[]>
  updateWordProgress(
    userId: UUID,
    wordId: UUID,
    patch: Partial<Omit<UserWordProgress, 'id' | 'user_id' | 'word_id' | 'created_at'>>,
  ): Promise<UserWordProgress>
}

export interface DailyProgressRepository {
  getDailyProgress(userId: UUID, date: ISODate): Promise<DailyProgress | null>
  getRange(userId: UUID, fromDate: ISODate, toDate: ISODate): Promise<DailyProgress[]>
  updateDailyProgress(
    userId: UUID,
    date: ISODate,
    patch: Partial<Omit<DailyProgress, 'id' | 'user_id' | 'date' | 'created_at'>>,
  ): Promise<DailyProgress>
}

export interface MockTestRepository {
  createMockTest(
    userId: UUID,
    input: { total_questions: number },
  ): Promise<MockTest>
  saveMockAnswer(
    testId: UUID,
    answer: { question_id: UUID; user_answer: string | null; is_correct: boolean },
  ): Promise<MockTestAnswer>
  /** Finalize a test: recompute correct_answers / score / time. */
  finalizeMockTest(
    testId: UUID,
    input: { time_taken_seconds: number },
  ): Promise<MockTest>
  getMockTest(testId: UUID): Promise<{ test: MockTest; answers: MockTestAnswer[] } | null>
  getMockTestsForUser(userId: UUID): Promise<MockTest[]>
}

/**
 * Identity / session. The local implementation fakes it in the browser; the
 * Supabase implementation will map 1:1 onto Supabase Auth (sign up, sign in,
 * email confirmation, password recovery) without changing any UI.
 */
export interface AuthRepository {
  /** Current session user, or null if signed out. */
  getSession(): Promise<AuthUser | null>
  /** Creates the account + its profile/stats; requires email confirmation. */
  signUp(input: SignUpInput): Promise<SignUpResult>
  /** Verifies credentials and opens a session. */
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  /** Re-issues the confirmation token (local returns it to simulate the email). */
  resendConfirmation(email: string): Promise<{ confirmationToken?: string }>
  /** Marks the account confirmed. */
  confirmEmail(token: string): Promise<AuthUser>
  /**
   * Starts recovery. Always resolves (never leaks whether the email exists).
   * Local returns the token to simulate the emailed reset link.
   */
  requestPasswordReset(email: string): Promise<{ resetToken?: string }>
  resetPassword(token: string, newPassword: string): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  deleteAccount(): Promise<void>
}

/** Aggregated access point so features depend on one object. */
export interface Repositories {
  auth: AuthRepository
  books: BookRepository
  chapters: ChapterRepository
  levels: LevelRepository
  words: WordRepository
  quizzes: QuizRepository
  profiles: ProfileRepository
  stats: StatsRepository
  wordProgress: WordProgressRepository
  dailyProgress: DailyProgressRepository
  mockTests: MockTestRepository
}
