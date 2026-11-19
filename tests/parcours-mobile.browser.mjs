import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const artifacts = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-parcours-mobile')
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
const results = []
await fs.mkdir(artifacts, { recursive: true })

const primary = page => page.locator('.path-continue-card .path-primary-action')
const start = page => page.getByRole('button', { name: 'Commencer la leçon' })
const quit = page => page.getByRole('link', { name: 'Quitter' }).click()
const program = page => page.getByRole('region', { name: 'Programme', exact: true })
const unitButton = (page, name) => program(page).getByRole('button', { name })

async function progress(page, completed) {
  await page.locator(`.path-level-progress [role=progressbar][aria-valuenow="${completed}"]`).waitFor()
}

async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Débordement horizontal')
}

async function focusedAndVisible(locator) {
  await locator.evaluate(el => {
    if (el !== document.activeElement || getComputedStyle(el).outlineStyle === 'none') {
      throw new Error('Focus clavier absent sur ' + el.textContent)
    }
  })
  await locator.page().waitForFunction(() => {
    const rect = document.activeElement.getBoundingClientRect()
    const nav = document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= (nav?.height ? nav.top : innerHeight) + 1
  })
}

async function openUnit(page, button) {
  assert.equal(await button.getAttribute('aria-expanded'), 'false')
  const panel = page.locator(`[id="${await button.getAttribute('aria-controls')}"]`)
  assert.equal(await panel.isVisible(), false)
  await button.press('Enter')
  assert.equal(await button.getAttribute('aria-expanded'), 'true')
  await panel.waitFor()
  await focusedAndVisible(button)
  return panel
}

async function oneMainLink(page) {
  const href = await primary(page).getAttribute('href')
  assert.equal(await page.locator(`.path-content a[href="${href}"]`).count(), 1)
  return href
}

async function checkLayout(page, item) {
  await noOverflow(page)
  assert.equal(await page.getByRole('heading', { name: 'Mon parcours', exact: true }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Voir tout le programme' }).count(), 0)
  const mobile = item.width <= 700
  const nav = page.locator(mobile ? '.mobile-bottom-nav' : '.site-primary-nav')
  assert.equal(await nav.getByRole('link', { name: 'Parcours' }).getAttribute('aria-current'), 'page')
  assert.equal(await page.locator('.path-explorer-callout').isVisible(), !mobile)
  for (const target of [primary(page), page.locator('.path-level-toggle'), page.locator('.path-unit-summary').first()]) {
    assert.ok(await target.evaluate(el => el.getBoundingClientRect().height >= 44))
  }
  for (const name of [/Passer au thème/, /sons d.interface/i]) {
    assert.ok(await page.getByRole('button', { name }).first().isVisible())
  }
  const contrast = await primary(page).evaluate(button => {
    const luminance = color => color.match(/\d+(?:\.\d+)?/g).slice(0, 3)
      .map(c => Number(c) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
    const { color, backgroundColor } = getComputedStyle(button)
    const [lighter, darker] = [luminance(color), luminance(backgroundColor)].sort((a, b) => b - a)
    return (lighter + 0.05) / (darker + 0.05)
  })
  assert.ok(contrast >= 4.5)
  item.primaryContrast = contrast
  return nav
}

async function finishActualLesson(page) {
  for (let step = 0; step < 40; step++) {
    if (await page.locator('.guided-result').count()) return
    const reveal = page.getByRole('button', { name: 'Voir la traduction', exact: true })
    if (await reveal.count()) await reveal.click()
    const answers = page.locator('.guided-answer-list button')
    if (await answers.count()) await answers.first().click()
    await page.locator('.guided-primary-button').click()
  }
  throw new Error('La fin réelle de la leçon n’a pas été atteinte.')
}

async function capture(page, item) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => scrollTo(0, 0))
  const name = `apres-${item.width}-clair`
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) })
  await page.screenshot({ path: path.join(artifacts, `${name}-page.png`), fullPage: true })
  item.inProgressLayout = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect()
    return { introHeight: rect('.path-intro').height, cardHeight: rect('.path-continue-card').height,
      progressHeight: rect('.path-level-progress').height, firstUnitTop: rect('.path-current-unit').top + scrollY,
      mainActionBottom: rect('.path-primary-action').bottom + scrollY }
  })
}

async function checkJourney(page, item) {
  await page.goto(base + '/parcours')
  await progress(page, 0)
  const nav = await checkLayout(page, item)
  assert.match(await page.locator('.path-continue-copy').innerText(), /suggérée[\s\S]*Non commencée/i)
  const firstHref = await oneMainLink(page)

  await primary(page).press('Tab')
  await focusedAndVisible(program(page).locator('a.path-lesson').first())
  await primary(page).click()
  await start(page).waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('dendi-guided-lessons:v1:guest')), null)
  await start(page).click()
  const firstWord = await page.locator('#guided-learn-title').innerText()
  await page.getByRole('button', { name: 'Voir la traduction' }).click()
  await page.locator('.guided-primary-button').click()
  await page.waitForFunction(word => document.querySelector('#guided-learn-title')?.textContent !== word, firstWord)
  await quit(page)
  await progress(page, 0)
  assert.equal(await page.locator('.path-continue-eyebrow').textContent(), 'Leçon en cours')
  assert.match(await primary(page).innerText(), /Repartir du début/)
  assert.equal(await oneMainLink(page), firstHref)
  if (item.theme === 'light' && [390, 1280].includes(item.width)) await capture(page, item)

  await page.reload()
  await progress(page, 0)
  assert.match(await primary(page).innerText(), /Repartir du début/)
  await primary(page).click()
  await start(page).waitFor()
  await start(page).click()
  assert.equal(await page.locator('#guided-learn-title').innerText(), firstWord)

  const completed = item.width === 390 && item.theme === 'light' ? 1 : 0
  if (completed) {
    await finishActualLesson(page)
    await page.getByRole('link', { name: 'Retour au parcours', exact: true }).click()
  } else {
    await quit(page)
  }
  await progress(page, completed)
  if (completed) {
    const replay = program(page).getByRole('link', { name: /Leçon 1, Salutations.*Terminée\. Revoir/ })
    assert.equal(await replay.getAttribute('href'), firstHref)
    await replay.click()
    await start(page).waitFor()
    await quit(page)
    await progress(page, 1)
    assert.notEqual(await oneMainLink(page), firstHref)
    assert.match(await page.locator('.path-continue-copy').innerText(), /Non commencée/)
  }

  const time = unitButton(page, /Unité 2, Temps essentiel/)
  const safeAreaOverride = completed
    ? await page.addStyleTag({ content: '.mobile-bottom-nav { padding-bottom: 31px !important; }' })
    : null
  if (safeAreaOverride) {
    await page.waitForFunction(() => {
      const height = document.querySelector('.mobile-bottom-nav').getBoundingClientRect().height
      return height >= 90 && Math.abs(parseFloat(document.documentElement.style.getPropertyValue('--mobile-nav-height')) - height) < 1
    })
  }
  const panel = await openUnit(page, time)
  await noOverflow(page)
  await time.press('Space')
  assert.equal(await time.getAttribute('aria-expanded'), 'false')
  await panel.waitFor({ state: 'hidden' })
  await openUnit(page, time)
  await page.keyboard.press('Tab')
  const otherLesson = panel.locator('a.path-lesson').first()
  await focusedAndVisible(otherLesson)
  if (safeAreaOverride) {
    item.simulatedSafeArea = true
    await safeAreaOverride.evaluate(style => style.remove())
  }
  const otherHref = await otherLesson.getAttribute('href')
  assert.notEqual(otherHref, firstHref)
  await page.keyboard.press('Enter')
  await page.waitForURL(base + otherHref)
  await start(page).click()
  await quit(page)
  await progress(page, completed)
  assert.equal(await oneMainLink(page), otherHref)
  assert.equal(await page.locator('.path-current-unit h4').innerText(), 'Temps essentiel')
  assert.match(await program(page).locator('.path-unit').first().innerText(), /Salutations/)
  await openUnit(page, unitButton(page, /Unité 1, Salutations/))

  const level = page.getByRole('button', { name: 'Changer de niveau' })
  await level.press('Enter')
  const levels = page.getByRole('group', { name: 'Choisir le niveau du parcours' })
  await levels.waitFor()
  assert.equal(await levels.getByRole('link', { name: 'Débutant' }).getAttribute('aria-current'), 'page')
  await noOverflow(page)
  await levels.getByRole('link', { name: 'Intermédiaire' }).press('Enter')
  await page.waitForURL('**/parcours?niveau=intermediaire')
  await page.locator('.path-level-current strong').filter({ hasText: 'Intermédiaire' }).waitFor()
  await levels.waitFor({ state: 'hidden' })
  await progress(page, 0)
  await level.press('Enter')
  await levels.getByRole('link', { name: 'Débutant' }).press('Enter')
  await page.waitForURL('**/parcours?niveau=debutant')
  await progress(page, completed)
  await page.reload()
  await progress(page, completed)
  await nav.getByRole('link', { name: 'Explorer' }).click()
  await page.waitForURL('**/apprendre')
  await nav.getByRole('link', { name: 'Parcours' }).click()
  await progress(page, completed)
  assert.equal(await oneMainLink(page), otherHref)
  await noOverflow(page)
}

try {
  for (const [width, height] of [[320, 568], [360, 800], [390, 844], [430, 932], [768, 1024], [1280, 900], [640, 450]]) {
    for (const theme of ['light', 'dark']) {
      const zoom = width === 640 ? 2 : 1
      const item = { width, height, theme, zoom, errors: [], writes: [] }
      results.push(item)
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme,
        hasTouch: width <= 430, isMobile: width <= 430, reducedMotion: 'reduce', deviceScaleFactor: zoom })
      await context.addInitScript(theme => {
        localStorage.setItem('dendi-theme', theme)
        localStorage.setItem('dendi:sound-enabled', 'false')
      }, theme)
      await context.route(/\/(rest|auth)\/v1\//, route => {
        const method = route.request().method()
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue()
        item.writes.push(method)
        return route.abort()
      })
      const page = await context.newPage()
      page.setDefaultTimeout(12_000)
      page.on('pageerror', error => item.errors.push(error.message))
      try {
        await checkJourney(page, item)
        assert.deepEqual(item.errors, [])
        assert.deepEqual(item.writes, [])
        item.passed = true
        console.log(width, theme, 'OK')
      } catch (error) {
        item.failure = error.stack
        console.error(width, theme, error.message)
        await page.screenshot({ path: path.join(artifacts, `failure-${width}-${theme}.png`) }).catch(() => {})
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  await fs.writeFile(path.join(artifacts, 'parcours-mobile-results.json'), JSON.stringify(results, null, 2))
}
assert.equal(results.filter(item => item.passed).length, 14)
