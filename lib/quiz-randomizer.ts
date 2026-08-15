import type { QuizQuestion, UUID, Word } from '@/types/database'

export interface QuizCard {
  word: Word
  question: QuizQuestion
}

/**
 * Fisher-Yates shuffle. The optional random source keeps the helper easy to
 * test while production callers use Math.random for a fresh session.
 */
export function shuffleArray<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export function selectRandomQuestion(
  questions: readonly QuizQuestion[],
  random: () => number = Math.random,
): QuizQuestion | null {
  if (questions.length === 0) return null
  return questions[Math.floor(random() * questions.length)] ?? null
}

/**
 * Returns a new question object whose options are shuffled only for display.
 * The stored row and its correct_answer value are never mutated.
 */
export function prepareQuizQuestion(
  question: QuizQuestion,
  random: () => number = Math.random,
): QuizQuestion {
  if (!question.options || question.options.length <= 1) return question

  const options = [...new Set([...question.options, question.correct_answer])]
  return {
    ...question,
    options: shuffleArray(options, random),
  }
}

export function selectPreparedQuestion(
  questions: readonly QuizQuestion[],
  context: string,
  random: () => number = Math.random,
): QuizQuestion {
  const question = selectRandomQuestion(questions, random)
  if (!question) throw new Error(`No quiz question available for ${context}.`)
  return prepareQuizQuestion(question, random)
}

export function selectQuestionForWord(
  wordId: UUID,
  questionsByWord: ReadonlyMap<UUID, readonly QuizQuestion[]>,
  random: () => number = Math.random,
): QuizQuestion {
  return selectPreparedQuestion(questionsByWord.get(wordId) ?? [], `word ${wordId}`, random)
}

export function createRandomizedQuizCards(
  words: readonly Word[],
  questionsByWord: ReadonlyMap<UUID, readonly QuizQuestion[]>,
  random: () => number = Math.random,
): QuizCard[] {
  const cards = words.map((word) => ({
    word,
    question: selectQuestionForWord(word.id, questionsByWord, random),
  }))
  return shuffleArray(cards, random)
}
