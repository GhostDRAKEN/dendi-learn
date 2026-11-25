import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { lessons } from './guided-inventory.mjs'

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === './curriculum' && context.parentURL?.endsWith('/lib/lesson-exercises.ts')
    ? './curriculum.ts' : specifier, context)
} })
const { createLessonExercises } = await import('../lib/lesson-exercises.ts')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const out = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-guided-evaluation')
await fs.mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' })

async function focusIs(locator) {
  await locator.waitFor()
  assert.ok(await locator.evaluate(el => el === document.activeElement), 'Expected focus on ' + locator)
}

async function tabTo(page, locator) {
  await locator.waitFor()
  for (let tab = 0; tab < 9; tab++) {
    if (await locator.evaluate(el => el === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  assert.fail('Unreachable by keyboard: ' + locator)
}

async function run(width, height, theme, lessonId = 'intermediaire-prepositions-02') {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 700, isMobile: width < 700,
    colorScheme: theme, reducedMotion: width <= 360 ? 'reduce' : 'no-preference' })
  const metrics = []
  try {
    await context.addInitScript(theme => {
      localStorage.setItem('dendi-theme', theme)
      localStorage.setItem('dendi:sound-enabled', 'false')
    }, theme)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    const lesson = lessons.find(l => l.id === lessonId)
    const prepositions = lessonId === 'intermediaire-prepositions-02'
    const missedIndex = prepositions ? 1 : 0
    const exercises = createLessonExercises(lesson)
    await page.goto(base + '/parcours/' + lesson.id, { waitUntil: 'domcontentloaded' })
    await page.locator('.guided-header .site-sound-toggle[aria-pressed="false"]').waitFor()
    const primary = page.locator('.guided-primary-button')
    const notice = page.locator('[data-lesson-notice]')
    const heading = page.locator('[data-lesson-heading]')
    async function activate(locator, key = 'Enter') {
      await tabTo(page, locator)
      await page.keyboard.press(key)
    }
    await activate(primary)
    for (const [index, word] of lesson.mots.entries()) {
      await focusIs(heading)
      assert.equal(await heading.innerText(), word.dendi.trim())
      await activate(page.locator('.guided-reveal-button'), 'Space')
      await focusIs(notice)
      assert.equal(await notice.innerText(), word.fr.trim())
      if (index === 1) {
        await activate(page.locator('.guided-back-button'))
        await focusIs(heading)
        assert.equal(await heading.innerText(), lesson.mots[0].dendi.trim())
        await activate(primary)
        await focusIs(heading)
        assert.equal(await notice.innerText(), word.fr.trim())
      }
      await activate(primary)
    }
    let errorsInTest = 0
    for (const [mode, questions] of Object.entries(exercises)) {
      for (const [i, q] of questions.entries()) {
        await focusIs(heading)
        assert.equal(await heading.innerText(), q.prompt.trim())
        // Always answer the Binni question correctly. Only a different word is missed on the dark run.
        const wrong = i === missedIndex && (mode === 'practice' || theme === 'dark' || !prepositions)
        if (mode === 'test' && wrong) errorsInTest++
        if (prepositions && !i) assert.equal(q.correctAnswer, 'Binni')
        const answer = wrong ? q.options.find(option => option !== q.correctAnswer) : q.correctAnswer
        await activate(page.getByRole('button', { name: answer.trim(), exact: true }), i % 2 ? 'Enter' : 'Space')
        await focusIs(notice)
        assert.ok((await notice.innerText()).includes(q.correctAnswer))
        assert.ok((await notice.innerText()).includes(answer))
        assert.equal(await page.locator('.guided-answer:enabled').count(), 0)
        const bounds = await page.evaluate(() => {
          const box = selector => {
            const r = document.querySelector(selector).getBoundingClientRect()
            return { top: r.top, bottom: r.bottom }
          }
          return { feedback: box('[data-lesson-notice]'), button: box('.guided-primary-button'),
            viewport: innerHeight, scrollWidth: document.documentElement.scrollWidth }
        })
        assert.ok(bounds.feedback.top >= 0 && bounds.feedback.bottom <= height + 1, JSON.stringify(bounds))
        assert.ok(bounds.feedback.bottom <= bounds.button.top, JSON.stringify(bounds))
        assert.ok(bounds.scrollWidth <= width)
        metrics.push({ mode, question: i + 1, wrong, ...bounds })
        if (wrong && mode === 'test' && width <= 360) {
          await page.screenshot({ path: path.join(out, `${lessonId}-${width}-${theme}.png`) })
        }
        await page.keyboard.press('Tab')
        await focusIs(primary)
        assert.ok(await primary.evaluate(button => {
          const rect = button.getBoundingClientRect()
          return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
        }), 'The focused continuation must be reachable in the viewport')
        if (i === 0) {
          await page.keyboard.press('Shift+Tab')
          assert.equal(await page.locator('.guided-answer:focus').count(), 0)
          await page.keyboard.press('Tab')
          await focusIs(primary)
        }
        await page.keyboard.press('Enter')
      }
    }
    if (errorsInTest) {
      await focusIs(heading)
      assert.equal(await heading.innerText(), exercises.test[missedIndex].mot.dendi.trim())
      await activate(primary)
    }
    await focusIs(page.locator('#guided-result-title'))
    assert.equal(await page.locator('.guided-score strong').innerText(),
      `${exercises.test.length - errorsInTest} / ${exercises.test.length}`)
    assert.equal(await page.locator('.guided-result-stats dd').last().innerText(), String(errorsInTest))
    await activate(page.getByRole('link', { name: 'Retour au parcours', exact: true }))
    await page.waitForURL(url => url.pathname === '/parcours')
    await focusIs(page.locator('#path-title'))
    await page.reload()
    await page.locator('.path-level-progress [role=progressbar][aria-valuenow="1"]').waitFor()
    assert.deepEqual(errors, [])
    console.log(`OK ${width}×${height} ${theme}, ${metrics.length} réponses`)
    return { lessonId, width, height, theme, metrics }
  } finally {
    await context.close()
  }
}

try {
  const results = []
  for (const [width, height] of [[320, 568], [360, 800], [390, 844], [430, 932], [390, 500], [768, 1024], [1280, 900]]) {
    results.push(...await Promise.all(['light', 'dark'].map(theme => run(width, height, theme))))
  }
  for (const [width, height] of [[320, 568], [360, 800]]) {
    results.push(...await Promise.all(['light', 'dark'].map(theme => run(width, height, theme, 'debutant-salutations-02'))))
  }
  await fs.writeFile(path.join(out, 'feedback-rectangles.json'), JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
