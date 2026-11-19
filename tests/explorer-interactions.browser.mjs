// Run against a local Next.js server with an existing Playwright installation,
// using PLAYWRIGHT_MODULE, BROWSER_CHANNEL, TEST_BASE_URL and TEST_ARTIFACTS_DIR
// as in mobile-priorities.browser.mjs. All sessions are guests.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const artifacts = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-explorer-interactions')
await fs.mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
const results = []

async function focusIs(locator) {
  await locator.evaluate(el => {
    if (el !== document.activeElement) throw new Error('Focus attendu sur ' + (el.getAttribute('aria-label') || el.textContent || el.className))
  })
}

function assertWithinViewport(locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    if (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1) {
      throw new Error('Débordement horizontal dans ' + el.className)
    }
  })
}

async function selectColours(page, touch) {
  const link = page.getByRole('link', { name: /^Couleurs\b/ })
  if (touch) await link.tap()
  else await link.click()
  await page.getByRole('heading', { name: 'Couleurs', exact: true }).waitFor()
}

async function activeOption(search) {
  return search.evaluate(input => {
    const target = document.getElementById(input.getAttribute('aria-activedescendant'))
    if (document.activeElement !== input || !target || target.getAttribute('aria-selected') !== 'true') {
      throw new Error('L’option active ne correspond pas au focus annoncé')
    }
    return target.firstElementChild.textContent
  })
}

async function noOptions(page, search) {
  assert.equal(await search.getAttribute('aria-expanded'), 'false')
  assert.equal(await search.getAttribute('aria-activedescendant'), null)
  assert.equal(await page.getByRole('option').and(page.locator('.learn-search-suggestion')).count(), 0)
}

async function checkSearch(page, item) {
  await page.goto(base + '/apprendre')
  const main = page.locator('.learn-page')
  const search = page.getByRole('combobox', { name: /^Rechercher un mot/ })
  const list = page.getByRole('listbox', { name: 'Suggestions de mots' })
  const options = list.getByRole('option')
  const clear = page.getByRole('button', { name: 'Effacer la recherche' })
  const empty = page.getByRole('heading', { name: 'Aucun mot trouvé' })

  await selectColours(page, item.touch)
  await search.fill('Lundi')
  await empty.waitFor()
  await noOptions(page, search)
  await page.screenshot({ path: path.join(artifacts, `${item.key}-no-results.png`) })
  await page.getByRole('link', { name: 'Rechercher dans tous les thèmes' }).click()
  await page.getByRole('button', { name: 'Révéler la traduction Dendi de Lundi', exact: true }).waitFor()
  assert.equal(await search.inputValue(), 'Lundi')
  await focusIs(search)

  await search.fill('Bonjour')
  assert.equal(await options.count(), 2)
  const names = await options.locator('span:first-child').allTextContents()
  assert.equal(await search.getAttribute('aria-controls'), await list.getAttribute('id'))
  await search.press('ArrowDown')
  assert.equal(await activeOption(search), names[0])
  await search.press('ArrowDown')
  assert.equal(await activeOption(search), names[1])
  await search.press('ArrowUp')
  assert.equal(await activeOption(search), names[0])
  await search.press('Escape')
  await noOptions(page, search)
  await focusIs(search)
  assert.equal(await search.inputValue(), 'Bonjour')
  await search.press('ArrowUp')
  assert.equal(await activeOption(search), names[1])
  await search.press('Tab')
  await focusIs(clear)
  await noOptions(page, search)
  assert.equal(await search.inputValue(), 'Bonjour')
  await page.keyboard.press('Shift+Tab')
  await focusIs(search)
  await search.press('ArrowDown')
  const chosen = await activeOption(search)
  await page.screenshot({ path: path.join(artifacts, `${item.key}-suggestions.png`) })
  await search.press('Enter')
  await noOptions(page, search)
  await focusIs(search)
  assert.equal(await search.inputValue(), chosen)
  assert.equal(await main.locator('.mot-card').count(), 1)
  await clear.click()
  await focusIs(search)
  assert.equal(await search.inputValue(), '')
  assert.equal(await main.locator('.mot-card').count(), 0)
  assert.equal(await page.getByRole('heading', { name: 'Explorer par thème' }).count(), 1)

  await search.fill('LITƐNI')
  assert.equal(await options.count(), 1)
  assert.match(await options.first().innerText(), /Lundi[\s\S]*Litɛni/)
  await assertWithinViewport(list)
  assert.ok((await options.first().boundingBox()).height >= 44)
  if (item.touch) await options.first().tap()
  else await options.first().click()
  await focusIs(search)
  assert.equal(await search.inputValue(), 'Lundi')
  await noOptions(page, search)
  await search.fill('Litèni') // Keep the existing phonetic spelling and accents.
  assert.match(await options.first().innerText(), /Litɛni/)
  await search.fill('De rien')
  await empty.waitFor()
  await noOptions(page, search)

  await page.goto(base + '/apprendre?niveau=debutant')
  await search.fill('Lundi')
  await empty.waitFor()
  await noOptions(page, search)
  await clear.click()
  await selectColours(page, item.touch)
  await search.fill('Íkpaare')
  assert.equal(await options.count(), 1)
  assert.match(await options.first().innerText(), /Blanc[\s\S]*Íkpaare/)
  await options.first().click()
  assert.equal(await search.inputValue(), 'Blanc')
  assert.equal(new URL(page.url()).searchParams.get('categorie'), 'couleurs')
  assert.match(page.url(), /niveau=debutant/)
  await search.fill('Lundi')
  await empty.waitFor()
  await noOptions(page, search)
  await page.getByRole('link', { name: 'Rechercher dans tous les thèmes' }).click()
  await page.waitForURL(base + '/apprendre?niveau=debutant')
  await empty.waitFor()
  await noOptions(page, search)
  await page.getByRole('link', { name: 'Rechercher dans tous les niveaux', exact: true }).click()
  await page.waitForURL(base + '/apprendre')
  await page.getByRole('button', { name: 'Révéler la traduction Dendi de Lundi', exact: true }).waitFor()
  assert.equal(await search.inputValue(), 'Lundi')
  await focusIs(search)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  item.searchPassed = true
}

async function checkQuiz(page, item) {
  const trigger = page.getByRole('button', { name: 'Quiz libre', exact: true })
  assert.equal(await trigger.count(), 0)
  await page.getByRole('button', { name: 'Effacer la recherche' }).click()
  await selectColours(page, item.touch)
  const dialog = page.getByRole('dialog', { name: 'Quiz Dendi-Learn' })
  const close = dialog.getByRole('button', { name: 'Fermer le quiz' })
  const cancel = dialog.getByRole('button', { name: 'Annuler', exact: true })
  const main = page.locator('main')
  await trigger.scrollIntoViewIfNeeded()
  if (item.touch) await trigger.tap()
  else await trigger.click()

  await dialog.getByRole('heading', { name: 'Choisissez votre catégorie' }).waitFor()
  assert.ok(await dialog.evaluate(e => e.matches('dialog:modal')))
  assert.equal(await dialog.getByRole('button', { name: 'Tous les mots 181 mots' }).getAttribute('aria-pressed'), 'true')
  assert.ok(await dialog.getByRole('button', { name: 'Salutations 18 mots' }).isVisible())
  if (item.key.endsWith('-dark')) {
    assert.equal(await dialog.locator('.quiz-panel').evaluate(e => getComputedStyle(e).animationName), 'none')
  }
  await focusIs(close)
  const scrollBefore = await page.evaluate(() => scrollY)
  const buttons = dialog.locator('button:enabled')
  const count = await buttons.count()
  for (let i = 1; i < count; i++) {
    await page.keyboard.press('Tab')
    await focusIs(buttons.nth(i))
  }
  await focusIs(cancel)
  await page.keyboard.press('Tab')
  await focusIs(close)
  await page.keyboard.press('Shift+Tab')
  await focusIs(cancel)
  for (let i = count - 2; i >= 0; i--) {
    await page.keyboard.press('Shift+Tab')
    await focusIs(buttons.nth(i))
  }
  await page.locator('.learn-search-input').evaluate(el => el.focus())
  await focusIs(close)
  const viewport = page.viewportSize()
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await page.mouse.wheel(0, 1500)
  if (await dialog.evaluate(e => e.scrollHeight > e.clientHeight)) {
    await page.waitForFunction(() => document.querySelector('dialog:modal')?.scrollTop > 0)
  }
  assert.equal(await page.evaluate(() => scrollY), scrollBefore)
  await assertWithinViewport(dialog)
  await page.screenshot({ path: path.join(artifacts, `${item.key}-quiz.png`) })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  await focusIs(trigger)
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), 'hidden')

  await trigger.click()
  await focusIs(close)
  await close.click()
  await dialog.waitFor({ state: 'hidden' })
  await focusIs(trigger)

  await trigger.click()
  await dialog.getByRole('button', { name: 'Commencer le quiz' }).click()
  const heading = dialog.locator('#quiz-question-title')
  await heading.waitFor()
  await focusIs(heading)
  assert.doesNotMatch(await heading.innerText(), /^N\/A$/)
  await dialog.locator('.quiz-answer').first().click()
  await dialog.locator('.quiz-feedback > p').waitFor()
  assert.ok(await dialog.locator('.quiz-answer[aria-disabled=true]').count())

  let warning
  page.once('dialog', async (confirmation) => {
    warning = confirmation.message()
    await confirmation.dismiss()
  })
  await page.keyboard.press('Escape')
  assert.match(warning, /ses réponses/)
  assert.ok(await dialog.isVisible())
  await dialog.getByText('Question 2 sur 10', { exact: true }).waitFor()
  await focusIs(heading)
  assert.ok(await dialog.evaluate(e => e.contains(document.activeElement)))
  await page.screenshot({ path: path.join(artifacts, `${item.key}-quiz-question.png`) })

  page.once('dialog', async (confirmation) => { await confirmation.accept() })
  await close.click()
  await dialog.waitFor({ state: 'hidden' })
  await focusIs(trigger)
  await trigger.click()
  await dialog.getByRole('heading', { name: 'Choisissez votre catégorie' }).waitFor()
  await cancel.click()
  await dialog.waitFor({ state: 'hidden' })
  await focusIs(trigger)
  await assertWithinViewport(main)
  item.quizPassed = true
}

try {
  for (const [width, height] of [[320, 480], [360, 800], [390, 844], [430, 932], [768, 1024], [1280, 900]]) {
    for (const theme of ['light', 'dark']) {
      const touch = width <= 430
      const key = `${width}-${theme}`
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, isMobile: touch, hasTouch: touch, reducedMotion: theme === 'dark' ? 'reduce' : 'no-preference' })
      const item = { key, touch, height, errors: [], blocked: [] }
      results.push(item)
      await context.addInitScript(theme => localStorage.setItem('dendi-theme', theme), theme)
      await context.route(/\/(rest|auth)\/v1\//, route => {
        const method = route.request().method()
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue()
        item.blocked.push(method)
        return route.abort()
      })
      const page = await context.newPage()
      page.setDefaultTimeout(10_000)
      page.on('pageerror', error => item.errors.push(error.message))
      try {
        await checkSearch(page, item)
        await checkQuiz(page, item)
        assert.deepEqual(item.errors, [])
        assert.deepEqual(item.blocked, [])
        console.log(key + ' OK')
      } catch (error) {
        item.failure = error.stack
        await page.screenshot({ path: path.join(artifacts, key + '-failure.png') }).catch(() => {})
        console.error(key, error.message)
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  await fs.writeFile(path.join(artifacts, 'explorer-interactions.json'), JSON.stringify(results, null, 2))
}
assert.equal(results.filter(r => !r.failure && r.searchPassed && r.quizPassed).length, 12)
