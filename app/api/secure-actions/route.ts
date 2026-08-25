import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminRepositories } from '@/lib/supabase/admin'
import {
  completeDailyChallenge,
  finalizeSession,
  recordQuizAnswer,
} from '@/services/daily-loop'
import {
  cancelMockTest,
  finalizeMockTest,
  saveMockTestAnswer,
  startMockTest,
} from '@/services/mock-test'
import type { QuizMode } from '@/lib/xp'
import type { UUID } from '@/types/database'

const QUIZ_MODES: readonly QuizMode[] = ['learning', 'review', 'challenge']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200) {
    throw new Error(`Invalid ${field}.`)
  }
  return value
}

function requiredUuid(value: unknown, field: string): UUID {
  return requiredString(value, field) as UUID
}

function requiredNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 86400) {
    throw new Error(`Invalid ${field}.`)
  }
  return value
}

function quizMode(value: unknown): QuizMode {
  if (typeof value !== 'string' || !QUIZ_MODES.includes(value as QuizMode)) {
    throw new Error('Invalid quiz mode.')
  }
  return value as QuizMode
}

function answerEvent(body: Record<string, unknown>): { questionId: UUID; wordId: UUID; selectedAnswer: string } {
  const questionId = requiredUuid(body.questionId, 'questionId')
  const wordId = requiredUuid(body.wordId, 'wordId')
  const selectedAnswer = requiredString(body.selectedAnswer, 'selectedAnswer')
  return { questionId, wordId, selectedAnswer }
}

function mockAnswerEvent(body: Record<string, unknown>): { questionId: UUID; wordId: UUID; selectedAnswer: string | null } {
  const questionId = requiredUuid(body.questionId, 'questionId')
  const wordId = requiredUuid(body.wordId, 'wordId')
  if (body.selectedAnswer === null) return { questionId, wordId, selectedAnswer: null }
  const selectedAnswer = requiredString(body.selectedAnswer, 'selectedAnswer')
  return { questionId, wordId, selectedAnswer }
}

async function authenticatedUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Unauthorized')
  return data.user
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser()
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) throw new Error('Invalid request.')
    const action = requiredString(parsed.action, 'action')
    const repos = createAdminRepositories()

    switch (action) {
      case 'quiz-answer': {
        const input = answerEvent(parsed)
        const mode = quizMode(parsed.mode ?? 'learning')
        const question = await repos.quizzes.getQuestion(input.questionId)
        if (!question || question.word_id !== input.wordId) throw new Error('Question not found.')
        if (question.options && !question.options.includes(input.selectedAnswer)) {
          throw new Error('Selected answer is not a valid option for this question.')
        }
        return NextResponse.json(await recordQuizAnswer(
          user.id,
          input.wordId,
          input.selectedAnswer === question.correct_answer,
          mode,
          Date.now(),
          repos,
        ))
      }
      case 'finalize-session':
        return NextResponse.json(await finalizeSession(user.id, undefined, repos))
      case 'complete-daily-challenge': {
        if (!Array.isArray(parsed.answeredWordIds) || parsed.answeredWordIds.length > 100) {
          throw new Error('Invalid challenge answers.')
        }
        const answeredWordIds = parsed.answeredWordIds.map((wordId) => requiredUuid(wordId, 'answeredWordId'))
        return NextResponse.json(await completeDailyChallenge(user.id, answeredWordIds, undefined, repos))
      }
      case 'add-to-review': {
        const wordId = requiredUuid(parsed.wordId, 'wordId')
        const now = new Date().toISOString()
        const progress = await repos.wordProgress.updateWordProgress(user.id, wordId, {
          status: 'learning',
          next_review_at: now,
        })
        return NextResponse.json(progress)
      }
      case 'start-mock-test': {
        if (typeof parsed.totalQuestions !== 'number' || !Number.isInteger(parsed.totalQuestions)) {
          throw new Error('Invalid mock-test length.')
        }
        return NextResponse.json(await startMockTest(user.id, parsed.totalQuestions, repos))
      }
      case 'save-mock-answer': {
        const testId = requiredUuid(parsed.testId, 'testId')
        const current = await repos.mockTests.getMockTest(testId)
        if (!current || current.test.user_id !== user.id) throw new Error('Mock test not found.')
        if (!isRecord(parsed.event)) throw new Error('Invalid mock-test answer.')
        const input = mockAnswerEvent(parsed.event)
        const question = await repos.quizzes.getQuestion(input.questionId)
        if (!question || question.word_id !== input.wordId) throw new Error('Question not found.')
        if (input.selectedAnswer !== null && question.options && !question.options.includes(input.selectedAnswer)) {
          throw new Error('Selected answer is not a valid option for this question.')
        }
        return NextResponse.json(await saveMockTestAnswer(testId, input, repos))
      }
      case 'cancel-mock-test':
        await cancelMockTest(requiredUuid(parsed.testId, 'testId'), user.id, repos)
        return NextResponse.json({ ok: true })
      case 'finalize-mock-test': {
        const testId = requiredUuid(parsed.testId, 'testId')
        const timeTakenSeconds = requiredNonNegativeInteger(parsed.timeTakenSeconds, 'timeTakenSeconds')
        return NextResponse.json(await finalizeMockTest(testId, timeTakenSeconds, user.id, repos))
      }
      default:
        throw new Error('Unknown secure action.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The action could not be completed.'
    const status = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
