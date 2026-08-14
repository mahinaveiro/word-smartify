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
} from './interfaces'
import { SupabaseAuthRepository } from './supabase-auth'
import { isMissingRowError } from '@/lib/supabase/errors'

type Client = SupabaseClient<Database>
type QuizRow = Database['public']['Tables']['quiz_questions']['Row']
type WordRow = Database['public']['Tables']['words']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProgressRow = Database['public']['Tables']['user_word_progress']['Row']

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
    const rows = unwrap(
      await this.client
        .from('words')
        .select('*')
        .eq('level_id', levelId)
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
}

class SupabaseQuizRepository implements QuizRepository {
  constructor(private readonly client: Client) {}

  async getQuizQuestions(wordId: UUID): Promise<QuizQuestion[]> {
    const rows = unwrap(
      await this.client
        .from('quiz_questions')
        .select('*')
        .eq('word_id', wordId)
        .order('created_at', { ascending: true }),
    )
    return rows.map(toQuizQuestion)
  }

  async getRandomQuestions(count: number): Promise<QuizQuestion[]> {
    if (count <= 0) return []
    const head = await this.client.from('quiz_questions').select('id', { count: 'exact', head: true })
    if (head.error) throw new Error(head.error.message)
    const total = head.count ?? 0
    if (!total) return []
    const maxStart = Math.max(0, total - count)
    const start = Math.floor(Math.random() * (maxStart + 1))
    const rows = unwrap(
      await this.client
        .from('quiz_questions')
        .select('*')
        .range(start, start + count - 1),
    )
    return rows.map(toQuizQuestion)
  }

  async getQuestion(id: UUID): Promise<QuizQuestion | null> {
    const result = await this.client.from('quiz_questions').select('*').eq('id', id).maybeSingle()
    if (result.error) throw new Error(result.error.message)
    return result.data ? toQuizQuestion(result.data) : null
  }
}

class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: Client, private readonly wordProgress: WordProgressRepository) {}

  async getProfile(userId: UUID): Promise<Profile | null> {
    const result = await this.client.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (result.error && !isMissingRowError(result.error)) throw new Error(result.error.message)
    return result.data ? toProfile(result.data) : null
  }

  async getPublicProfile(userId: UUID): Promise<PublicProfile | null> {
    const [profileResult, statsResult] = await Promise.all([
      this.client.from('profiles').select('id, display_name, avatar_id').eq('id', userId).maybeSingle(),
      this.client
        .from('user_stats')
        .select('user_id, total_xp, current_streak, longest_streak, words_learned, words_mastered')
        .eq('user_id', userId)
        .maybeSingle(),
    ])
    if (profileResult.error && !isMissingRowError(profileResult.error)) throw new Error(profileResult.error.message)
    if (statsResult.error && !isMissingRowError(statsResult.error)) throw new Error(statsResult.error.message)
    if (!profileResult.data || !statsResult.data) return null
    return {
      id: profileResult.data.id,
      display_name: profileResult.data.display_name,
      avatar_id: profileResult.data.avatar_id,
      current_streak: statsResult.data.current_streak,
      longest_streak: statsResult.data.longest_streak,
      total_xp: statsResult.data.total_xp,
      words_learned: statsResult.data.words_learned,
      words_mastered: statsResult.data.words_mastered,
      book_progress: await this.wordProgress.getBookProgress(userId),
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
    const current = await this.getStats(userId)
    return this.updateStats(userId, {
      total_xp: current.total_xp + Math.max(0, amount),
      last_activity_at: new Date().toISOString(),
    })
  }

  async getLeaderboard(limit = 10): Promise<Array<{ rank: number; profile: LeaderboardProfile; stats: LeaderboardStats }>> {
    const [profilesResult, statsResult] = await Promise.all([
      this.client.from('profiles').select('id, display_name, avatar_id'),
      this.client.from('user_stats').select('user_id, total_xp, current_streak, longest_streak, words_learned, words_mastered'),
    ])
    if (profilesResult.error) throw new Error(profilesResult.error.message)
    if (statsResult.error) throw new Error(statsResult.error.message)
    const statsByUser = new Map((statsResult.data ?? []).map((stats) => [stats.user_id, stats]))
    return (profilesResult.data ?? [])
      .map((profile) => {
        const stats = statsByUser.get(profile.id)
        return stats ? { profile, stats } : null
      })
      .filter((row): row is { profile: LeaderboardProfile; stats: LeaderboardStats } => row != null)
      .sort((a, b) => b.stats.total_xp - a.stats.total_xp || a.profile.display_name.localeCompare(b.profile.display_name))
      .slice(0, limit)
      .map((row, index) => ({ ...row, rank: index + 1 }))
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

  async createMockTest(userId: UUID, input: { total_questions: number }): Promise<MockTest> {
    return unwrap(
      await this.client
        .from('mock_tests')
        .insert({ user_id: userId, total_questions: input.total_questions })
        .select('*')
        .single(),
    )
  }

  async saveMockAnswer(
    testId: UUID,
    answer: { question_id: UUID; user_answer: string | null; is_correct: boolean },
  ): Promise<MockTestAnswer> {
    const existing = await this.client
      .from('mock_test_answers')
      .select('*')
      .eq('test_id', testId)
      .eq('question_id', answer.question_id)
      .maybeSingle()
    if (existing.error && !isMissingRowError(existing.error)) throw new Error(existing.error.message)
    if (existing.data) {
      return unwrap(
        await this.client
          .from('mock_test_answers')
          .update({ user_answer: answer.user_answer, is_correct: answer.is_correct })
          .eq('id', existing.data.id)
          .select('*')
          .single(),
      )
    }
    return unwrap(
      await this.client
        .from('mock_test_answers')
        .insert({ test_id: testId, question_id: answer.question_id, user_answer: answer.user_answer, is_correct: answer.is_correct })
        .select('*')
        .single(),
    )
  }

  async finalizeMockTest(testId: UUID, input: { time_taken_seconds: number }): Promise<MockTest> {
    const current = await this.getMockTest(testId)
    if (!current) throw new Error('Mock test not found.')
    const latest = new Map<string, MockTestAnswer>()
    for (const answer of current.answers) {
      const previous = latest.get(answer.question_id)
      if (!previous || answer.created_at >= previous.created_at) latest.set(answer.question_id, answer)
    }
    const correct = [...latest.values()].filter((answer) => answer.is_correct).length
    return unwrap(
      await this.client
        .from('mock_tests')
        .update({
          correct_answers: correct,
          score: current.test.total_questions > 0 ? Math.round((correct / current.test.total_questions) * 100) : 0,
          time_taken_seconds: input.time_taken_seconds,
        })
        .eq('id', testId)
        .select('*')
        .single(),
    )
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
  const wordProgress = new SupabaseWordProgressRepository(client, levels, words, books, chapters)

  return {
    auth: new SupabaseAuthRepository(client),
    books,
    chapters,
    levels,
    words,
    quizzes,
    profiles: new SupabaseProfileRepository(client, wordProgress),
    stats: new SupabaseStatsRepository(client),
    wordProgress,
    dailyProgress: new SupabaseDailyProgressRepository(client),
    mockTests: new SupabaseMockTestRepository(client),
  }
}
