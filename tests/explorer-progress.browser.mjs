// Run with a local Next.js server and the same environment as mobile-priorities.browser.mjs.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { GUEST_WORD_HISTORY_KEY as key } from '../lib/guest-word-history.ts'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const channel = process.env.BROWSER_CHANNEL || 'msedge'
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const out = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-explorer-progress')
const heights = { 320: 620, 390: 844, 430: 932, 768: 1024, 1280: 900 }
const browser = await chromium.launch({ headless: true, channel })
const results = []
await fs.mkdir(out, { recursive: true })

async function prepare(context, theme) {
  const writes = []
  await context.route(/\/(rest|auth)\/v1\//, route => {
    const method = route.request().method()
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return route.continue()
    writes.push(method)
    return route.abort()
  })
  await context.addInitScript(theme => {
    localStorage.setItem('dendi-theme', theme)
    window.observedProgressCounts = []
    new MutationObserver(() => {
      const count = document.querySelector('.learn-progress-count')?.textContent?.trim()
      if (count && window.observedProgressCounts.at(-1) !== count) window.observedProgressCounts.push(count)
    }).observe(document, { childList: true, subtree: true, characterData: true })
  }, theme)
  return writes
}

const search = page => page.getByRole('combobox', { name: /^Rechercher un mot/ })
const word = (page, name) => page.getByRole('button', {
  name: 'Révéler la traduction Dendi de ' + name, exact: true,
})
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)

async function count(page, expected) {
  await page.locator('.learn-progress[aria-busy=false] .learn-progress-count')
    .filter({ hasText: expected }).waitFor()
}

async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
}

async function go(page, width, label, route) {
  const nav = page.locator(width <= 700 ? '.mobile-bottom-nav' : '.site-primary-nav')
  await nav.getByRole('link', { name: label, exact: true }).click()
  await page.waitForURL(url => url.pathname === route)
}

async function checkGuest(page, width, theme) {
  await page.goto(base + '/apprendre')
  await search(page).fill('Bonjour')
  await count(page, /^0 \/ 2$/)
  assert.equal(await stored(page), null)
  const first = word(page, 'Bonjour (matin)')
  await first.click()
  await count(page, /^1 \/ 2$/)
  assert.deepEqual(await stored(page), { version: 1, ids: [1] })
  await page.getByRole('button', { name: 'Cacher', exact: true }).click()
  await first.click()
  await count(page, /^1 \/ 2$/)
  assert.deepEqual((await stored(page)).ids, [1])

  await go(page, width, 'Parcours', '/parcours')
  await go(page, width, 'Explorer', '/apprendre')
  await search(page).fill('Bonjour')
  await count(page, /^1 \/ 2$/)
  assert.match(await first.innerText(), /Déjà consulté/i)
  await first.scrollIntoViewIfNeeded()
  await noOverflow(page)
  await page.screenshot({ path: path.join(out, `${width}-${theme}-after-return.png`) })
  await word(page, 'Bonjour (après-midi)').click()
  await count(page, /^2 \/ 2$/)
  assert.deepEqual((await stored(page)).ids, [1, 2])

  await page.reload()
  await count(page, /^2 \/ 181$/)
  const observed = await page.evaluate(() => window.observedProgressCounts)
  assert.ok(!observed.some(value => /^0\s*\/\s*181$/.test(value)), JSON.stringify(observed))
  await search(page).fill('Bonjour')
  await count(page, /^2 \/ 2$/)
  await search(page).press('Escape')
  if (width <= 700) await page.getByLabel('Catégorie', { exact: true }).selectOption('couleurs')
  else await page.getByRole('button', { name: /^Couleurs\b/ }).click()
  await count(page, 'Aucun résultat')
  assert.equal(await page.locator('.learn-progress [role=progressbar]').count(), 0)
  await page.getByRole('button', { name: 'Effacer les filtres' }).click()
  await count(page, /^2 \/ 2$/)

  await page.goto(base + '/apprendre?niveau=debutant')
  await search(page).fill('Bonjour')
  await count(page, /^2 \/ 2$/)
  await page.goto(base + '/apprendre?niveau=intermediaire')
  await search(page).fill('Bonjour')
  await count(page, 'Aucun résultat')
  await page.getByRole('link', { name: 'Effacer les filtres' }).click()
  await count(page, /^2 \/ 2$/)
  assert.deepEqual((await stored(page)).ids, [1, 2])
  await noOverflow(page)

  await page.goto(base + '/profil')
  await page.getByText('L’historique invité reste séparé de votre compte.', { exact: true }).waitFor()
  await noOverflow(page)

  if (width === 390) {
    await page.goto(base + '/parcours/debutant-salutations-01')
    await page.getByRole('button', { name: /Commencer la leçon/ }).click()
    await page.getByRole('link', { name: /^Quitter/ }).click()
    await page.waitForURL(url => url.pathname === '/parcours')
    await page.getByText('En cours', { exact: true }).first().waitFor()
    await page.locator('.path-level-progress [role=progressbar][aria-valuenow="0"]').waitFor()
    await page.locator('.path-current-unit .path-unit-header > span').filter({ hasText: '0 leçon terminée sur 3' }).waitFor()
    await page.reload()
    await page.getByText('En cours', { exact: true }).first().waitFor()
    await page.locator('.path-level-progress [role=progressbar][aria-valuenow="0"]').waitFor()
    await page.locator('.path-current-unit .path-unit-header > span').filter({ hasText: '0 leçon terminée sur 3' }).waitFor()
    assert.deepEqual((await stored(page)).ids, [1, 2])
  }
  return { observed, storedIds: [1, 2] }
}

async function checkStorageFailure(kind) {
  const context = await browser.newContext({ viewport: { width: 320, height: 620 } })
  try {
    const writes = await prepare(context, kind === 'corrupt' ? 'light' : 'dark')
    await context.addInitScript(({ key, kind }) => {
      if (kind === 'corrupt') {
        if (!localStorage.getItem(key)) localStorage.setItem(key, '{invalid')
        return
      }
      const read = Storage.prototype.getItem
      const write = Storage.prototype.setItem
      Storage.prototype.getItem = function (name) {
        if (name === key && kind === 'read') throw new DOMException('Blocked', 'SecurityError')
        return read.call(this, name)
      }
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('Blocked', 'QuotaExceededError')
        return write.call(this, name, value)
      }
    }, { key, kind })
    const page = await context.newPage()
    await page.goto(base + '/apprendre')
    await search(page).fill('Bonjour')
    await word(page, 'Bonjour (matin)').click()
    await count(page, /^1 \/ 2$/)
    if (kind === 'corrupt') {
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), '{invalid')
      const reset = page.getByRole('button', { name: 'Réinitialiser l’historique local' })
      await reset.focus()
      await page.keyboard.press('Enter')
      await reset.waitFor({ state: 'detached' })
      assert.ok(await search(page).evaluate(e => e === document.activeElement))
      assert.deepEqual((await stored(page)).ids, [1])
    } else {
      await page.getByText(/Stockage local indisponible/).waitFor()
      await go(page, 320, 'Parcours', '/parcours')
      await go(page, 320, 'Explorer', '/apprendre')
      await search(page).fill('Bonjour')
      await count(page, /^1 \/ 2$/)
    }
    await noOverflow(page)
    await page.screenshot({ path: path.join(out, `storage-${kind}.png`) })
    assert.deepEqual(writes, [])
  } finally {
    await context.close()
  }
}

async function checkBrowserRestart() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dendi-explorer-profile-'))
  try {
    for (const open of [true, false]) {
      const context = await chromium.launchPersistentContext(directory, { headless: true, channel })
      try {
        const writes = await prepare(context, 'light')
        const page = context.pages()[0]
        await page.goto(base + '/apprendre')
        await search(page).fill('Bonjour')
        if (open) {
          await count(page, /^0 \/ 2$/)
          await word(page, 'Bonjour (matin)').click()
        }
        await count(page, /^1 \/ 2$/)
        assert.deepEqual((await stored(page)).ids, [1])
        assert.deepEqual(writes, [])
      } finally {
        await context.close()
      }
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 3 })
  }
}

try {
  for (const width of [320, 390, 430, 768, 1280]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: heights[width] },
        colorScheme: theme,
        isMobile: width <= 700,
        hasTouch: width <= 700,
      })
      const item = { width, theme, errors: [] }
      results.push(item)
      const writes = await prepare(context, theme)
      const page = await context.newPage()
      page.setDefaultTimeout(12_000)
      page.on('pageerror', error => item.errors.push(error.message))
      try {
        Object.assign(item, await checkGuest(page, width, theme))
        assert.deepEqual(item.errors, [])
        assert.deepEqual(writes, [])
        item.passed = true
        console.log(width, theme, 'OK')
      } catch (error) {
        item.failure = error.stack
        console.error(width, theme, error.message)
      } finally {
        await context.close()
      }
    }
  }
  for (const kind of ['read', 'write', 'corrupt']) {
    await checkStorageFailure(kind)
    results.push({ kind, passed: true })
  }
  await checkBrowserRestart()
  results.push({ kind: 'browser-restart', passed: true })
} finally {
  await browser.close()
  await fs.writeFile(path.join(out, 'explorer-progress.json'), JSON.stringify(results, null, 2))
}
assert.equal(results.filter(item => item.passed).length, 14)
