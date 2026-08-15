import type { QuizAnswerEvent } from '@/lib/quiz-engine'
import { calculateMockTestScore } from '@/lib/mock-test-scoring'
import { prepareQuizQuestion, shuffleArray } from '@/lib/quiz-randomizer'
import { XP } from '@/lib/xp'
import { repositories } from '@/repositories'
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
  rawScore: number
  earnedXp: number
  mistakes: MockTestAnswerReview[]
}

export async function startMockTest(userId: UUID, totalQuestions: number): Promise<MockTest> {
  if (!MOCK_TEST_LENGTHS.includes(totalQuestions as (typeof MOCK_TEST_LENGTHS)[number])) {
    throw new Error('Unsupported mock-test length.')
  }

  const profile = await repositories.profiles.getProfile(userId)
  const currentBookId = profile?.current_book_id ?? (await repositories.books.getBooks())[0]?.id ?? null
  if (!currentBookId) {
    throw new Error('No vocabulary book is available for mock tests.')
  }

  const words = await repositories.wordProgress.getWordsInCompletedLevels(userId, currentBookId)
  const questions = await repositories.quizzes.getQuizQuestionsForWords(words.map((word) => word.id))
  const eligibleQuestionIds = [...new Set(questions.map((question) => question.id))]
  if (eligibleQuestionIds.length < totalQuestions) {
    throw new Error(`You need at least ${totalQuestions} questions from fully learned levels to start this test.`)
  }

  const questionIds = shuffleArray(eligibleQuestionIds).slice(0, totalQuestions)
  return repositories.mockTests.createMockTest(userId, {
    total_questions: totalQuestions,
    question_ids: questionIds,
  })
}

export async function getMockTestData(
  testId: UUID,
  userId: UUID,
): Promise<MockTestData | null> {
  const stored = await repositories.mockTests.getMockTest(testId)
  if (!stored || stored.test.user_id !== userId) return null

  const latestAnswers = latestAnswerMap(stored.answers)
  const questionIds = stored.answers.map((answer) => answer.question_id)
  if (questionIds.length !== stored.test.total_questions || new Set(questionIds).size !== questionIds.length) {
    throw new Error('This saved mock test does not contain a complete question set. Start a new test.')
  }

  const questions = (await repositories.quizzes.getQuizQuestionsByIds(questionIds)).map((question) => prepareQuizQuestion(question))
  if (questions.length !== questionIds.length) {
    throw new Error('One or more saved mock-test questions are no longer available.')
  }

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
  userId: UUID,
): Promise<{ test: MockTest; earnedXp: number }> {
  const stored = await repositories.mockTests.getMockTest(testId)
  if (!stored || stored.test.user_id !== userId) {
    throw new Error('Mock test not found')
  }
  if (stored.test.time_taken_seconds != null) {
    return { test: stored.test, earnedXp: 0 }
  }

  const result = await repositories.mockTests.finalizeMockTest(testId, {
    time_taken_seconds: timeTakenSeconds,
  })
  const earnedXp = result.finalized ? result.test.correct_answers * XP.CORRECT_QUIZ : 0
  if (result.finalized && earnedXp > 0) {
    await repositories.stats.addXp(userId, earnedXp)
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
