import type { MockTestAnswer } from '@/types/database'

export const MOCK_TEST_WRONG_ANSWER_PENALTY = 0.25

export interface MockTestScore {
  correct: number
  incorrect: number
  unanswered: number
  rawScore: number
  percentage: number
}

export function calculateMockTestScore(
  totalQuestions: number,
  answers: readonly MockTestAnswer[],
): MockTestScore {
  const answered = answers.filter((answer) => answer.user_answer != null)
  const correct = answered.filter((answer) => answer.is_correct).length
  const incorrect = answered.length - correct
  const unanswered = Math.max(0, totalQuestions - answered.length)
  const rawScore = correct - incorrect * MOCK_TEST_WRONG_ANSWER_PENALTY
  const percentage = totalQuestions > 0
    ? Math.max(0, Math.min(100, Math.round((rawScore / totalQuestions) * 100)))
    : 0

  return { correct, incorrect, unanswered, rawScore, percentage }
}
