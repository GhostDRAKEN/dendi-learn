import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const artifacts = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-guided-intro')
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })
const results = []
const formats = [[320, 568], [360, 800], [390, 844], [430, 932], [390, 500], [768, 1024], [1280, 900], [1440, 900], [640, 450, 2]]
const iconsByUnit = new Map()
const progressKey = 'dendi-guided-lessons:v1:guest'
const start = page => page.getByRole('button', { name: 'Commencer la leçon', exact: true })
const quit = page => page.getByRole('link', { name: 'Quitter', exact: true })
const sound = page => page.locator('.guided-header .site-sound-toggle')
await fs.mkdir(artifacts, { recursive: true })

async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Débordement horizontal')
}

async function checkIntro(page, width) {
  await start(page).waitFor()
  await page.locator('.guided-header .site-sound-toggle[aria-pressed="false"]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await noOverflow(page)
  for (const control of [quit(page), sound(page), start(page)]) {
    assert.ok(await control.evaluate(element => {
      const box = element.getBoundingClientRect()
      return box.height >= 44 && box.width >= 44 && box.left >= 0 && box.right <= innerWidth
    }), 'Cible tactile hors cadre ou trop petite')
  }
  const geometry = await page.evaluate(() => {
    const bounds = selector => document.querySelector(selector).getBoundingClientRect()
    const header = bounds('.guided-header')
    const exit = bounds('.guided-exit')
    const headerTitle = bounds('.guided-header-copy')
    const sound = bounds('.guided-header .site-sound-toggle')
    const card = bounds('.guided-intro')
    const cardStyle = getComputedStyle(document.querySelector('.guided-intro'))
    const identity = bounds('.guided-intro-identity')
    const title = bounds('#guided-intro-title')
    const explanation = bounds('.guided-intro-flow')
    const button = bounds('.guided-intro-actions button')
    const color = getComputedStyle(document.querySelector('.guided-intro-actions button'))
    const luminance = rgb => rgb.match(/\d+/g).slice(0, 3).map(c => Number(c) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
    const contrast = (foreground, background) => {
      const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      return (lighter + 0.05) / (darker + 0.05)
    }
    const hasCard = parseFloat(cardStyle.borderTopWidth) > 0 && cardStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
    return {
      bottomGap: innerHeight - button.bottom, headerClear: exit.right <= headerTitle.left && headerTitle.right <= sound.left,
      headingInFlow: identity.top >= header.bottom && identity.bottom <= title.top && title.bottom <= explanation.top && explanation.bottom <= button.top,
      inFlow: !['fixed', 'sticky'].includes(color.position), contrast: contrast(color.color, color.backgroundColor),
      hasCard, cardWidth: card.width, cardHeight: card.height, centered: Math.abs(card.left + card.right - innerWidth) <= 1,
      cardTextContrast: hasCard ? Math.min(...['.guided-intro-identity', '.guided-lead', '.guided-intro-flow'].map(selector =>
        contrast(getComputedStyle(document.querySelector(selector)).color, cardStyle.backgroundColor))) : null,
    }
  })
  assert.ok(geometry.headerClear && geometry.headingInFlow && geometry.inFlow)
  assert.ok(geometry.contrast >= 4.5)
  assert.ok(geometry.bottomGap >= 0)
  assert.equal(geometry.hasCard, width > 700)
  assert.ok(geometry.cardWidth <= 650 && geometry.centered)
  if (geometry.hasCard) assert.ok(geometry.cardTextContrast >= 4.5)
  if (width <= 700) assert.ok(geometry.bottomGap <= 30, 'L’action est trop loin du bas de l’écran')
  return geometry
}

async function checkIdentity(page, unit, title) {
  const identity = page.locator('.guided-intro-identity')
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
  assert.ok(await identity.isVisible())
  assert.equal(await identity.locator('p').textContent(), unit)
  const icon = identity.locator('svg')
  assert.equal(await icon.getAttribute('aria-hidden'), 'true')
  assert.equal(await icon.getAttribute('focusable'), 'false')
  const artwork = await icon.innerHTML()
  assert.ok(artwork.length > 0)
  if (iconsByUnit.has(unit)) assert.equal(artwork, iconsByUnit.get(unit))
  else iconsByUnit.set(unit, artwork)
  return artwork
}

async function checkLongContent(page) {
  await page.locator('#guided-intro-title').evaluate(el => {
    el.textContent = 'Comprendre les salutations, puis les utiliser dans une conversation de tous les jours'
  })
  await page.locator('.guided-intro-flow').evaluate(el => {
    el.textContent = 'Prenez le temps de découvrir des expressions utiles dans plusieurs situations. '.repeat(8)
  })
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await noOverflow(page)
  assert.ok(await start(page).evaluate(el => el.getBoundingClientRect().top > innerHeight))
  await sound(page).focus()
  await page.keyboard.press('Tab')
  assert.ok(await start(page).evaluate(el => el === document.activeElement && el.matches(':focus-visible')))
  const button = await start(page).boundingBox()
  assert.ok(button.y >= 0 && button.y + button.height <= page.viewportSize().height + 1)
}

async function checkJourney(page, item) {
  const { width, height, theme } = item
  await page.goto(base + '/parcours')
  await page.locator('.path-level-progress [role="progressbar"][aria-valuenow="0"]').waitFor()
  await page.locator('.path-continue-card .path-primary-action').click()
  item.geometry = await checkIntro(page, width)
  const salutationsIcon = await checkIdentity(page, 'Unité 1 · Salutations', 'Commençons par nous saluer')
  assert.match(await page.locator('.guided-lead').innerText(), /7 mots/)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), null)
  assert.equal(await page.locator('.guided-intro-summary').count(), 0)
  assert.equal(await page.locator('.guided-panel').evaluate(el => getComputedStyle(el).animationName), 'none')
  if (width === 320 || (width === 390 && height === 844) || (width === 1280 && theme === 'light')) {
    await page.screenshot({ path: path.join(artifacts, `apres-${width}-${height}-${theme}.png`) })
  }

  await quit(page).focus()
  await page.keyboard.press('Tab')
  assert.ok(await sound(page).evaluate(el => el === document.activeElement && el.matches(':focus-visible')))
  const state = await sound(page).getAttribute('aria-pressed')
  await page.keyboard.press('Space')
  assert.notEqual(await sound(page).getAttribute('aria-pressed'), state)
  await page.keyboard.press('Space')
  await page.keyboard.press('Tab')
  assert.ok(await start(page).evaluate(el => el === document.activeElement && el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none'))
  if (theme === 'light' && width <= 430) await start(page).tap()
  else await page.keyboard.press('Enter')
  const word = page.locator('#guided-learn-title')
  const firstWord = await word.innerText()
  await page.getByRole('button', { name: 'Voir la traduction' }).click()
  await page.locator('.guided-learn-actions .guided-primary-button').click()
  await page.waitForFunction(first => document.querySelector('#guided-learn-title')?.textContent !== first, firstWord)
  await quit(page).click()
  await page.getByRole('link', { name: /Repartir du début/ }).first().waitFor()
  const afterStart = await page.evaluate(key => localStorage.getItem(key), progressKey)
  assert.ok(afterStart)
  assert.doesNotMatch(afterStart, /completedAt/)
  await page.locator('.path-continue-card .path-primary-action').click()
  await start(page).waitFor()
  assert.equal(await page.evaluate(key => localStorage.getItem(key), progressKey), afterStart)
  await start(page).click()
  assert.equal(await word.innerText(), firstWord)

  await page.goto(base + '/parcours/debutant-couleurs-01')
  item.colorsGeometry = await checkIntro(page, width)
  const colorsIcon = await checkIdentity(page, 'Unité 3 · Couleurs', 'Découvrons les couleurs')
  assert.notEqual(colorsIcon, salutationsIcon)
  assert.match(await page.locator('.guided-lead').innerText(), /6 mots/)
  if ((width === 390 && height === 844) || [768, 1280, 1440].includes(width)) {
    await page.mouse.move(0, 0)
    await page.screenshot({ path: path.join(artifacts, `couleurs-${width}-${theme}.png`) })
  }

  await page.goto(base + '/parcours/avance-noms-01')
  await checkIntro(page, width)
  const namesIcon = await checkIdentity(page, 'Unité 2 · Noms et adjectifs', 'Noms et adjectifs 1')
  assert.notEqual(namesIcon, colorsIcon)
  assert.match(await page.locator('.guided-lead').innerText(), /7 mots/)
  if ((width === 390 && height === 500) || (width === 768 && theme === 'dark')) await checkLongContent(page)

  if (width === 390 && height === 500) {
    await page.goto(base + '/parcours/debutant-salutations-02')
    await checkIntro(page, width)
    assert.equal(await checkIdentity(page, 'Unité 1 · Salutations', 'Quelques mots de politesse'), salutationsIcon)
    assert.match(await page.locator('.guided-lead').innerText(), /5 mots/)
    await page.goto(base + '/parcours/debutant-temps-essentiel-02')
    await checkIntro(page, width)
    assert.notEqual(await checkIdentity(page, 'Unité 2 · Temps essentiel', 'Les jours autour d’aujourd’hui'), salutationsIcon)
    assert.match(await page.locator('.guided-lead').innerText(), /4 mots/)
    await page.goto(base + '/parcours/intermediaire-calendrier-02')
    await checkIntro(page, width)
    await checkIdentity(page, 'Unité 1 · Calendrier', 'De janvier à juin')
    assert.match(await page.locator('.guided-lead').innerText(), /6 mots/)
    item.longText = true
  }
}

try {
  for (const [width, height, scale = 1] of formats) for (const theme of ['light', 'dark']) {
    const item = { width, height, scale, theme, errors: [], writes: [] }
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme,
      isMobile: width <= 430, hasTouch: width <= 430, reducedMotion: 'reduce', deviceScaleFactor: scale })
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
    page.on('pageerror', error => item.errors.push(`${page.url()} — ${error.message}`))
    try {
      await checkJourney(page, item)
      assert.deepEqual(item.errors, [])
      assert.deepEqual(item.writes, [])
      item.passed = true
      console.log(width, height, theme, 'OK')
    } catch (error) {
      item.failure = error.stack
      console.error(width, height, theme, error.message)
      await page.screenshot({ path: path.join(artifacts, `failure-${width}-${height}-${theme}.png`) }).catch(() => {})
    } finally {
      results.push(item)
      await context.close()
    }
  }
} finally {
  await browser.close()
  await fs.writeFile(path.join(artifacts, 'guided-intro-results.json'), JSON.stringify(results, null, 2))
}
assert.equal(results.filter(item => item.passed).length, formats.length * 2)
