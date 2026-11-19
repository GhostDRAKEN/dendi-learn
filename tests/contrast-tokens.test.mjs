import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const block = selector => css.slice(css.indexOf(selector + ' {')).split('}')[0]
const token = (body, name) => body.match(new RegExp(`--${name}: (#[0-9A-Fa-f]{6});`))[1]
const light = block('body'), dark = block("html[data-theme='dark'] body")
const luminance = hex => hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }

test('brand backgrounds retain readable normal and hover button text', () => {
  assert.ok(ratio('#FFFFFF', '#E07B39') < 3) // original regression
  for (const background of ['#E07B39', '#C9682E']) assert.ok(ratio(token(light, 'on-accent'), background) >= 4.5)
})
test('accent, feedback and secondary texts meet 4.5 against both theme surfaces', () => {
  for (const theme of [light, dark]) for (const background of ['bg', 'card']) {
    for (const name of ['accent-text', 'positive-text', 'negative-text', 'text-muted', 'level-green-text', 'level-purple-text']) {
      const value = ratio(token(theme, name), token(theme, background))
      assert.ok(value >= 4.5, `${name}/${background}: ${value}`)
    }
  }
})
test('control boundaries and focus colors exceed 3 against their theme surfaces', () => {
  for (const theme of [light, dark]) for (const background of ['bg', 'card']) {
    for (const name of ['control-border', 'text']) assert.ok(ratio(token(theme, name), token(theme, background)) >= 3)
  }
})
