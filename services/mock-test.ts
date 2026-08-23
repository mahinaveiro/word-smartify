import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import { calculateMockTestScore } from '@/lib/mock-test-scoring'
import { createSeededRandom, prepareQuizQuestion, shuffleArray } from '@/lib/quiz-randomizer'
import { XP } from '@/lib/xp'
import { repositories } from '@/repositories'
import type { MockTest, MockTestAnswer, QuizQuestion, UUID } from '@/types/database'
import type { Repositories } from '@/repositories/interfaces'

export const MOCK_TEST_QUESTION_SECONDS = 45
export const MOCK_TEST_LENGTHS = [10, 20, 50, 100] as const

export interface MockTestAnswerReview {
  question: QuizQuestion
  answer: MockTestAnswer | null
}

export interface MockTestData {
  test: MockTest
  questions: QuizQuestion[]
  answers: MockTestAnswer[]
  answerMap: Record<string, MockTestAnswer>
  correct: number
  incorrect: number
  unanswered: number
  rawScore: number
  earnedXp: number
  mistakes: MockTestAnswerReview[]
}

export async function startMockTest(
  userId: UUID,
  totalQuestions: number,
  repos: Repositories = repositories,
): Promise<MockTest> {
  if (!MOCK_TEST_LENGTHS.includes(totalQuestions as (typeof MOCK_TEST_LENGTHS)[number])) {
    throw new Error('Unsupported mock-test length.')
  }

  const profile = await repos.profiles.getProfile(userId)
  const currentBookId = profile?.current_book_id ?? (await repos.books.getBooks())[0]?.id ?? null
  if (!currentBookId) {
    throw new Error('No vocabulary book is available for mock tests.')
  }

  const words = await repos.wordProgress.getWordsInCompletedLevels(userId, currentBookId)
  const questions = await repos.quizzes.getQuizQuestionsForWords(words.map((word) => word.id))
  const eligibleQuestionIds = [...new Set(questions.map((question) => question.id))]
  if (eligibleQuestionIds.length < totalQuestions) {
    throw new Error(`You need at least ${totalQuestions} questions from fully learned levels to start this test.`)
  }

  const questionIds = shuffleArray(eligibleQuestionIds).slice(0, totalQuestions)
  return repos.mockTests.createMockTest(userId, {
    total_questions: totalQuestions,
    question_ids: questionIds,
  })
}

export async function getMockTestData(
  testId: UUID,
  userId: UUID,
  repos: Repositories = repositories,
): Promise<MockTestData | null> {
  const stored = await repos.mockTests.getMockTest(testId)
  if (!stored || stored.test.user_id !== userId) return null

  const latestAnswers = latestAnswerMap(stored.answers)
  const questionIds = stored.answers.map((answer) => answer.question_id)
  if (questionIds.length !== stored.test.total_questions || new Set(questionIds).size !== questionIds.length) {
    throw new Error('This saved mock test does not contain a complete question set. Start a new test.')
  }

  const loadedQuestions = await repos.quizzes.getQuizQuestionsByIds(questionIds)
  const questionById = new Map(loadedQuestions.map((question) => [question.id, question]))
  const questions = questionIds.map((questionId) => {
    const question = questionById.get(questionId)
    if (!question) throw new Error('One or more saved mock-test questions are no longer available.')
    return prepareQuizQuestion(question, createSeededRandom(`${testId}:${questionId}`))
  })

  const answers = questionIds
    .map((questionId) => latestAnswers[questionId])
    .filter((answer): answer is MockTestAnswer => answer != null)
  const score = calculateMockTestScore(stored.test.total_questions, answers)
  const mistakes = questions
    .filter((question) => {
      const answer = latestAnswers[question.id]
      return answer?.user_answer != null && !answer.is_correct
    })
    .map((question) => ({ question, answer: latestAnswers[question.id] ?? null }))

  return {
    test: stored.test,
    questions,
    answers,
    answerMap: latestAnswers,
    correct: score.correct,
    incorrect: score.incorrect,
    unanswered: score.unanswered,
    rawScore: score.rawScore,
    earnedXp: stored.test.time_taken_seconds == null ? 0 : stored.test.correct_answers * XP.CORRECT_QUIZ,
    mistakes,
  }
}

export async function saveMockTestAnswer(
  testId: UUID,
  event: QuizAnswerEvent,
  repos: Repositories = repositories,
): Promise<MockTestAnswer> {
  const question = await repos.quizzes.getQuestion(event.questionId)
  if (!question) throw new Error('Question not found.')
  if (question.word_id !== event.wordId) throw new Error('Question does not belong to this word.')
  return repos.mockTests.saveMockAnswer(testId, {
    question_id: event.questionId,
    user_answer: event.selectedAnswer,
    is_correct: event.selectedAnswer === question.correct_answer,
  })
}

export async function cancelMockTest(testId: UUID, userId: UUID, repos: Repositories = repositories): Promise<void> {
  const current = await repos.mockTests.getMockTest(testId)
  if (!current || current.test.user_id !== userId || current.test.time_taken_seconds != null) return
  await repos.mockTests.cancelMockTest(testId)
}

export async function finalizeMockTest(
  testId: UUID,
  timeTakenSeconds: number,
  userId: UUID,
  repos: Repositories = repositories,
): Promise<{ test: MockTest; earnedXp: number }> {
  const stored = await repos.mockTests.getMockTest(testId)
  if (!stored || stored.test.user_id !== userId) {
    throw new Error('Mock test not found')
  }
  if (stored.test.time_taken_seconds != null) {
    return { test: stored.test, earnedXp: 0 }
  }

  const questionIds = [...new Set(stored.answers.map((answer) => answer.question_id))]
  if (questionIds.length !== stored.test.total_questions || stored.answers.length !== stored.test.total_questions) {
    throw new Error('This mock test does not contain a complete unique question set.')
  }
  const questions = await repos.quizzes.getQuizQuestionsByIds(questionIds)
  const questionById = new Map(questions.map((question) => [question.id, question]))
  const canonicalAnswers = stored.answers.map((answer) => {
    const question = questionById.get(answer.question_id)
    if (!question) throw new Error('One or more mock-test questions are unavailable.')
    return { ...answer, is_correct: answer.user_answer != null && answer.user_answer === question.correct_answer }
  })
  const score = calculateMockTestScore(stored.test.total_questions, canonicalAnswers)
  const result = await repos.mockTests.finalizeMockTest(testId, {
    time_taken_seconds: timeTakenSeconds,
  }, userId)
  if (!result.finalized) return { test: result.test, earnedXp: 0 }

  if (score.correct !== result.test.correct_answers) {
    throw new Error('Mock-test score changed during finalization. Please retry.')
  }
  const earnedXp = score.correct * XP.CORRECT_QUIZ
  if (earnedXp > 0) {
    await repos.stats.addXp(userId, earnedXp)
  }
  return { test: result.test, earnedXp }
}

function latestAnswerMap(answers: MockTestAnswer[]): Record<string, MockTestAnswer> {
  return answers.reduce<Record<string, MockTestAnswer>>((result, answer) => {
    const previous = result[answer.question_id]
    if (!previous || answer.created_at >= previous.created_at) {
      result[answer.question_id] = answer
    }
    return result
  }, {})
}
