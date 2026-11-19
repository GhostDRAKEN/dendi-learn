import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getFocusScrollDelta } from '../lib/fixed-surfaces.ts'

test('a focused audio control is lifted above the nav, including its focus ring', () => {
  assert.ok(Math.abs(getFocusScrollDelta({ top: 791.34, bottom: 835.34 }, 777) - 70.34) < 0.001)
  assert.equal(getFocusScrollDelta({ top: 400, bottom: 444 }, 777), 0)
})
test('the banner becomes the upper limit and backward focus can scroll upward', () => {
  assert.equal(getFocusScrollDelta({ top: 600, bottom: 644 }, 580), 76)
  assert.equal(getFocusScrollDelta({ top: -10, bottom: 34 }, 580), -22)
})
