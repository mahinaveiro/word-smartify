export interface QuestionWithType {
  question_type: string
}

/**
 * Analogy items are valid elsewhere in the app, but are intentionally kept
 * out of the guided learning block. Prefix matching covers the live
 * `analogy_mcq` type and any future analogy variants without altering stored
 * question data.
 */
export function isAnalogyQuestion(question: QuestionWithType): boolean {
  return question.question_type.trim().toLowerCase().startsWith('analogy')
}

export function filterLearningQuestions<T extends QuestionWithType>(
  questions: readonly T[],
): T[] {
  return questions.filter((question) => !isAnalogyQuestion(question))
}
