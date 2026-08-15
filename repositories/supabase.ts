import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Book,
  BookProgressSummary,
  Chapter,
  DailyProgress,
  DailyGoal,
  ISODate,
  Level,
  MockTest,
  MockTestAnswer,
  Profile,
  AchievementBadge,
  LeaderboardEntry,
  LeaderboardMode,
  LeaderboardResult,
  LeaderboardProfile,
  LeaderboardStats,
  QuizQuestion,
  UserStats,
  UserWordProgress,
  UUID,
  Word,
  WordStatus,
  PublicProfile,
  WordDifficulty,
  PublicLeaderboardSummary,
  PublicMockTestSummary,
  DictionarySearchFilters,
  SavedWord,
  SavedWordWithWord,
} from '@/types/database'
import type { Database } from '@/types/supabase'
import type {
  BookRepository,
  ChapterRepository,
  DailyProgressRepository,
  LevelProgressSummary,
  LevelRepository,
  MockTestRepository,
  Paginated,
  ProfileRepository,
  QuizRepository,
  Repositories,
  StatsRepository,
  WordProgressRepository,
  WordRepository,
  SavedWordRepository,
} from './interfaces'
import { SupabaseAuthRepository } from './supabase-auth'
import { isMissingRowError } from '@/lib/supabase/errors'
import { calculateMockTestScore } from '@/lib/mock-test-scoring'
import { shuffleArray } from '@/lib/quiz-randomizer'
import { currentWeekPeriod } from '@/lib/date'

type Client = SupabaseClient<Database>
type QuizRow = Database['public']['Tables']['quiz_questions']['Row']
type WordRow = Database['public']['Tables']['words']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProgressRow = Database['public']['Tables']['user_word_progress']['Row']
type LeaderboardRpcRow = Database['public']['Functions']['get_leaderboard']['Returns'][number]
type PublicBookProgressRpcRow = Database['public']['Functions']['get_public_book_progress']['Returns'][number]
type PublicLeaderboardRpcRow = Database['public']['Functions']['get_public_leaderboard_summary']['Returns'][number]
type PublicMockTestRpcRow = Database['public']['Functions']['get_public_mock_test_summary']['Returns'][number]
type LibrarySearchRpcRow = Database['public']['Functions']['search_library_words']['Returns'][number]
type SavedWordRow = Database['public']['Tables']['saved_words']['Row']

function unwrap<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data == null) throw new Error('Supabase returned no data.')
  return result.data
}

function normalizeOptions(value: QuizRow['options']): string[] | null {
  if (!Array.isArray(value)) return null
  const options = value.filter((option): option is string => typeof option === 'string')
  return options.length ? options : null
}

function normalizeDifficulty(value: string | null): WordDifficulty | null {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : null
}

function toQuizQuestion(row: QuizRow): QuizQuestion {
  return {
    ...row,
    question_type: row.question_type as QuizQuestion['question_type'],
    options: normalizeOptions(row.options),
    difficulty: normalizeDifficulty(row.difficulty),
  }
}

function normalizeStatus(value: string): WordStatus {
  return value === 'learning' || value === 'strong' || value === 'mastered' ? value : 'new'
}

function normalizeDailyGoal(value: number): DailyGoal {
  return value === 5 || value === 10 || value === 15 || value === 20 || value === 30 ? value : 10
}

function toWord(row: WordRow): Word {
  return { ...row, difficulty: normalizeDifficulty(row.difficulty) }
}

function toProfile(row: ProfileRow): Profile {
  return { ...row, daily_goal: normalizeDailyGoal(row.daily_goal) }
}

function toProgress(row: ProgressRow): UserWordProgress {
  return { ...row, status: normalizeStatus(row.status) }
}

function toSavedWord(row: SavedWordRow): SavedWord {
  return row
}

function toLibraryWord(row: LibrarySearchRpcRow): Word {
  return {
    id: row.id,
    level_id: row.level_id,
    book_word_number: row.book_word_number,
    word: row.word,
    pronunciation: row.pronunciation,
    english_meaning: row.english_meaning,
    bangla_meaning: row.bangla_meaning,
    example_sentence: row.example_sentence,
    mnemonic: row.mnemonic,
    synonyms: row.synonyms,
    antonyms: row.antonyms,
    difficulty: normalizeDifficulty(row.difficulty),
    created_at: row.created_at,
  }
}

function emptyStats(userId: UUID): UserStats {
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

function emptyDaily(userId: UUID, date: ISODate): DailyProgress {
  return {
    id: '',
    user_id: userId,
    date,
    goal: 10,
    new_words_completed: 0,
    reviews_completed: 0,
    challenge_completed: false,
    xp_earned: 0,
    completed: false,
    created_at: new Date().toISOString(),
  }
}

function buildAchievementBadges(
  stats: Pick<UserStats, 'words_learned' | 'current_streak' | 'longest_streak'>,
  bookProgress: PublicBookProgressRpcRow[],
  books: Array<{ id: UUID; name: string }>,
  leaderboard: PublicLeaderboardSummary,
): AchievementBadge[] {
  const badges: AchievementBadge[] = []
  const completedBooks = new Set(
    bookProgress
      .filter((progress) => progress.total > 0 && progress.learned >= progress.total)
      .map((progress) => progress.book_id),
  )
  for (const book of books) {
    if (completedBooks.has(book.id)) {
      badges.push({
        id: `book-complete-${book.id}`,
        title: `${book.name} complete`,
        description: `Learn every word in ${book.name}.`,
      })
    }
  }
  if (stats.words_learned >= 100) {
    badges.push({ id: 'words-100', title: '100 words learned', description: 'Learn 100 words.' })
  }
  if (stats.words_learned >= 500) {
    badges.push({ id: 'words-500', title: '500 words learned', description: 'Learn 500 words.' })
  }
  if (stats.words_learned >= 1000) {
    badges.push({ id: 'words-1000', title: '1,000 words learned', description: 'Learn 1,000 words.' })
  }
  if (stats.longest_streak >= 7) {
    badges.push({ id: 'streak-7', title: '7-day streak', description: 'Maintain a 7-day streak.' })
  }
  if (stats.longest_streak >= 30) {
    badges.push({ id: 'streak-30', title: '30-day streak', description: 'Maintain a 30-day streak.' })
  }
  if (stats.longest_streak >= 100) {
    badges.push({ id: 'streak-100', title: '100-day streak', description: 'Maintain a 100-day streak.' })
  }
  if (leaderboard.weekly_wins > 0) {
    badges.push({ id: 'weekly-first', title: 'Weekly #1', description: 'Finish first in a weekly leaderboard.' })
  }
  if (leaderboard.weekly_second_places > 0) {
    badges.push({ id: 'weekly-second', title: 'Weekly #2', description: 'Finish second in a weekly leaderboard.' })
  }
  if (leaderboard.weekly_third_places > 0) {
    badges.push({ id: 'weekly-third', title: 'Weekly #3', description: 'Finish third in a weekly leaderboard.' })
  }
  if (stats.current_streak >= 1 && !badges.some((badge) => badge.id === 'streak-7')) {
    badges.unshift({ id: 'first-session', title: 'First steps', description: 'Start building a learning habit.' })
  }
  return badges.slice(0, 12)
}

class SupabaseBookRepository implements BookRepository {
  constructor(private readonly client: Client) {}

  async getBooks(): Promise<Book[]> {
    return unwrap(await this.client.from('books').select('*').order('display_order', { ascending: true }))
  }

  async getBook(idOrSlug: string): Promise<Book | null> {
    const byId = await this.client.from('books').select('*').eq('id', idOrSlug).maybeSingle()
    if (byId.error) throw new Error(byId.error.message)
    if (byId.data) return byId.data
    const bySlug = await this.client.from('books').select('*').eq('slug', idOrSlug).maybeSingle()
    if (bySlug.error) throw new Error(bySlug.error.message)
    return bySlug.data
  }
}

class SupabaseChapterRepository implements ChapterRepository {
  constructor(private readonly client: Client) {}

  async getChaptersForBook(bookId: UUID): Promise<Chapter[]> {
    return unwrap(
      await this.client
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('display_order', { ascending: true }),
    )
  }
}

class SupabaseLevelRepository implements LevelRepository {
  constructor(private readonly client: Client) {}

  async getLevelsForBook(bookId: UUID): Promise<Level[]> {
    const chapters = await new SupabaseChapterRepository(this.client).getChaptersForBook(bookId)
    const chapterIds = chapters.map((chapter) => chapter.id)
    if (!chapterIds.length) return []
    return unwrap(
      await this.client
        .from('levels')
        .select('*')
        .in('chapter_id', chapterIds)
        .order('level_number', { ascending: true }),
    )
  }

  async getLevel(id: UUID): Promise<Level | null> {
    const result = await this.client.from('levels').select('*').eq('id', id).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data
  }

  async getLevelByNumber(levelNumber: number): Promise<Level | null> {
    const result = await this.client
      .from('levels')
      .select('*')
      .eq('level_number', levelNumber)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data
  }
}

class SupabaseWordRepository implements WordRepository {
  constructor(private readonly client: Client) {}

  async getWordsForLevel(levelId: UUID): Promise<Word[]> {
    return this.getWordsForLevels([levelId])
  }

  async getWordsForLevels(levelIds: UUID[]): Promise<Word[]> {
    if (levelIds.length === 0) return []
    const rows = unwrap(
      await this.client
        .from('words')
        .select('*')
        .in('level_id', levelIds)
        .order('book_word_number', { ascending: true }),
    )
    return rows.map(toWord)
  }

  async getWord(id: UUID): Promise<Word | null> {
    const result = await this.client.from('words').select('*').eq('id', id).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data ? toWord(result.data) : null
  }

  async getWordByNumber(bookWordNumber: number): Promise<Word | null> {
    const result = await this.client
      .from('words')
      .select('*')
      .eq('book_word_number', bookWordNumber)
      .order('book_word_number', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data ? toWord(result.data) : null
  }

  async searchWords(query: string, limit = 20, offset = 0): Promise<Paginated<Word>> {
    const q = query.trim().toLowerCase().replace(/[%,()_]/g, ' ')
    let request = this.client
      .from('words')
      .select('*', { count: 'exact' })
      .order('book_word_number', { ascending: true })
      .range(offset, Math.max(offset, offset + limit - 1))
    if (q) {
      request = request.or(`word.ilike.%${q}%,english_meaning.ilike.%${q}%,bangla_meaning.ilike.%${q}%`)
    }
    const result = await request
    if (result.error) throw new Error(result.error.message)
    return {
      items: (result.data ?? []).map(toWord),
      total: result.count ?? 0,
      offset,
      limit,
    }
  }

  async searchLibraryWords(filters: DictionarySearchFilters, limit = 24, offset = 0): Promise<Paginated<Word>> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100)
    const safeOffset = Math.max(Math.floor(offset), 0)
    const result = await this.client.rpc('search_library_words', {
      p_query: filters.query?.trim() ?? '',
      p_book_id: filters.book_id ?? null,
      p_level_id: filters.level_id ?? null,
      p_letter: filters.letter?.trim().slice(0, 1) || null,
      p_limit: safeLimit,
      p_offset: safeOffset,
    })
    if (result.error) throw new Error(result.error.message)
    const rows = (result.data ?? []) as LibrarySearchRpcRow[]
    return {
      items: rows.map(toLibraryWord),
      total: rows[0]?.total_count ?? 0,
      offset: safeOffset,
      limit: safeLimit,
    }
  }

  async getWordsForChallenge(limit: number, seed = Date.now()): Promise<Word[]> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100)
    const countResult = await this.client.from('words').select('id', { count: 'exact', head: true })
    if (countResult.error) throw new Error(countResult.error.message)
    const total = countResult.count ?? 0
    const maxOffset = Math.max(0, total - safeLimit)
    const normalizedSeed = Math.abs(Math.floor(seed))
    const offset = maxOffset > 0 ? normalizedSeed % (maxOffset + 1) : 0
    const rows = unwrap(
      await this.client
        .from('words')
        .select('*')
        .order('book_word_number', { ascending: true })
        .range(offset, offset + safeLimit - 1),
    )
    return shuffleArray(rows.map(toWord))
  }
}

type SavedWordJoinRow = SavedWordRow & { word: WordRow | null }

class SupabaseSavedWordRepository implements SavedWordRepository {
  constructor(private readonly client: Client) {}

  async getSavedWords(userId: UUID, limit = 24, offset = 0): Promise<Paginated<SavedWordWithWord>> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100)
    const safeOffset = Math.max(Math.floor(offset), 0)
    const result = await this.client
      .from('saved_words')
      .select('id, user_id, word_id, created_at, word:words(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1)
    if (result.error) throw new Error(result.error.message)
    const rows = (result.data ?? []) as unknown as SavedWordJoinRow[]
    return {
      items: rows
        .filter((row) => row.word != null)
        .map((row) => ({ ...toSavedWord(row), word: toWord(row.word as WordRow) })),
      total: result.count ?? 0,
      offset: safeOffset,
      limit: safeLimit,
    }
  }

  async isWordSaved(userId: UUID, wordId: UUID): Promise<boolean> {
    const result = await this.client
      .from('saved_words')
      .select('id')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data != null
  }

  async saveWord(userId: UUID, wordId: UUID): Promise<SavedWord> {
    const result = await this.client
      .from('saved_words')
      .insert({ user_id: userId, word_id: wordId })
      .select('*')
      .single()
    if (!result.error && result.data) return toSavedWord(result.data)
    if (result.error?.code === '23505') {
      const existing = await this.client
        .from('saved_words')
        .select('*')
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .single()
      if (existing.error) throw new Error(existing.error.message)
      return toSavedWord(existing.data)
    }
    throw new Error(result.error?.message ?? 'Unable to save this word.')
  }

  async removeSavedWord(userId: UUID, wordId: UUID): Promise<void> {
    const result = await this.client.from('saved_words').delete().eq('user_id', userId).eq('word_id', wordId)
    if (result.error) throw new Error(result.error.message)
  }
}

class SupabaseQuizRepository implements QuizRepository {
  constructor(private readonly client: Client) {}

  async getQuizQuestions(wordId: UUID): Promise<QuizQuestion[]> {
    return this.getQuizQuestionsForWords([wordId])
  }

  async getQuizQuestionsForWords(wordIds: UUID[]): Promise<QuizQuestion[]> {
    if (wordIds.length === 0) return []
    const rows = unwrap(
      await this.client
        .from('quiz_questions')
        .select('*')
        .in('word_id', wordIds)
        .order('created_at', { ascending: true }),
    )
    return rows.map(toQuizQuestion)
  }

  async getQuizQuestionsByIds(questionIds: UUID[]): Promise<QuizQuestion[]> {
    if (questionIds.length === 0) return []
    const rows = unwrap(
      await this.client
        .from('quiz_questions')
        .select('*')
        .in('id', questionIds),
    )
    const byId = new Map(rows.map((row) => [row.id, toQuizQuestion(row)]))
    return questionIds.map((questionId) => byId.get(questionId)).filter((question): question is QuizQuestion => question != null)
  }

  async getQuestion(id: UUID): Promise<QuizQuestion | null> {
    const result = await this.client.from('quiz_questions').select('*').eq('id', id).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data ? toQuizQuestion(result.data) : null
  }
}

class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: Client) {}

  async getProfile(userId: UUID): Promise<Profile | null> {
    const result = await this.client.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (result.error && !isMissingRowError(result.error)) throw new Error(result.error.message)
    return result.data ? toProfile(result.data) : null
  }

  async getPublicProfile(userId: UUID): Promise<PublicProfile | null> {
    const [profileResult, statsResult, bookProgressResult, leaderboardResult, mockTestsResult, booksResult] = await Promise.all([
      this.client.from('profiles').select('id, display_name, avatar_id, avatar_url').eq('id', userId).maybeSingle(),
      this.client
        .from('user_stats')
        .select('user_id, total_xp, current_streak, longest_streak, words_learned, words_mastered')
        .eq('user_id', userId)
        .maybeSingle(),
      this.client.rpc('get_public_book_progress', { p_user_id: userId }),
      this.client.rpc('get_public_leaderboard_summary', { p_user_id: userId }),
      this.client.rpc('get_public_mock_test_summary', { p_user_id: userId }),
      this.client.from('books').select('id, name').order('display_order', { ascending: true }),
    ])
    if (profileResult.error && !isMissingRowError(profileResult.error)) throw new Error(profileResult.error.message)
    if (statsResult.error && !isMissingRowError(statsResult.error)) throw new Error(statsResult.error.message)
    if (bookProgressResult.error) throw new Error(bookProgressResult.error.message)
    if (leaderboardResult.error) throw new Error(leaderboardResult.error.message)
    if (mockTestsResult.error) throw new Error(mockTestsResult.error.message)
    if (booksResult.error) throw new Error(booksResult.error.message)
    if (!profileResult.data || !statsResult.data) return null

    const bookProgress = (bookProgressResult.data ?? []) as PublicBookProgressRpcRow[]
    const leaderboard = ((leaderboardResult.data ?? [])[0] ?? null) as PublicLeaderboardRpcRow | null
    const mockTests = ((mockTestsResult.data ?? [])[0] ?? null) as PublicMockTestRpcRow | null
    const publicLeaderboard: PublicLeaderboardSummary = {
      current_week_rank: leaderboard?.current_week_rank ?? null,
      highest_weekly_rank: leaderboard?.highest_weekly_rank ?? null,
      weekly_wins: leaderboard?.weekly_wins ?? 0,
      weekly_second_places: leaderboard?.weekly_second_places ?? 0,
      weekly_third_places: leaderboard?.weekly_third_places ?? 0,
      weeks_ranked: leaderboard?.weeks_ranked ?? 0,
      best_weekly_xp: leaderboard?.best_weekly_xp ?? 0,
      all_time_rank: leaderboard?.all_time_rank ?? null,
    }
    const publicMockTests: PublicMockTestSummary = {
      tests_taken: mockTests?.tests_taken ?? 0,
      average_score: mockTests?.average_score == null ? null : Number(mockTests.average_score),
      highest_score: mockTests?.highest_score == null ? null : Number(mockTests.highest_score),
      average_percentage: mockTests?.average_percentage == null ? null : Number(mockTests.average_percentage),
      best_percentage: mockTests?.best_percentage == null ? null : Number(mockTests.best_percentage),
    }
    const books = booksResult.data ?? []
    const achievements = buildAchievementBadges(
      statsResult.data,
      bookProgress,
      books,
      publicLeaderboard,
    )
    return {
      id: profileResult.data.id,
      display_name: profileResult.data.display_name,
      avatar_id: profileResult.data.avatar_id,
      avatar_url: profileResult.data.avatar_url,
      current_streak: statsResult.data.current_streak,
      longest_streak: statsResult.data.longest_streak,
      total_xp: statsResult.data.total_xp,
      words_learned: statsResult.data.words_learned,
      words_mastered: statsResult.data.words_mastered,
      book_progress: bookProgress,
      achievements,
      leaderboard: publicLeaderboard,
      mock_tests: publicMockTests,
    }
  }

  async updateProfile(userId: UUID, patch: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile> {
    return toProfile(unwrap(
      await this.client
        .from('profiles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single(),
    ))
  }
}

class SupabaseStatsRepository implements StatsRepository {
  constructor(private readonly client: Client) {}

  async getStats(userId: UUID): Promise<UserStats> {
    const result = await this.client.from('user_stats').select('*').eq('user_id', userId).maybeSingle()
    if (result.error && !isMissingRowError(result.error)) throw new Error(result.error.message)
    return result.data ?? emptyStats(userId)
  }

  async updateStats(userId: UUID, patch: Partial<Omit<UserStats, 'user_id'>>): Promise<UserStats> {
    return unwrap(
      await this.client
        .from('user_stats')
        .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
        .select('*')
        .single(),
    )
  }

  async addXp(userId: UUID, amount: number): Promise<UserStats> {
    const xp = Math.max(0, Math.floor(amount))
    if (xp === 0) return this.getStats(userId)
    const result = await this.client.rpc('record_xp', { p_amount: xp })
    if (result.error) throw new Error(result.error.message)
    return this.getStats(userId)
  }

  async getLeaderboard(mode: LeaderboardMode, userId: UUID, limit = 10): Promise<LeaderboardResult> {
    const result = await this.client.rpc('get_leaderboard', {
      p_mode: mode,
      p_limit: Math.min(Math.max(Math.floor(limit), 1), 50),
    })
    if (result.error) throw new Error(result.error.message)
    const rows = (result.data ?? []) as LeaderboardRpcRow[]
    const period = currentWeekPeriod()
    const entries: LeaderboardEntry[] = rows.map((row) => ({
      rank: row.rank,
      profile: {
        id: row.user_id,
        display_name: row.display_name,
        avatar_id: row.avatar_id,
        avatar_url: row.avatar_url,
      },
      stats: {
        user_id: row.user_id,
        total_xp: row.total_xp,
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        words_learned: row.words_learned,
        words_mastered: row.words_mastered,
        weekly_xp: row.weekly_xp ?? undefined,
      },
    }))
    return {
      mode,
      week_start: rows[0]?.week_start ?? period.start,
      week_end: rows[0]?.week_end ?? period.end,
      entries,
      current_user: entries.find((entry) => entry.profile.id === userId) ?? null,
    }
  }
}

class SupabaseWordProgressRepository implements WordProgressRepository {
  constructor(private readonly client: Client, private readonly levels: LevelRepository, private readonly words: WordRepository, private readonly books: BookRepository, private readonly chapters: ChapterRepository) {}

  async getWordProgress(userId: UUID, wordId: UUID): Promise<UserWordProgress | null> {
    const result = await this.client.from('user_word_progress').select('*').eq('user_id', userId).eq('word_id', wordId).maybeSingle()
    if (result.error && !isMissingRowError(result.error)) throw new Error(result.error.message)
    return result.data ? toProgress(result.data) : null
  }

  async getAllProgress(userId: UUID): Promise<UserWordProgress[]> {
    const rows = unwrap(await this.client.from('user_word_progress').select('*').eq('user_id', userId).order('updated_at', { ascending: false }))
    return rows.map(toProgress)
  }

  async getDueForReview(userId: UUID, now = new Date().toISOString()): Promise<UserWordProgress[]> {
    const result = await this.client
      .from('user_word_progress')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'mastered')
      .not('next_review_at', 'is', null)
      .lte('next_review_at', now)
      .order('next_review_at', { ascending: true })
    return unwrap(result).map(toProgress)
  }

  async countByStatus(userId: UUID): Promise<Record<WordStatus, number>> {
    const rows = await this.getAllProgress(userId)
    const counts: Record<WordStatus, number> = { new: 0, learning: 0, strong: 0, mastered: 0 }
    for (const row of rows) {
      if (row.status in counts) counts[row.status as WordStatus] += 1
    }
    return counts
  }

  async getLevelProgress(userId: UUID, bookId: UUID): Promise<Record<UUID, LevelProgressSummary>> {
    const levels = await this.levels.getLevelsForBook(bookId)
    const levelIds = levels.map((level) => level.id)
    const [wordsResult, progress] = await Promise.all([
      levelIds.length ? this.client.from('words').select('id, level_id').in('level_id', levelIds) : Promise.resolve({ data: [], error: null }),
      this.getAllProgress(userId),
    ])
    if (wordsResult.error) throw new Error(wordsResult.error.message)
    const statusByWord = new Map(progress.map((row) => [row.word_id, row.status]))
    const summary: Record<UUID, LevelProgressSummary> = {}
    for (const level of levels) {
      const levelWords = (wordsResult.data ?? []).filter((word) => word.level_id === level.id)
      summary[level.id] = {
        level_id: level.id,
        total: levelWords.length,
        learned: levelWords.filter((word) => statusByWord.get(word.id) != null && statusByWord.get(word.id) !== 'new').length,
        mastered: levelWords.filter((word) => statusByWord.get(word.id) === 'mastered').length,
      }
    }
    return summary
  }

  async getBookProgress(userId: UUID): Promise<BookProgressSummary[]> {
    const books = await this.books.getBooks()
    const progress = await this.getAllProgress(userId)
    const statusByWord = new Map(progress.map((row) => [row.word_id, row.status]))
    return Promise.all(
      books.map(async (book) => {
        const levels = await this.levels.getLevelsForBook(book.id)
        const levelIds = levels.map((level) => level.id)
        const wordsResult = levelIds.length
          ? await this.client.from('words').select('id').in('level_id', levelIds)
          : { data: [], error: null }
        if (wordsResult.error) throw new Error(wordsResult.error.message)
        const words = wordsResult.data ?? []
        return {
          book_id: book.id,
          total: words.length,
          learned: words.filter((word) => statusByWord.get(word.id) != null && statusByWord.get(word.id) !== 'new').length,
          mastered: words.filter((word) => statusByWord.get(word.id) === 'mastered').length,
        }
      }),
    )
  }

  async getWordsInCompletedLevels(userId: UUID, bookId: UUID): Promise<Word[]> {
    const [levels, progressByLevel] = await Promise.all([
      this.levels.getLevelsForBook(bookId),
      this.getLevelProgress(userId, bookId),
    ])
    const completedLevelIds = levels
      .filter((level) => {
        const progress = progressByLevel[level.id]
        return progress != null && progress.total > 0 && progress.learned >= progress.total
      })
      .map((level) => level.id)

    return this.words.getWordsForLevels(completedLevelIds)
  }

  async updateWordProgress(
    userId: UUID,
    wordId: UUID,
    patch: Partial<Omit<UserWordProgress, 'id' | 'user_id' | 'word_id' | 'created_at'>>,
  ): Promise<UserWordProgress> {
    return toProgress(unwrap(
      await this.client
        .from('user_word_progress')
        .upsert(
          {
            user_id: userId,
            word_id: wordId,
            status: patch.status ?? 'new',
            correct_count: patch.correct_count ?? 0,
            wrong_count: patch.wrong_count ?? 0,
            recall_streak: patch.recall_streak ?? 0,
            next_review_at: patch.next_review_at ?? null,
            last_reviewed_at: patch.last_reviewed_at ?? null,
            updated_at: patch.updated_at ?? new Date().toISOString(),
          },
          { onConflict: 'user_id,word_id' },
        )
        .select('*')
        .single(),
    ))
  }
}

class SupabaseDailyProgressRepository implements DailyProgressRepository {
  constructor(private readonly client: Client) {}

  async getDailyProgress(userId: UUID, date: ISODate): Promise<DailyProgress | null> {
    const result = await this.client.from('daily_progress').select('*').eq('user_id', userId).eq('date', date).maybeSingle()
    if (result.error && !isMissingRowError(result.error)) throw new Error(result.error.message)
    return result.data
  }

  async getRange(userId: UUID, fromDate: ISODate, toDate: ISODate): Promise<DailyProgress[]> {
    return unwrap(
      await this.client
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true }),
    )
  }

  async updateDailyProgress(
    userId: UUID,
    date: ISODate,
    patch: Partial<Omit<DailyProgress, 'id' | 'user_id' | 'date' | 'created_at'>>,
  ): Promise<DailyProgress> {
    const existing = await this.getDailyProgress(userId, date)
    return unwrap(
      await this.client
        .from('daily_progress')
        .upsert(
          {
            ...(existing ?? emptyDaily(userId, date)),
            ...patch,
            id: existing?.id,
            user_id: userId,
            date,
          },
          { onConflict: 'user_id,date' },
        )
        .select('*')
        .single(),
    )
  }
}

class SupabaseMockTestRepository implements MockTestRepository {
  constructor(private readonly client: Client) {}

  async createMockTest(
    userId: UUID,
    input: { total_questions: number; question_ids: UUID[] },
  ): Promise<MockTest> {
    if (input.question_ids.length !== input.total_questions) {
      throw new Error('A mock test must contain exactly the requested number of questions.')
    }

    const testResult = await this.client
      .from('mock_tests')
      .insert({ user_id: userId, total_questions: input.total_questions })
      .select('*')
      .single()
    if (testResult.error) throw new Error(testResult.error.message)
    if (!testResult.data) throw new Error('Supabase returned no mock-test row.')
    const test = testResult.data

    if (input.question_ids.length > 0) {
      const createdAt = Date.now()
      const placeholders = await this.client
        .from('mock_test_answers')
        .insert(input.question_ids.map((questionId, index) => ({
          test_id: test.id,
          question_id: questionId,
          user_answer: null,
          is_correct: false,
          created_at: new Date(createdAt + index).toISOString(),
        })))
      if (placeholders.error) {
        await this.client.from('mock_tests').delete().eq('id', test.id)
        throw new Error(placeholders.error.message)
      }
    }

    return test
  }

  async saveMockAnswer(
    testId: UUID,
    answer: { question_id: UUID; user_answer: string | null; is_correct: boolean },
  ): Promise<MockTestAnswer> {
    const test = await this.client.from('mock_tests').select('time_taken_seconds').eq('id', testId).maybeSingle()
    if (test.error && !isMissingRowError(test.error)) throw new Error(test.error.message)
    if (!test.data) throw new Error('Mock test not found.')
    if (test.data.time_taken_seconds != null) throw new Error('This mock test has already been submitted.')

    const existing = await this.client
      .from('mock_test_answers')
      .select('*')
      .eq('test_id', testId)
      .eq('question_id', answer.question_id)
      .order('created_at', { ascending: false })
      .limit(2)
    if (existing.error) throw new Error(existing.error.message)
    if ((existing.data ?? []).length === 0) {
      throw new Error('This question is not part of the saved mock test.')
    }
    if ((existing.data ?? []).length > 1) {
      throw new Error('This mock test contains duplicate answer records and cannot be changed safely.')
    }

    return unwrap(
      await this.client
        .from('mock_test_answers')
        .update({ user_answer: answer.user_answer, is_correct: answer.is_correct })
        .eq('id', existing.data[0].id)
        .select('*')
        .single(),
    )
  }

  async finalizeMockTest(
    testId: UUID,
    input: { time_taken_seconds: number },
  ): Promise<{ test: MockTest; finalized: boolean }> {
    const current = await this.getMockTest(testId)
    if (!current) throw new Error('Mock test not found.')
    if (current.test.time_taken_seconds != null) return { test: current.test, finalized: false }

    const score = calculateMockTestScore(current.test.total_questions, current.answers)
    const result = await this.client
      .from('mock_tests')
      .update({
        correct_answers: score.correct,
        score: score.percentage,
        time_taken_seconds: Math.max(0, Math.floor(input.time_taken_seconds)),
      })
      .eq('id', testId)
      .is('time_taken_seconds', null)
      .select('*')
      .maybeSingle()

    if (result.error) throw new Error(result.error.message)
    if (result.data) return { test: result.data, finalized: true }

    const afterRace = await this.getMockTest(testId)
    if (afterRace?.test.time_taken_seconds != null) {
      return { test: afterRace.test, finalized: false }
    }
    throw new Error('Mock test could not be finalized.')
  }

  async cancelMockTest(testId: UUID): Promise<void> {
    const answers = await this.client.from('mock_test_answers').delete().eq('test_id', testId)
    if (answers.error) throw new Error(answers.error.message)

    const test = await this.client.from('mock_tests').delete().eq('id', testId).is('time_taken_seconds', null)
    if (test.error) throw new Error(test.error.message)
  }

  async getMockTest(testId: UUID): Promise<{ test: MockTest; answers: MockTestAnswer[] } | null> {
    const [testResult, answersResult] = await Promise.all([
      this.client.from('mock_tests').select('*').eq('id', testId).maybeSingle(),
      this.client.from('mock_test_answers').select('*').eq('test_id', testId).order('created_at', { ascending: true }),
    ])
    if (testResult.error && !isMissingRowError(testResult.error)) throw new Error(testResult.error.message)
    if (answersResult.error) throw new Error(answersResult.error.message)
    if (!testResult.data) return null
    return { test: testResult.data, answers: answersResult.data ?? [] }
  }

  async getMockTestsForUser(userId: UUID): Promise<MockTest[]> {
    return unwrap(await this.client.from('mock_tests').select('*').eq('user_id', userId).order('created_at', { ascending: false }))
  }
}

export function createSupabaseRepositories(client: Client): Repositories {
  const books = new SupabaseBookRepository(client)
  const chapters = new SupabaseChapterRepository(client)
  const levels = new SupabaseLevelRepository(client)
  const words = new SupabaseWordRepository(client)
  const quizzes = new SupabaseQuizRepository(client)
  const savedWords = new SupabaseSavedWordRepository(client)
  const wordProgress = new SupabaseWordProgressRepository(client, levels, words, books, chapters)

  return {
    auth: new SupabaseAuthRepository(client),
    books,
    chapters,
    levels,
    words,
    quizzes,
    profiles: new SupabaseProfileRepository(client),
    stats: new SupabaseStatsRepository(client),
    wordProgress,
    dailyProgress: new SupabaseDailyProgressRepository(client),
    mockTests: new SupabaseMockTestRepository(client),
    savedWords,
  }
}
