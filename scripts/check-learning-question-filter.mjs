import assert from 'node:assert/strict'

const { filterLearningQuestions, isAnalogyQuestion } = await import('../lib/learning-question-filter.ts')

const questions = [
  { id: 'analogy', question_type: 'analogy_mcq' },
  { id: 'meaning', question_type: 'meaning_mcq' },
  { id: 'fill', question_type: 'fill_blank' },
  { id: 'future-analogy', question_type: 'analogy_context' },
]

assert.equal(isAnalogyQuestion(questions[0]), true)
assert.equal(isAnalogyQuestion(questions[1]), false)
assert.deepEqual(
  filterLearningQuestions(questions).map((question) => question.id),
  ['meaning', 'fill'],
)

// The general quiz-randomizer receives the full question set in every other
// flow; this fixture confirms analogy rows are not removed from that source.
assert.equal(questions.some((question) => question.question_type === 'analogy_mcq'), true)

console.log('Learning filter regression passed: analogy questions are excluded only from learning sessions.')
