// Run against a local build using the existing Playwright browser test environment.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const artifacts = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-explorer-discovery')
const historyKey = 'dendi-explorer-words:v1:guest'
const results = []
await fs.mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true })

const search = page => page.getByRole('combobox', { name: /^Rechercher un mot/ })
const themes = page => page.getByRole('heading', { name: 'Explorer par thème' })
const theme = (page, name) => page.locator('.learn-theme-grid').getByRole('link', { name })
const word = (page, name) => page.getByRole('button', { name: 'Révéler la traduction Dendi de ' + name, exact: true })
const clear = page => page.getByRole('button', { name: 'Effacer la recherche' }).click()
const changeTheme = page => page.getByRole('link', { name: 'Changer de thème' })

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
}
async function count(page, text) {
  await page.locator('.learn-progress[aria-busy=false] .learn-progress-count').filter({ hasText: text }).waitFor()
}
async function screenshot(page, file) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: path.join(artifacts, file) })
}

async function checkDiscovery(page, width, themeName) {
  await page.goto(base + '/apprendre')
  await themes(page).waitFor()
  assert.equal(await page.locator('.mot-card, .learn-progress-count').count(), 0)
  const links = page.locator('.learn-theme-grid a')
  assert.equal(await links.count(), 7)
  const labels = await links.allTextContents()
  assert.equal(labels.reduce((sum, label) => sum + Number(label.match(/(\d+) mots?/)[1]), 0), 181)
  const quiz = page.getByRole('button', { name: 'Quiz libre', exact: true })
  assert.equal(await quiz.count(), 0)
  assert.equal(await page.locator('.learn-tools').getByRole('link', { name: 'Choisir un niveau de parcours' }).count(), 0)
  assert.equal(await page.getByText('Niveau affiché', { exact: false }).count(), 0)
  assert.ok(await page.locator('.learn-discovery').evaluate(section => !section.nextElementSibling))
  const spaceAfterThemes = await page.locator('.learn-discovery').evaluate(section =>
    document.querySelector('.site-footer').getBoundingClientRect().top - section.getBoundingClientRect().bottom)
  assert.ok(spaceAfterThemes >= 0 && spaceAfterThemes <= 40, `Espacement après les thèmes : ${spaceAfterThemes}px`)
  assert.ok(await links.evaluateAll(items => items.every(e => e.getBoundingClientRect().height >= 44 && e.scrollWidth <= e.clientWidth + 1)))
  await noOverflow(page)
  if (themeName === 'light' && [390, 1280].includes(width)) await screenshot(page, `accueil-${width}-clair.png`)

  const salutations = theme(page, /^Salutations/)
  await salutations.focus()
  await page.keyboard.press('Enter')
  await page.waitForURL('**/apprendre?categorie=Salutations')
  await page.waitForFunction(() => document.activeElement?.textContent === 'Salutations')
  await count(page, /^0 \/ 18$/)
  assert.equal(await page.locator('.mot-card').count(), 18)
  assert.equal(await quiz.getAttribute('aria-haspopup'), 'dialog')
  assert.ok(await quiz.evaluate(button => !button.disabled && button.getBoundingClientRect().height >= 44 &&
    document.getElementById(button.getAttribute('aria-describedby'))?.textContent === 'Tous les thèmes du lexique'))
  assert.equal(await page.evaluate(key => localStorage.getItem(key), historyKey), null)
  await noOverflow(page)
  if (themeName === 'light' && [390, 1280].includes(width)) await screenshot(page, `salutations-${width}-clair.png`)
  await word(page, 'Bonjour (matin)').click()
  await count(page, /^1 \/ 18$/)
  if (themeName === 'light' && width === 390) {
    await page.getByRole('button', { name: /^Écouter la prononciation/ }).click()
    await page.waitForFunction(() => window.explorerRecordings.some(audio => audio.currentTime > 0))
    await count(page, /^1 \/ 18$/)
  }
  await page.reload()
  await count(page, /^1 \/ 18$/)
  await page.goBack()
  await themes(page).waitFor()
  await page.goForward()
  await count(page, /^1 \/ 18$/)
  const nav = page.locator(width <= 700 ? '.mobile-bottom-nav' : '.site-primary-nav')
  await nav.getByRole('link', { name: 'Parcours', exact: true }).click()
  await page.waitForURL(url => url.pathname === '/parcours')
  await nav.getByRole('link', { name: 'Explorer', exact: true }).click()
  await themes(page).waitFor()
  await theme(page, /^Salutations/).click()
  await count(page, /^1 \/ 18$/)
  await changeTheme(page).click()
  await themes(page).waitFor()
  await page.waitForFunction(() => document.activeElement?.id === 'learn-themes-title')
  assert.equal(await quiz.count(), 0)

  await theme(page, /^Couleurs/).click()
  await count(page, /^0 \/ 6$/)
  await search(page).fill('Lundi')
  await page.getByRole('heading', { name: 'Aucun mot trouvé' }).waitFor()
  assert.equal(await search(page).getAttribute('aria-expanded'), 'false')
  await count(page, /^0 \/ 6$/)
  await page.getByRole('link', { name: 'Rechercher dans tous les thèmes' }).click()
  await word(page, 'Lundi').waitFor()
  assert.equal(await search(page).inputValue(), 'Lundi')
  await count(page, /^0 \/ 1$/)
  const option = page.getByRole('option', { name: /Lundi.*Litɛni/ })
  await search(page).press('ArrowDown')
  await option.waitFor()
  await search(page).press('Enter')
  await word(page, 'Lundi').click()
  await count(page, /^1 \/ 1$/)
  await clear(page)
  await themes(page).waitFor()
  assert.equal(await page.locator('.mot-card, .learn-progress-count').count(), 0)
  assert.equal(await quiz.count(), 0)

  await page.goto(base + '/apprendre?niveau=intermediaire&categorie=Salutations')
  await themes(page).waitFor() // A theme unavailable at this level falls back to the grid.
  assert.equal(await theme(page, /^Salutations/).count(), 0)
  assert.ok(await page.getByText('Niveau affiché Intermédiaire').isVisible())
  const allLevels = page.getByRole('link', { name: 'Tous les niveaux dans Explorer' })
  assert.equal(await allLevels.getAttribute('href'), '/apprendre')
  await theme(page, /^Temps/).click()
  const timeNav = page.getByRole('navigation', { name: 'Sous-thèmes de Temps' })
  await timeNav.getByRole('link', { name: 'Semaine' }).click()
  await page.waitForURL(url => url.searchParams.get('categorie') === 'temps__semaine')
  assert.equal(new URL(page.url()).searchParams.get('niveau'), 'intermediaire')
  await count(page, /^1 \/ 7$/)
  assert.equal(await page.locator('.mot-card').count(), 7)
  assert.equal(await timeNav.getByRole('link', { name: 'Semaine' }).getAttribute('aria-current'), 'page')
  assert.equal(await allLevels.getAttribute('href'), '/apprendre?categorie=temps__semaine')
  assert.ok(await quiz.evaluate(button => document.getElementById(button.getAttribute('aria-describedby'))?.textContent === 'Tous les thèmes du niveau Intermédiaire'))
  await quiz.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Quiz Dendi-Learn' })
  await dialog.getByRole('button', { name: 'Tous les mots 68 mots' }).waitFor()
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  await noOverflow(page)
  await changeTheme(page).click()
  await themes(page).waitFor()
  assert.equal(new URL(page.url()).searchParams.get('niveau'), 'intermediaire')
  await noOverflow(page)
}

try {
  for (const [width, height] of [[320, 480], [360, 800], [390, 844], [430, 932], [768, 1024], [1280, 900]]) {
    for (const themeName of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: width <= 700, hasTouch: width <= 700, colorScheme: themeName })
      const result = { width, height, theme: themeName, errors: [], writes: [] }
      results.push(result)
      await context.addInitScript(theme => {
        localStorage.setItem('dendi-theme', theme)
        const NativeAudio = window.Audio
        window.explorerRecordings = []
        window.Audio = function (url) {
          const audio = new NativeAudio(url)
          if (url?.includes('/audio/dendi/')) window.explorerRecordings.push(audio)
          return audio
        }
        window.Audio.prototype = NativeAudio.prototype
      }, themeName)
      await context.route(/\/(rest|auth)\/v1\//, route => {
        const method = route.request().method()
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue()
        result.writes.push(method)
        return route.abort()
      })
      const page = await context.newPage()
      page.setDefaultTimeout(12_000)
      page.on('pageerror', error => result.errors.push(error.message))
      try {
        await checkDiscovery(page, width, themeName)
        assert.deepEqual(result.errors, [])
        assert.deepEqual(result.writes, [])
        result.passed = true
        console.log(width, themeName, 'OK')
      } catch (error) {
        result.failure = error.stack
        console.error(width, themeName, error.message)
        await page.screenshot({ path: path.join(artifacts, `failure-${width}-${themeName}.png`) }).catch(() => {})
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  await fs.writeFile(path.join(artifacts, 'discovery-results.json'), JSON.stringify(results, null, 2))
}
assert.equal(results.filter(result => result.passed).length, 12)
