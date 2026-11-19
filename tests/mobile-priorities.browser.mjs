// Optional real-browser regression test; uses an existing Playwright installation.
// No production writes, seeded progress, new dependencies or generated Dendi audio.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { registerHooks } from 'node:module'
import { buildCurriculum, flattenLessons } from '../lib/curriculum.ts'
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === './curriculum' && context.parentURL?.endsWith('/lib/lesson-exercises.ts') ? './curriculum.ts' : specifier, context)
} })
const { createLessonExercises } = await import('../lib/lesson-exercises.ts')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3001'
const out = process.env.TEST_ARTIFACTS_DIR || path.join(os.tmpdir(), 'dendi-mobile-priorities')
await fs.mkdir(out, { recursive: true })

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted
    } else if (c === ',' && !quoted) { row.push(field); field = '' }
    else if (c === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const [columns, ...values] = rows
  return values.map(value => Object.fromEntries(columns.map((key, i) => [key, value[i] ?? ''])))
}
const inventory = parseCSV(await fs.readFile(new URL('../docs/data/dendi-content-audit.csv', import.meta.url), 'utf8'))
const lesson = flattenLessons(buildCurriculum(inventory.map(w => ({ ...w, id: Number(w.word_id) })))).find(l => l.id === 'debutant-salutations-02')
const exercises = createLessonExercises(lesson)

async function settle(page) {
  await page.locator('main').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
}
async function shot(page, name) { await settle(page); await page.screenshot({ path: path.join(out, name + '.png') }) }
async function focusBounds(locator) {
  return locator.evaluate(e => {
    const r = e.getBoundingClientRect(), nav = document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect(), banner = document.querySelector('.signup-banner')?.getBoundingClientRect()
    const limit = Math.min(nav?.height ? nav.top : innerHeight, banner?.top ?? innerHeight)
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return { focused: document.activeElement === e, top: r.top, bottom: r.bottom, width: r.width, height: r.height, limit, covered: !e.contains(hit) }
  })
}
async function contrast(locator) {
  return locator.evaluate(e => {
    const rgba = s => { const m = s.match(/^rgba?\(([^)]+)\)$/); return m ? m[1].split(/,\s*/).map(Number) : null }
    const over = (a, b) => [...a.slice(0, 3).map((v, i) => v * (a[3] ?? 1) + b[i] * (1 - (a[3] ?? 1))), 1]
    const lum = c => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0)
    let bg = [255, 255, 255, 1], gradient = false
    const chain = []; for (let a = e; a; a = a.parentElement) chain.unshift(a)
    for (const a of chain) {
      const c = getComputedStyle(a), color = rgba(c.backgroundColor)
      if (color) { bg = over(color, bg); if ((color[3] ?? 1) === 1) gradient = false }
      if (c.backgroundImage !== 'none') gradient = true
    }
    const c = getComputedStyle(e), fg = rgba(c.color), fc = over(fg, bg)
    const ratio = (Math.max(lum(fc), lum(bg)) + .05) / (Math.min(lum(fc), lum(bg)) + .05)
    return { text: e.innerText?.slice(0, 90), color: c.color, background: bg, ratio, gradient, outlineColor: c.outlineColor, outlineWidth: c.outlineWidth, disabled: !!e.closest(':disabled,[aria-disabled=true],.is-disabled') }
  })
}
async function checkText(page, selector, records, state = 'normal') {
  for (const e of await page.locator(selector).all()) {
    if (!await e.isVisible()) continue
    const data = { selector, state, ...await contrast(e) }; records.push(data)
    if (!data.disabled && !data.gradient) assert.ok(data.ratio >= 4.5, `${selector} ${state}: ${data.ratio} (${data.text})`)
  }
}
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
const results = []
try {
  for (const width of [320, 360, 390, 430, 768, 1280]) for (const theme of ['light', 'dark']) {
    const height = ({ 320: 740, 360: 800, 390: 844, 430: 932, 768: 1024, 1280: 900 })[width]
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width <= 430, hasTouch: width <= 430, colorScheme: theme })
    const item = { width, theme, contrasts: [], errors: [], blocked: [] }, prefix = `after-${width}-${theme}`
    await context.addInitScript(theme => {
      localStorage.setItem('dendi-theme', theme)
      const NativeAudio = window.Audio
      window.__recordings = []
      window.Audio = function (src) { const a = new NativeAudio(src); if (src?.includes('/audio/dendi/')) window.__recordings.push(a); return a }
      window.Audio.prototype = NativeAudio.prototype
    }, theme)
    await context.route('**/*', route => {
      const r = route.request()
      if (/\/(rest|auth)\/v1\//.test(r.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) { item.blocked.push(r.method()); return route.abort() }
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', e => item.errors.push(e.message))
    try {
      await page.goto(base + '/apprendre'); await settle(page)
      item.explorerCount = await page.locator('.learn-progress-count').innerText()
      assert.match(item.explorerCount, /181/)
      const search = page.getByRole('combobox', { name: /Rechercher un mot/ })
      await search.fill('De rien'); await page.locator('#learn-title').click()
      assert.equal(await page.locator('.mot-card').count(), 0)
      await search.fill('Bonjour'); await page.locator('#learn-title').click()
      await page.locator('.mot-card-front').first().click()
      const audio = page.locator('.pronunciation-button').first()
      await audio.scrollIntoViewIfNeeded()
      await page.locator('.mot-card:has(.pronunciation-button) .mot-card-text-action').first().focus(); await page.keyboard.press('Tab')
      await page.waitForTimeout(50)
      item.focus = await focusBounds(audio)
      assert.equal(item.focus.focused, true)
      assert.equal(item.focus.covered, false)
      assert.ok(item.focus.bottom <= item.focus.limit - 5)
      await shot(page, prefix + '-focus')
      if (width <= 430) {
        // Native playback, loading/error and repeated clicks; no synthetic recording.
        const sound = page.getByRole('button', { name: /Désactiver les sons d.interface/ }).first()
        if (await sound.count()) await sound.click()
        const dimensions = await audio.boundingBox()
        let release; const hold = new Promise(r => release = r)
        await page.route('**/audio/dendi/*.wav', async r => { await hold; await r.continue() })
        await audio.click(); await page.waitForFunction(() => document.querySelector('.pronunciation-button')?.dataset.playbackState === 'loading')
        assert.ok(Math.abs((await audio.boundingBox()).height - dimensions.height) < 0.1)
        await shot(page, prefix + '-audio-loading'); release()
        await page.waitForFunction(() => window.__recordings.at(-1)?.currentTime > 0)
        await audio.evaluate(b => { for (let i = 0; i < 5; i++) b.click() })
        await page.waitForFunction(() => window.__recordings.at(-1)?.currentTime > 0)
        assert.equal(await page.evaluate(() => window.__recordings.filter(a => !a.paused && !a.ended).length), 1)
        await page.waitForFunction(() => document.querySelector('.pronunciation-button')?.dataset.playbackState === 'idle')
        await page.unroute('**/audio/dendi/*.wav')
        await page.route('**/audio/dendi/*.wav', r => r.abort())
        await audio.click(); await page.waitForFunction(() => document.querySelector('.pronunciation-button')?.dataset.playbackState === 'error')
        assert.ok(Math.abs((await audio.boundingBox()).height - dimensions.height) < 0.1)
        assert.ok(Math.abs((await audio.boundingBox()).width - dimensions.width) < 0.1)
        await shot(page, prefix + '-audio-error')
        await page.unroute('**/audio/dendi/*.wav')
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await audio.click(); await page.waitForFunction(() => window.__recordings.at(-1)?.currentTime > 0)
        item.reducedMotion = await audio.locator('.pronunciation-waves').evaluate(e => getComputedStyle(e).animationName)
        assert.equal(item.reducedMotion, 'none')
        await page.waitForFunction(() => document.querySelector('.pronunciation-button')?.dataset.playbackState === 'idle')
      }
      await search.fill(''); await page.locator('#learn-title').click()
      for (let i = 0; i < 9; i++) await page.locator('.mot-card-front').first().click()
      const banner = page.locator('.signup-banner')
      await banner.waitFor(); await settle(page)
      if (width === 390) {
        const nav = page.locator('.mobile-bottom-nav')
        const originalHeight = await nav.evaluate(e => e.getBoundingClientRect().height)
        // Simulate a larger safe-area padding; this is not a physical-device test.
        await nav.evaluate(e => e.style.paddingBottom = '34px')
        await page.waitForFunction(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-height')) > 90)
        assert.ok(await banner.evaluate(e => e.getBoundingClientRect().bottom <= document.querySelector('.mobile-bottom-nav').getBoundingClientRect().top - 12))
        await nav.evaluate(e => e.style.removeProperty('padding-bottom'))
        await page.waitForFunction(height => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-height')) === height, originalHeight)
        item.safeAreaSimulation = true
      }
      item.banner = await banner.evaluate(e => {
        const r = e.getBoundingClientRect(), nav = document.querySelector('.mobile-bottom-nav')?.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, width: r.width, height: r.height, limit: nav?.height ? nav.top : innerHeight, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth, controls: [...e.querySelectorAll('a,button')].map(b => { const x = b.getBoundingClientRect(); return { height: x.height, left: x.left, right: x.right, bottom: x.bottom, within: x.left >= r.left && x.right <= r.right && x.bottom <= r.bottom } }) }
      })
      assert.ok(item.banner.bottom <= item.banner.limit - 10)
      assert.equal(item.banner.scrollWidth, item.banner.clientWidth)
      assert.ok(item.banner.controls.every(b => b.within && b.height >= 44))
      await checkText(page, '.signup-banner-title,.signup-banner-copy,.signup-banner-actions a,.signup-banner-actions button', item.contrasts)
      await shot(page, prefix + '-banner')
      if (width <= 430) {
        await page.locator('.mot-card:has(.pronunciation-button) .mot-card-text-action').first().focus(); await page.keyboard.press('Tab'); await page.waitForTimeout(50)
        item.bannerAudioFocus = await focusBounds(audio)
        assert.equal(item.bannerAudioFocus.covered, false)
        assert.ok(item.bannerAudioFocus.bottom <= item.bannerAudioFocus.limit - 5)
        await shot(page, prefix + '-banner-focus')
        // Follow real Tab order, including content, footer and fixed controls.
        item.focusChecks = 0
        for (let i = 0; i < 40; i++) {
          await page.keyboard.press('Tab'); await page.waitForTimeout(25)
          const visible = await page.evaluate(() => {
            const e = document.activeElement
            if (!(e instanceof HTMLElement) || e === document.body || e.closest('.mobile-bottom-nav,.signup-banner')) return true
            const r = e.getBoundingClientRect(), n = document.querySelector('.mobile-bottom-nav').getBoundingClientRect(), b = document.querySelector('.signup-banner').getBoundingClientRect()
            return r.top >= 0 && r.bottom <= Math.min(n.top, b.top)
          })
          assert.ok(visible, 'Tab focus hidden by a fixed surface'); item.focusChecks++
        }
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(50)
      const footer = await page.locator('.site-footer a').first().boundingBox()
      assert.ok(footer.y + footer.height < item.banner.top)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('button', { name: 'Plus tard', exact: true }).click()
      await banner.waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--signup-banner-height')), '')
      await page.reload(); await settle(page)
      // M06: the same ten consultations are restored after reloading.
      await banner.waitFor()
      await page.locator('.signup-banner-action').click(); await page.waitForURL('**/inscription')
      item.signupLink = true

      for (const route of ['bienvenue', 'niveaux', 'connexion', 'inscription']) {
        await page.goto(base + '/' + route); await settle(page)
        if (route === 'niveaux') await page.locator('.level-card').first().click()
        if (route === 'connexion' || route === 'inscription') await page.locator('.auth-page button').click() // empty fields: no network submission
        const selectors = route === 'bienvenue' ? '.welcome-primary-action' : route === 'niveaux' ? '.levels-primary-action,.level-card-selection,.levels-unsure-button strong' : '.auth-page button,.auth-page a,.auth-page p[style*="negative-text"]'
        await checkText(page, selectors, item.contrasts)
        const primary = page.locator(route === 'bienvenue' ? '.welcome-primary-action' : route === 'niveaux' ? '.levels-primary-action' : '.auth-page button').first()
        await primary.hover(); await page.waitForTimeout(200); await checkText(page, selectors, item.contrasts, 'hover')
        await primary.focus(); await checkText(page, selectors, item.contrasts, 'focus')
        await shot(page, prefix + '-' + route)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      }
      await page.goto(base + '/parcours/debutant-salutations-02'); await settle(page)
      item.lessonIntro = await page.locator('.guided-lead').innerText(); assert.match(item.lessonIntro, /5 mots/)
      await checkText(page, '.guided-primary-button,.guided-eyebrow,.guided-exit', item.contrasts)
      await page.locator('.guided-primary-button').click()
      const actualWords = []
      for (const word of lesson.mots) {
        const actual = await page.locator('#guided-learn-title').textContent(); actualWords.push(actual)
        assert.equal(actual, word.dendi)
        await page.locator('.guided-reveal-button').click()
        await checkText(page, '.guided-primary-button', item.contrasts)
        await page.locator('.guided-primary-button').click()
      }
      item.words = actualWords
      await shot(page, prefix + '-practice')
      if ((width === 320 && theme === 'dark') || (width === 390 && theme === 'light')) {
        for (const q of exercises.practice) {
          assert.equal(await page.locator('#guided-practice-title').textContent(), q.prompt)
          await page.getByRole('button', { name: q.correctAnswer.trim(), exact: true }).click()
          await checkText(page, '.guided-feedback p', item.contrasts)
          await page.locator('.guided-primary-button').click()
        }
        for (const [i, q] of exercises.test.entries()) {
          assert.equal(await page.locator('#guided-test-title').textContent(), q.prompt)
          const answer = i === 0 ? q.options.find(o => o !== q.correctAnswer) : q.correctAnswer
          await page.getByRole('button', { name: answer.trim(), exact: true }).click()
          await checkText(page, '.guided-feedback p', item.contrasts)
          await page.locator('.guided-primary-button').click()
        }
        assert.equal(await page.locator('.guided-review-card h2').textContent(), exercises.test[0].mot.dendi)
        assert.equal(await page.locator('main').innerText().then(t => /\bN\/A\b/.test(t)), false)
        await shot(page, prefix + '-review')
        await page.locator('.guided-primary-button').click()
        await page.locator('#guided-result-title').waitFor()
        item.score = await page.locator('.guided-score strong').innerText(); assert.equal(item.score, '4 / 5')
        await shot(page, prefix + '-result')
        await page.getByRole('link', { name: 'Retour au parcours', exact: true }).click(); await page.waitForURL(/\/parcours\?niveau=/)
        await page.waitForFunction(() => document.querySelector('.path-level-progress [role=progressbar]')?.getAttribute('aria-valuenow') === '1')
        await page.reload(); await settle(page)
        await page.waitForFunction(() => document.querySelector('.path-level-progress [role=progressbar]')?.getAttribute('aria-valuenow') === '1')
        item.completedAfterRefresh = 1
      }
      assert.deepEqual(item.errors, [])
      assert.deepEqual(item.blocked, [])
      item.passed = true
    } catch (e) { item.failure = e.stack; await page.screenshot({ path: path.join(out, prefix + '-failure.png') }).catch(() => {}) }
    finally { results.push(item); await context.close(); console.log(JSON.stringify({ width, theme, passed: item.passed, failure: item.failure, focus: item.focus, banner: item.banner, score: item.score })) }
  }
} finally { await browser.close(); await fs.writeFile(path.join(out, 'browser-results.json'), JSON.stringify(results, null, 2)) }
assert.ok(results.every(r => r.passed), `Some browser checks failed; see ${out}`)
