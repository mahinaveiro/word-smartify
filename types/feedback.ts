export const FEEDBACK_CATEGORIES = ['suggestion', 'bug', 'question', 'other'] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  suggestion: 'Suggestion',
  bug: 'Bug or problem',
  question: 'Question',
  other: 'Something else',
}

export const FEEDBACK_PAGE_OPTIONS = [
  { value: 'dashboard', label: 'Home' },
  { value: 'learn', label: 'Learn' },
  { value: 'learn-session', label: 'Learning session' },
  { value: 'progress', label: 'Progress' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'library', label: 'Library' },
  { value: 'dictionary', label: 'Dictionary' },
  { value: 'saved-words', label: 'Saved words' },
  { value: 'library-word', label: 'Library word or level' },
  { value: 'mock-tests', label: 'Mock tests' },
  { value: 'mock-test-session', label: 'Mock test session, results, or review' },
  { value: 'profile', label: 'Profile' },
  { value: 'settings', label: 'Settings' },
  { value: 'other-page', label: 'Another page' },
] as const

export type FeedbackPageKey = (typeof FEEDBACK_PAGE_OPTIONS)[number]['value']

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
}

export function feedbackCategoryLabel(category: FeedbackCategory) {
  return FEEDBACK_CATEGORY_LABELS[category]
}

export function isFeedbackPageKey(value: unknown): value is FeedbackPageKey {
  return typeof value === 'string' && FEEDBACK_PAGE_OPTIONS.some((option) => option.value === value)
}

export function feedbackPageLabel(value: FeedbackPageKey) {
  return FEEDBACK_PAGE_OPTIONS.find((option) => option.value === value)?.label ?? value
}
