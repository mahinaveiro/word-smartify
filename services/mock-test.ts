import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import { XP } from '@/lib/xp'
import { repositories, getActiveUserId } from '@/repositories'
import type { MockTest, MockTestAnswer, QuizQuestion, UUID } from '@/types/database'

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
  earnedXp: number
  mistakes: MockTestAnswerReview[]
}

/** Stable numeric seed used to reconstruct a test's questions from its id. */
export function mockTestSeed(testId: string): number {
  let hash = 2166136261
  for (let index = 0; index < testId.length; index += 1) {
    hash = Math.imul(hash ^ testId.charCodeAt(index), 16777619)
  }
  return (hash >>> 0) || 1
}

export async function startMockTest(userId: UUID, totalQuestions: number): Promise<MockTest> {
  return repositories.mockTests.createMockTest(userId, { total_questions: totalQuestions })
}

export async function getMockTestData(
  testId: UUID,
  userId = getActiveUserId(),
): Promise<MockTestData | null> {
  const stored = await repositories.mockTests.getMockTest(testId)
  if (!stored || stored.test.user_id !== userId) return null

  const questions = await repositories.quizzes.getRandomQuestions(
    stored.test.total_questions,
    mockTestSeed(stored.test.id),
  )
  const answerMap = latestAnswerMap(stored.answers)
  const answers = Object.values(answerMap)
  const correct = stored.test.time_taken_seconds == null
    ? answers.filter((answer) => answer.is_correct).length
    : stored.test.correct_answers
  const unanswered = Math.max(0, stored.test.total_questions - answers.length)
  const incorrect = Math.max(0, answers.length - correct)
  const mistakes = questions
    .filter((question) => {
      const answer = answerMap[question.id]
      return !answer || !answer.is_correct
    })
    .map((question) => ({ question, answer: answerMap[question.id] ?? null }))

  return {
    test: stored.test,
    questions,
    answers,
    answerMap,
    correct,
    incorrect,
    unanswered,
    earnedXp: stored.test.correct_answers * XP.CORRECT_QUIZ,
    mistakes,
  }
}

export async function saveMockTestAnswer(
  testId: UUID,
  event: QuizAnswerEvent,
): Promise<MockTestAnswer> {
  return repositories.mockTests.saveMockAnswer(testId, {
    question_id: event.questionId,
    user_answer: event.selectedAnswer,
    is_correct: event.isCorrect,
  })
}

export async function finalizeMockTest(
  testId: UUID,
  timeTakenSeconds: number,
  userId = getActiveUserId(),
): Promise<{ test: MockTest; earnedXp: number }> {
  const stored = await repositories.mockTests.getMockTest(testId)
  if (!stored || stored.test.user_id !== userId) {
    throw new Error('Mock test not found')
  }
  if (stored.test.time_taken_seconds != null) {
    return {
      test: stored.test,
      earnedXp: stored.test.correct_answers * XP.CORRECT_QUIZ,
    }
  }

  const test = await repositories.mockTests.finalizeMockTest(testId, {
    time_taken_seconds: timeTakenSeconds,
  })
  const earnedXp = test.correct_answers * XP.CORRECT_QUIZ
  if (earnedXp > 0) {
    await repositories.stats.addXp(userId, earnedXp)
  }
  return { test, earnedXp }
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
