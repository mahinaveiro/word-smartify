export const QUESTION_REPORT_CATEGORIES = ['wrong_answer', 'faulty_question', 'other'] as const
export type QuestionReportCategory = (typeof QUESTION_REPORT_CATEGORIES)[number]

export const QUESTION_REPORT_MODES = ['learning', 'review', 'challenge', 'mock_test', 'library'] as const
export type QuestionReportMode = (typeof QUESTION_REPORT_MODES)[number]

export const QUESTION_REPORT_CATEGORY_LABELS: Record<QuestionReportCategory, string> = {
  wrong_answer: 'Wrong answer',
  faulty_question: 'Faulty question',
  other: 'Other',
}

export function isQuestionReportCategory(value: unknown): value is QuestionReportCategory {
  return typeof value === 'string' && (QUESTION_REPORT_CATEGORIES as readonly string[]).includes(value)
}

export function isQuestionReportMode(value: unknown): value is QuestionReportMode {
  return typeof value === 'string' && (QUESTION_REPORT_MODES as readonly string[]).includes(value)
}
