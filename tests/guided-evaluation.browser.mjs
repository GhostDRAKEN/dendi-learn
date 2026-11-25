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

async function run(width, height, theme, lessonId = 'intermediaire-prepositions-02', journey) {
  const context = journey?.context ?? await browser.newContext({ viewport: { width, height }, hasTouch: width < 700, isMobile: width < 700,
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
    const count = page.locator('.guided-position small')
    async function position(stage, item, index, total) {
      assert.equal(await page.locator('#guided-phase-name').innerText(), stage)
      assert.equal(await page.locator('#guided-item-position').innerText(), `${item} ${index + 1} sur ${total}`)
    }
    async function activate(locator, key = 'Enter') {
      await tabTo(page, locator)
      await page.keyboard.press(key)
    }
    await activate(primary)
    const header = await page.locator('.guided-header').evaluate(el => {
      const name = el.querySelector('.guided-header-copy span')
      const title = el.querySelector('.guided-header-copy strong')
      const exit = el.querySelector('.guided-exit').getBoundingClientRect()
      const sound = el.querySelector('.site-sound-toggle').getBoundingClientRect()
      return [name, title].every(text => {
        const rect = text.getBoundingClientRect()
        return text.scrollWidth <= text.clientWidth + 1 && rect.left >= exit.right && rect.right <= sound.left
      })
    })
    assert.ok(header, 'Unit and lesson labels must be readable between the two controls')
    for (const [index, word] of lesson.mots.entries()) {
      await focusIs(heading)
      assert.equal(await heading.innerText(), word.dendi.trim())
      await position('Apprendre', 'Mot', index, lesson.mots.length)
      assert.equal(parseInt(await count.innerText()), index)
      await page.getByText('Essayez de retrouver le sens avant de révéler la traduction.', { exact: true }).waitFor()
      if (index === 0 && width === 390 && theme === 'light' && !journey) {
        await page.screenshot({ animations: 'disabled', path: path.join(out, 'rappel-decouverte-390-844-light.png') })
      }
      await activate(page.locator('.guided-reveal-button'), 'Space')
      await focusIs(notice)
      assert.equal(parseInt(await count.innerText()), index + 1)
      assert.equal(await notice.innerText(), word.fr.trim())
      assert.equal(await page.locator('.guided-recall-prompt').count(), 0)
      if (index === 0 && width === 390 && theme === 'light' && !journey) {
        await page.screenshot({ animations: 'disabled', path: path.join(out, 'traduction-revelee-390-844-light.png') })
      }
      if (index === 1) {
        await activate(page.locator('.guided-back-button'))
        await focusIs(heading)
        assert.equal(await heading.innerText(), lesson.mots[0].dendi.trim())
        assert.equal(parseInt(await count.innerText()), 2)
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
        await position(mode === 'practice' ? 'Entraînement' : 'Test', 'Question', i, questions.length)
        assert.equal(parseInt(await count.innerText()), i)
        if (mode === 'test' && i === questions.length - 1 && width >= 390 && !journey) {
          await page.screenshot({ animations: 'disabled', path: path.join(out, `derniere-question-${width}-${height}-${theme}.png`) })
        }
        const wrong = mode === 'test' && journey?.correctCount !== undefined
          ? i >= journey.correctCount
          : i === missedIndex && (mode === 'practice' || theme === 'dark' || !prepositions)
        if (mode === 'test' && wrong) errorsInTest++
        if (prepositions && !i) assert.equal(q.correctAnswer, 'Binni')
        const answer = wrong ? q.options.find(option => option !== q.correctAnswer) : q.correctAnswer
        await activate(page.getByRole('button', { name: answer.trim(), exact: true }), i % 2 ? 'Enter' : 'Space')
        await focusIs(notice)
        assert.equal(parseInt(await count.innerText()), i + 1)
        assert.ok((await notice.innerText()).includes(q.correctAnswer))
        assert.ok((await notice.innerText()).includes(answer))
        if (answer === q.correctAnswer) {
          assert.ok((await notice.innerText()).includes('Réponse correcte :'))
        } else {
          assert.ok((await notice.innerText()).includes(`Votre réponse : ${answer}`))
          assert.ok((await notice.innerText()).includes(`Réponse attendue : ${q.correctAnswer}`))
        }
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
    for (let i = 0; i < errorsInTest; i++) {
      await focusIs(heading)
      await position('Révision', 'Mot', i, errorsInTest)
      assert.equal(parseInt(await count.innerText()), i)
      assert.equal(await heading.innerText(), exercises.test[(journey?.correctCount ?? missedIndex) + i].mot.dendi.trim())
      assert.equal(await page.locator('.guided-review-card .guided-word-french').count(), 0)
      await page.getByText('Essayez de retrouver le sens avant de révéler la traduction.', { exact: true }).waitFor()
      if (i === 0 && width === 390 && theme === 'dark' && !journey) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await page.screenshot({ animations: 'disabled', fullPage: true, path: path.join(out, 'apres-revision-avant-revelation-390-844-dark.png') })
      }
      await activate(page.locator('.guided-review-card .guided-reveal-button'))
      await focusIs(notice)
      assert.equal(await notice.innerText(), exercises.test[(journey?.correctCount ?? missedIndex) + i].mot.fr.trim())
      assert.equal(parseInt(await count.innerText()), i)
      if (i === 0 && width === 390 && theme === 'dark' && !journey) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await page.screenshot({ animations: 'disabled', fullPage: true, path: path.join(out, 'apres-revision-revelee-390-844-dark.png') })
        await page.locator('.guided-review-heading > p:last-child').evaluate(element => {
          element.textContent = 'Revoyons rapidement les mots difficiles.'
        })
        await page.screenshot({ animations: 'disabled', fullPage: true, path: path.join(out, 'avant-revision-reconstituee-390-844-dark.png') })
      }
      await activate(primary)
    }
    await focusIs(page.locator('#guided-result-title'))
    assert.equal(await heading.innerText(), 'Leçon terminée')
    const score = exercises.test.length - errorsInTest
    assert.equal(await page.locator('.guided-score strong').innerText(),
      (score === 0 ? 'Aucune bonne réponse' : score === 1 ? '1 bonne réponse' : `${score} bonnes réponses`) + ` sur ${exercises.test.length}`)
    assert.match(await page.locator('.guided-result-context').innerText(), errorsInTest ? /Révision effectuée/ : /Aucune révision nécessaire/)
    assert.equal(await page.locator('.guided-unit-complete').count(), journey?.complete ? 1 : 0)
    if (width === 390 || width === 1280) {
      await page.screenshot({ animations: 'disabled', path: path.join(out, `bilan-${lessonId}-${width}-${height}-${theme}.png`) })
    }
    assert.equal(await page.locator('.guided-result-stats dd').last().innerText(), String(errorsInTest))
    await activate(page.getByRole('link', { name: 'Retour au parcours', exact: true }))
    await page.waitForURL(url => url.pathname === '/parcours')
    await focusIs(page.locator('#path-title'))
    await page.reload()
    await page.locator(`.path-level-progress [role=progressbar][aria-valuenow="${journey?.finished ?? 1}"]`).waitFor()
    assert.deepEqual(errors, [])
    console.log(`OK ${width}×${height} ${theme}, ${metrics.length} réponses`)
    return { lessonId, width, height, theme, metrics }
  } finally {
    if (!journey) await context.close()
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce' })
  try {
    for (const [i, number] of ['03', '01', '02'].entries()) {
      results.push(await run(390, 844, 'light', `debutant-salutations-${number}`, {
        context, correctCount: i < 2 ? i : undefined, finished: i + 1, complete: i === 2,
      }))
    }
  } finally {
    await context.close()
  }
  await fs.writeFile(path.join(out, 'feedback-rectangles.json'), JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
