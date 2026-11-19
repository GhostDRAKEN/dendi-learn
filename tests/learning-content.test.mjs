import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import {
  buildCurriculum, flattenLessons, getLearningLesson, getLearningWords,
  getLessonStatus, getRecommendedLesson, hasLinguisticValue,
} from '../lib/curriculum.ts'

// Match Next's extensionless local imports when testing TypeScript with Node.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './curriculum' && context.parentURL?.endsWith('/lib/lesson-exercises.ts')) {
    return nextResolve('./curriculum.ts', context)
  }
  return nextResolve(specifier, context)
} })
const { createLessonExercises } = await import('../lib/lesson-exercises.ts')
const fixture = (id, extra = {}) => ({ id, fr: `FR ${id}`, dendi: `Dendi ɛ ${id}`, phonetique: `Ph ${id}`, categorie: 'Salutations', niveau: 'debutant', ...extra })
const lesson = (mots) => ({ id: 'debutant-salutations-02', title: 'Salutations 2', niveau: 'debutant', unitId: 'debutant-salutations', unitTitle: 'Salutations', index: 2, totalInUnit: 3, mots })

test('essential blanks and N/A are excluded without rewriting valid linguistic fields', () => {
  const valid = fixture(1, { fr: ' Bonjour ', dendi: 'Litɛni', phonetique: '' })
  const source = [valid, fixture(10, { dendi: 'N/A' }), fixture(2, { fr: ' N/A ' }), fixture(3, { fr: '' }), fixture(4, { dendi: '  ' }), fixture(5, { fr: null })]
  const snapshot = JSON.stringify(source)
  assert.deepEqual(getLearningWords(source), [valid])
  assert.equal(getLearningWords(source)[0], valid)
  assert.equal(JSON.stringify(source), snapshot)
  assert.equal(hasLinguisticValue('N/A'), false)
  assert.equal(hasLinguisticValue(undefined), false)
  assert.equal(hasLinguisticValue('N/A — à vérifier'), false)
  assert.equal(hasLinguisticValue('organisation/administration'), true)
})

test('filtering preserves the original distribution, lesson IDs and valid word order', () => {
  const source = Array.from({ length: 19 }, (_, i) => fixture(i + 1))
  const original = flattenLessons(buildCurriculum(source))
  source[9] = fixture(10, { fr: 'De rien', dendi: 'N/A', phonetique: 'N/A' })
  const filtered = flattenLessons(buildCurriculum(source))
  assert.deepEqual(filtered.map(l => l.id), original.map(l => l.id))
  assert.deepEqual(filtered.map(l => l.mots.map(m => m.id)), original.map(l => l.mots.filter(m => m.id !== 10).map(m => m.id)))
  assert.equal(filtered[1].mots.length, 5)
  assert.equal(filtered.reduce((count, l) => count + l.mots.length, 0), 18)
  assert.equal(source[9].dendi, 'N/A')
})

test('invalid entries never become prompts, expected answers, distractors or review candidates', () => {
  const available = getLearningLesson(lesson([fixture(8), fixture(9), fixture(10, { dendi: 'N/A', phonetique: 'N/A' }), fixture(11), fixture(12), fixture(13)]))
  const exercises = createLessonExercises(available)
  assert.equal(available.mots.length, 5)
  assert.equal(exercises.test.length, 5)
  for (const exercise of [...exercises.practice, ...exercises.test]) {
    assert.notEqual(exercise.mot.id, 10)
    assert.notEqual(exercise.prompt, 'N/A')
    assert.notEqual(exercise.correctAnswer, 'N/A')
    assert.ok(!exercise.options.includes('N/A'))
  }
  const errors = exercises.test.map(q => q.mot.id)
  assert.equal(available.mots.filter(m => errors.includes(m.id)).some(m => m.id === 10), false)
})

test('missing phonetics do not exclude a valid word or create a phonetic question', () => {
  const exercises = createLessonExercises(lesson([fixture(1), fixture(2), fixture(3, { phonetique: 'N/A' })]))
  const question = exercises.test.find(q => q.mot.id === 3)
  assert.equal(question.type, 'dendi-fr')
  assert.equal(question.prompt, 'Dendi ɛ 3')
})

test('empty lessons produce no exercises, no false mastery and no recommendation', () => {
  const curriculum = buildCurriculum([fixture(10, { dendi: 'N/A' })])
  const empty = flattenLessons(curriculum)[0]
  assert.equal(empty.id, 'debutant-salutations-01')
  assert.deepEqual(createLessonExercises(empty), { practice: [], test: [] })
  assert.equal(getLessonStatus(empty, []), 'a-decouvrir')
  assert.equal(getRecommendedLesson(curriculum, 'debutant', []), null)
})
