import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGuestWordHistory, GUEST_WORD_HISTORY_KEY } from '../lib/guest-word-history.ts'

function storage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

test('SSR starts unresolved and unique word IDs survive a fresh store on the same storage', () => {
  const local = storage()
  const guest = createGuestWordHistory(() => local)
  assert.equal(guest.getServerSnapshot().status, 'loading')
  assert.strictEqual(guest.getSnapshot(), guest.getSnapshot())
  guest.consult(1)
  guest.consult(1)
  guest.consult(2)
  for (const id of [0, -1, '3', 1.5, NaN, null]) guest.consult(id)
  assert.deepEqual(JSON.parse(local.getItem(GUEST_WORD_HISTORY_KEY)), { version: 1, ids: [1, 2] })
  const fresh = createGuestWordHistory(() => local)
  assert.deepEqual(fresh.getSnapshot(), { ids: new Set([1, 2]), status: 'local' })
})

test('external changes are read before saving and deletion clears previously stored history', () => {
  const local = storage()
  const first = createGuestWordHistory(() => local)
  const second = createGuestWordHistory(() => local)
  first.consult(1)
  second.consult(2)
  first.consult(3)
  assert.deepEqual(second.getSnapshot().ids, new Set([1, 2, 3]))
  local.removeItem(GUEST_WORD_HISTORY_KEY)
  assert.deepEqual(first.getSnapshot().ids, new Set())
})

test('corrupted or future-format history is preserved until explicit recovery', () => {
  const local = storage()
  const guest = createGuestWordHistory(() => local)
  for (const raw of ['{illisible', '{"version":99,"ids":[4]}']) {
    local.setItem(GUEST_WORD_HISTORY_KEY, raw)
    assert.equal(guest.getSnapshot().status, 'invalid')
    guest.consult(6)
    assert.equal(local.getItem(GUEST_WORD_HISTORY_KEY), raw)
    assert.ok(guest.getSnapshot().ids.has(6))
    guest.resetInvalidHistory()
    assert.equal(guest.getSnapshot().status, 'local')
    assert.ok(JSON.parse(local.getItem(GUEST_WORD_HISTORY_KEY)).ids.includes(6))
  }
})

test('failed reads preserve storage and keep new visits available in the current tab', () => {
  const local = storage()
  local.setItem(GUEST_WORD_HISTORY_KEY, '{"version":1,"ids":[1]}')
  let rejectRead = true
  const guest = createGuestWordHistory(() => ({
    ...local,
    getItem(key) {
      if (rejectRead) throw new Error('blocked')
      return local.getItem(key)
    },
  }))
  guest.consult(2)
  assert.deepEqual(guest.getSnapshot(), { ids: new Set([2]), status: 'temporary' })
  assert.deepEqual(JSON.parse(local.getItem(GUEST_WORD_HISTORY_KEY)).ids, [1])
  rejectRead = false
  assert.deepEqual(guest.getSnapshot().ids, new Set([1, 2]))
  guest.consult(2)
  assert.deepEqual(guest.getSnapshot(), { ids: new Set([1, 2]), status: 'local' })
})

test('failed writes do not count as persisted and can be retried by revealing the same word', () => {
  const local = storage()
  let rejectWrite = true
  const guest = createGuestWordHistory(() => ({
    ...local,
    setItem(key, value) {
      if (rejectWrite) throw new Error('quota')
      local.setItem(key, value)
    },
  }))
  guest.consult(8)
  assert.deepEqual(guest.getSnapshot(), { ids: new Set([8]), status: 'temporary' })
  assert.equal(local.getItem(GUEST_WORD_HISTORY_KEY), null)
  rejectWrite = false
  guest.consult(8)
  assert.deepEqual(guest.getSnapshot(), { ids: new Set([8]), status: 'local' })
})
