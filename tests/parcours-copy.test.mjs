import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatLessonCompletion, getLessonSuggestionCopy, getUnitToggleLabel, lessonLabel,
} from '../lib/parcours-copy.ts'

test('lesson counts and completion copy agree for zero, one and multiple lessons', () => {
  for (const [count, noun, completed] of [
    [0, 'leçon', 'leçon terminée'],
    [1, 'leçon', 'leçon terminée'],
    [2, 'leçons', 'leçons terminées'],
    [6, 'leçons', 'leçons terminées'],
  ]) {
    assert.equal(lessonLabel(count), noun)
    assert.equal(lessonLabel(count, true), completed)
    for (const total of [3, 6]) {
      assert.equal(formatLessonCompletion(count, total), `${count} ${completed} sur ${total}`)
    }
  }
})

test('unit actions describe both singular/plural content and expanded/collapsed state', () => {
  assert.equal(getUnitToggleLabel(1, false), 'Voir la leçon')
  assert.equal(getUnitToggleLabel(1, true), 'Masquer la leçon')
  assert.equal(getUnitToggleLabel(2, false), 'Voir les leçons')
  assert.equal(getUnitToggleLabel(2, true), 'Masquer les leçons')
})

test('a remembered suggestion never claims to assess the learner', () => {
  const local = { lessonId: 'salutations-02', resumeId: 'salutations-02', wordProgressLessonId: null }
  assert.deepEqual(getLessonSuggestionCopy(local), { heading: 'Votre étape suggérée', detail: null })
  // The existing local preference takes precedence over a matching word recommendation.
  assert.deepEqual(getLessonSuggestionCopy({ ...local, wordProgressLessonId: 'salutations-02' }),
    { heading: 'Votre étape suggérée', detail: null })
})

test('only an explicitly matching word-progress suggestion explains its word-based origin', () => {
  const recommendation = { lessonId: 'salutations-02', resumeId: null, wordProgressLessonId: 'salutations-02' }
  assert.deepEqual(getLessonSuggestionCopy(recommendation),
    { heading: 'Leçon suggérée', detail: 'Selon vos mots vus ou maîtrisés.' })
  for (const wordProgressLessonId of [null, 'another-level-01']) {
    assert.deepEqual(getLessonSuggestionCopy({ ...recommendation, wordProgressLessonId }),
      { heading: 'Votre étape suggérée', detail: null })
  }
  assert.deepEqual(getLessonSuggestionCopy({ lessonId: null, resumeId: null, wordProgressLessonId: null }),
    { heading: 'Votre étape suggérée', detail: null })
})
