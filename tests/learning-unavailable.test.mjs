import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, createRequire } from 'node:module'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Render the real empty-state component locally. No browser client can reach Supabase.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:9'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'DEV-ONLY-unavailable-lesson-test'
const root = new URL('../', import.meta.url), require = createRequire(import.meta.url)
const nextLinkURL = pathToFileURL(require.resolve('next/link')).href
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/') || specifier.startsWith('./') || specifier.startsWith('../')) {
      const url = specifier.startsWith('@/') ? new URL(specifier.slice(2), root) : new URL(specifier, context.parentURL)
      for (const suffix of ['', '.ts', '.tsx']) {
        const candidate = pathToFileURL(fileURLToPath(url) + suffix)
        if (existsSync(candidate) && statSync(candidate).isFile()) return { url: candidate.href, shortCircuit: true }
      }
    }
    if (specifier === 'next/link') return { url: nextLinkURL, shortCircuit: true }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === new URL('lib/pronunciation-manifest.json', root).href) {
      return { format: 'module', source: `export default ${readFileSync(new URL(url), 'utf8')}`, shortCircuit: true }
    }
    if (url.startsWith(root.href) && /\.tsx?$/.test(url)) {
      const source = ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
      return { format: 'module', source, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
const { default: GuidedLesson } = await import('../app/components/GuidedLesson.tsx')
const { default: MotCard } = await import('../app/components/MotCard.tsx')

test('the shared lexical card cannot reveal an ineligible entry through another caller', () => {
  const invalid = { id: 10, fr: 'De rien', dendi: 'N/A', phonetique: 'N/A', categorie: 'Salutations' }
  assert.equal(renderToStaticMarkup(React.createElement(MotCard, { mot: invalid })), '')
  assert.match(renderToStaticMarkup(React.createElement(MotCard, { mot: { ...invalid, id: 1, dendi: 'Fixture ɛ' } })), /De rien/)
})

test('a fully invalid lesson renders an unavailable state with no exercises or start action', () => {
  const html = renderToStaticMarkup(React.createElement(GuidedLesson, {
    lesson: { id: 'debutant-salutations-01', title: 'Fixture', niveau: 'debutant', unitId: 'debutant-salutations', unitTitle: 'Fixture', index: 1, totalInUnit: 1, mots: [{ id: 10, fr: 'De rien', dendi: 'N/A', phonetique: 'N/A', categorie: 'Salutations', niveau: 'debutant' }] },
    nextLesson: null, userId: null,
  }))
  assert.match(html, /Leçon momentanément indisponible/)
  assert.match(html, /Retour au parcours/)
  assert.match(html, /role="status"/)
  assert.doesNotMatch(html, /N\/A|<button|progressbar|Mots appris|Commencer/)
})
