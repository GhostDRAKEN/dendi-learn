import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLearningWords } from '../lib/curriculum.ts'
import { explorerHref, getExplorerThemes, getExplorerTimeThemes, resolveExplorerTheme, wordsInExplorerTheme } from '../lib/explorer-themes.ts'

const word = (id, categorie, dendi = 'fixture') => ({ id, categorie, dendi, fr: 'fixture' })

test('counts reflect the eligible vocabulary in this level and keep source order', () => {
  const words = getLearningWords([
    word(9, 'temps__semaine'), word(4, 'Salutations'), word(10, 'Salutations', 'N/A'),
    word(1, 'temps__journee'), word(7, 'couleurs'), word(8, 'temps__semaine'),
  ])
  assert.deepEqual(getExplorerThemes(words).map(({ id, count }) => [id, count]), [
    ['Salutations', 1], ['temps', 3], ['couleurs', 1],
  ])
  assert.deepEqual(wordsInExplorerTheme(words, 'temps').map(item => item.id), [9, 1, 8])
  assert.deepEqual(getExplorerTimeThemes(words).map(({ id, count }) => [id, count]), [
    ['temps__journee', 1], ['temps__semaine', 2],
  ])
})

test('deep links require an available theme and keep a validated level when provided', () => {
  const words = [word(1, 'couleurs'), word(2, 'temps__semaine')]
  for (const value of ['Tous', 'salutations', 'temps__mois', 'constructor', ['couleurs'], '', undefined]) {
    assert.equal(resolveExplorerTheme(value, words), undefined)
  }
  assert.equal(resolveExplorerTheme('temps', words), 'temps')
  assert.equal(resolveExplorerTheme('temps__semaine', words), 'temps__semaine')
  assert.equal(explorerHref('debutant', 'couleurs'), '/apprendre?niveau=debutant&categorie=couleurs')
  assert.equal(explorerHref('debutant'), '/apprendre?niveau=debutant')
  assert.equal(explorerHref(), '/apprendre')
})
