export const QUESTION_REPORT_CATEGORIES = [
  'wrong_answer',
  'multiple_correct',
  'broken_question',
  'corrupted_text',
  'wrong_word_options',
  'wrong_explanation',
  'other',
] as const

export type QuestionReportCategory = (typeof QUESTION_REPORT_CATEGORIES)[number]

export const QUESTION_REPORT_STORED_CATEGORIES = [
  ...QUESTION_REPORT_CATEGORIES,
  'faulty_question',
] as const

export type QuestionReportStoredCategory = (typeof QUESTION_REPORT_STORED_CATEGORIES)[number]

export const QUESTION_REPORT_MODES = ['learning', 'review', 'challenge', 'mock_test', 'library'] as const
export type QuestionReportMode = (typeof QUESTION_REPORT_MODES)[number]

export const QUESTION_REPORT_CATEGORY_LABELS: Record<QuestionReportCategory, string> = {
  wrong_answer: 'Wrong answer',
  multiple_correct: 'Multiple correct',
  broken_question: 'Broken question',
  corrupted_text: 'Random Bangla/text',
  wrong_word_options: 'Wrong word/options',
  wrong_explanation: 'Wrong explanation',
  other: 'Other',
}

export function questionReportCategoryLabel(value: QuestionReportStoredCategory) {
  if (value === 'faulty_question') return 'Faulty question'
  return QUESTION_REPORT_CATEGORY_LABELS[value]
}

export function isQuestionReportCategory(value: unknown): value is QuestionReportCategory {
  return typeof value === 'string' && (QUESTION_REPORT_CATEGORIES as readonly string[]).includes(value)
}

export function isQuestionReportStoredCategory(value: unknown): value is QuestionReportStoredCategory {
  return typeof value === 'string' && (QUESTION_REPORT_STORED_CATEGORIES as readonly string[]).includes(value)
}

export function isQuestionReportMode(value: unknown): value is QuestionReportMode {
  return typeof value === 'string' && (QUESTION_REPORT_MODES as readonly string[]).includes(value)
}
