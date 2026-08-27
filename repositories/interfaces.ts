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
  LeaderboardMode,
  LeaderboardResult,
  QuizQuestion,
  UserStats,
  UserWordProgress,
  UUID,
  Word,
  WordStatus,
  PublicProfile,
  BadgeAward,
  DisplayBadge,
  PendingBadgeAward,
  DictionarySearchFilters,
  SavedWord,
  SavedWordWithWord,
  CombatMatch,
  CombatAnswer,
  CombatInvite,
  CombatQuestion,
  CombatResult,
  CombatPreset,
  CombatQuestionSource,
  CombatQuickMessage,
  Friendship,
  SocialProfile,
  ViewerFriendshipState,
  UserPrivacy,
  PresenceState,
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
  /** Resolves the parent book through the level's chapter. */
  getBookIdForLevel(id: UUID): Promise<UUID | null>
  getLevelByNumber(levelNumber: number): Promise<Level | null>
}

export interface WordRepository {
  /** Words for a level, ordered by book_word_number. */
  getWordsForLevel(levelId: UUID): Promise<Word[]>
  /** Words for multiple levels, ordered by book_word_number. */
  getWordsForLevels(levelIds: UUID[]): Promise<Word[]>
  getWord(id: UUID): Promise<Word | null>
  getWordByNumber(bookWordNumber: number): Promise<Word | null>
  /** Lightweight search across word + meaning; paginated for performance. */
  searchWords(query: string, limit?: number, offset?: number): Promise<Paginated<Word>>
  /** Bounded dictionary search across word, meanings, synonyms, antonyms, and curriculum filters. */
  searchLibraryWords(filters: DictionarySearchFilters, limit?: number, offset?: number): Promise<Paginated<Word>>
  /** Deterministic broad vocabulary sample for the exploratory Daily Challenge. */
  getWordsForChallenge(limit: number, seed?: number): Promise<Word[]>
}

export interface QuizRepository {
  /** All quiz questions for a single word (up to 5). */
  getQuizQuestions(wordId: UUID): Promise<QuizQuestion[]>
  /** All quiz questions for multiple words, ordered by creation time. */
  getQuizQuestionsForWords(wordIds: UUID[]): Promise<QuizQuestion[]>
  /** Exact quiz questions by persisted IDs, preserving no random pool behavior. */
  getQuizQuestionsByIds(questionIds: UUID[]): Promise<QuizQuestion[]>
  getQuestion(id: UUID): Promise<QuizQuestion | null>
}

export interface ProfileRepository {
  getProfile(userId: UUID): Promise<Profile | null>
  getPublicProfile(userId: UUID): Promise<PublicProfile | null>
  updateProfile(userId: UUID, patch: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile>
}

export interface BadgeRepository {
  getDisplayBadgesForUsers(userIds: UUID[]): Promise<Record<UUID, DisplayBadge[]>>
  getPendingAwards(userId: UUID): Promise<PendingBadgeAward[]>
  acknowledgeAwards(userId: UUID, awardIds: UUID[]): Promise<void>
}

export interface SocialRepository {
  getFriends(userId: UUID): Promise<Friendship[]>
  getRequests(userId: UUID): Promise<{ incoming: Friendship[]; outgoing: Friendship[] }>
  searchUsers(userId: UUID, query: string, limit?: number): Promise<SocialProfile[]>
  getRelationship(userId: UUID, otherUserId: UUID): Promise<ViewerFriendshipState>
  getRelationshipDetails(userId: UUID, otherUserId: UUID): Promise<{ state: ViewerFriendshipState; friendship_id: UUID | null }>
  sendFriendRequest(userId: UUID, otherUserId: UUID): Promise<Friendship>
  respondToFriendRequest(userId: UUID, friendshipId: UUID, response: 'accepted' | 'declined' | 'cancelled'): Promise<void>
  removeFriend(userId: UUID, friendshipId: UUID): Promise<void>
  blockUser(userId: UUID, otherUserId: UUID): Promise<void>
  unblockUser(userId: UUID, otherUserId: UUID): Promise<void>
  getPrivacy(userId: UUID): Promise<UserPrivacy>
  updatePrivacy(userId: UUID, patch: Partial<Omit<UserPrivacy, 'user_id' | 'updated_at'>>): Promise<UserPrivacy>
  setPresence(userId: UUID, state: PresenceState): Promise<void>
}

export interface CombatRepository {
  getMatch(matchId: UUID, userId: UUID): Promise<CombatMatch | null>
  getMatchByCode(code: string, userId: UUID): Promise<CombatMatch | null>
  getHistory(userId: UUID, limit?: number): Promise<CombatMatch[]>
  getInvites(userId: UUID): Promise<CombatInvite[]>
  inviteFriend(userId: UUID, matchId: UUID, recipientId: UUID): Promise<CombatInvite>
  respondToInvite(userId: UUID, inviteId: UUID, response: 'accepted' | 'declined'): Promise<CombatMatch | null>
  createMatch(userId: UUID, input: { preset: CombatPreset; question_count: number; time_limit_seconds: number; wager_xp?: 0 | 100; question_source?: CombatQuestionSource }): Promise<CombatMatch>
  joinMatch(userId: UUID, joinCode: string): Promise<CombatMatch>
  setReady(userId: UUID, matchId: UUID, ready: boolean): Promise<CombatMatch>
  startMatch(userId: UUID, matchId: UUID): Promise<CombatMatch>
  getQuestion(userId: UUID, matchId: UUID, position: number): Promise<CombatQuestion | null>
  submitAnswer(userId: UUID, matchId: UUID, questionId: UUID, selectedAnswer: string | null, responseTimeMs: number): Promise<{ next_position: number; match: CombatMatch; result: CombatResult | null }>
  heartbeat(userId: UUID, matchId: UUID): Promise<CombatMatch>
  leaveMatch(userId: UUID, matchId: UUID): Promise<CombatMatch>
  forfeitMatch(userId: UUID, matchId: UUID): Promise<CombatMatch>
  sendQuickMessage(userId: UUID, matchId: UUID, message: CombatQuickMessage): Promise<{ id: UUID; match_id: UUID; sender_id: UUID; message: CombatQuickMessage; created_at: string }>
  getMessages(userId: UUID, matchId: UUID): Promise<Array<{ id: UUID; match_id: UUID; sender_id: UUID; message: CombatQuickMessage; created_at: string }>>
  getResult(userId: UUID, matchId: UUID): Promise<CombatResult | null>
  cancelMatch(userId: UUID, matchId: UUID): Promise<void>
  reportMatch(userId: UUID, matchId: UUID, reason: 'question' | 'connection' | 'cheating' | 'harassment' | 'other', note?: string): Promise<void>
}

export interface SavedWordRepository {
  getSavedWords(userId: UUID, limit?: number, offset?: number): Promise<Paginated<SavedWordWithWord>>
  isWordSaved(userId: UUID, wordId: UUID): Promise<boolean>
  saveWord(userId: UUID, wordId: UUID): Promise<SavedWord>
  removeSavedWord(userId: UUID, wordId: UUID): Promise<void>
}

export interface StatsRepository {
  getStats(userId: UUID): Promise<UserStats>
  updateStats(userId: UUID, patch: Partial<Omit<UserStats, 'user_id'>>): Promise<UserStats>
  /** Adds XP and updates last_activity; returns the new stats. */
  addXp(userId: UUID, amount: number): Promise<UserStats>
  /** Returns a bounded leaderboard plus the current user's position. */
  getLeaderboard(mode: LeaderboardMode, userId: UUID, limit?: number): Promise<LeaderboardResult>
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
  /** Words belonging to levels fully learned by the user in the selected book. */
  getWordsInCompletedLevels(userId: UUID, bookId: UUID): Promise<Word[]>
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
    input: { total_questions: number; question_ids: UUID[] },
  ): Promise<MockTest>
  saveMockAnswer(
    testId: UUID,
    answer: { question_id: UUID; user_answer: string | null; is_correct: boolean },
  ): Promise<MockTestAnswer>
  /** Finalize a test and report whether this call performed the transition. */
  finalizeMockTest(
    testId: UUID,
    input: { time_taken_seconds: number },
    userId: UUID,
  ): Promise<{ test: MockTest; finalized: boolean }>
  /** Cancel an in-progress test and remove its saved answer slots. */
  cancelMockTest(testId: UUID): Promise<void>
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
  /** Optional live session listener used by Supabase Auth. */
  onAuthStateChange?: (callback: (user: AuthUser | null) => void) => () => void
  /** Creates the account + its profile/stats; requires email confirmation. */
  signUp(input: SignUpInput): Promise<SignUpResult>
  /** Verifies credentials and opens a session. */
  signIn(email: string, password: string): Promise<AuthUser>
  /** Starts Google OAuth; the browser is redirected to Google and back to the app. */
  signInWithGoogle(): Promise<void>
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
  badges: BadgeRepository
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
  savedWords: SavedWordRepository
  social: SocialRepository
  combat: CombatRepository
}
