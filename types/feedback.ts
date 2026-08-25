export const FEEDBACK_CATEGORIES = ['suggestion', 'bug', 'question', 'other'] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  suggestion: 'Suggestion',
  bug: 'Bug or problem',
  question: 'Question',
  other: 'Something else',
}

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
}

export function feedbackCategoryLabel(category: FeedbackCategory) {
  return FEEDBACK_CATEGORY_LABELS[category]
}
