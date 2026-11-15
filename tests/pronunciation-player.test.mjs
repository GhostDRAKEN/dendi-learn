import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playPronunciation, stopPronunciation, getPlaybackState } from '../lib/pronunciation-player.ts'

// DEV ONLY: fake media API, no audio file and no Dendi association.
const instances = []
class FakeAudio {
  constructor(src) { this.src = src; instances.push(this) }
  play() { return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject }) }
  pause() { this.paused = true }
  removeAttribute() { this.src = '' }
  load() { this.released = true }
}
globalThis.Audio = FakeAudio

test('single stream, obsolete promises, stop, end, error and retry', async () => {
  const a = Symbol('A'), b = Symbol('B')
  const first = playPronunciation(a, 'DEV ONLY A')
  assert.equal(getPlaybackState().status, 'loading')
  const second = playPronunciation(b, 'DEV ONLY B')
  assert.equal(instances[0].paused, true)
  assert.equal(instances[0].released, true)
  instances[0].reject(Error('aborted'))
  await first
  assert.equal(getPlaybackState().owner, b)
  instances[1].resolve()
  await second
  assert.equal(getPlaybackState().status, 'playing')
  stopPronunciation(a)
  assert.equal(getPlaybackState().owner, b)
  instances[1].onended()
  assert.equal(getPlaybackState().status, 'idle')
  const failure = playPronunciation(a, 'DEV ONLY failure')
  instances[2].reject(Error('blocked'))
  await failure
  assert.equal(getPlaybackState().status, 'error')
  const retry = playPronunciation(a, 'DEV ONLY retry')
  instances[3].resolve()
  await retry
  instances[3].onerror()
  assert.equal(getPlaybackState().status, 'error')
  const pending = playPronunciation(a, 'DEV ONLY unmount')
  stopPronunciation(a)
  instances[4].resolve()
  await pending
  assert.equal(getPlaybackState().status, 'idle')
})

test('replaying the same owner restarts one stream and ignores obsolete callbacks', async () => {
  const owner = Symbol('replay')
  const first = playPronunciation(owner, 'DEV ONLY replay')
  const previous = instances.at(-1)
  previous.resolve()
  await first
  const obsoleteError = previous.onerror
  const replay = playPronunciation(owner, 'DEV ONLY replay')
  const current = instances.at(-1)
  assert.notEqual(current, previous)
  assert.equal(previous.paused, true)
  assert.equal(previous.released, true)
  obsoleteError()
  assert.equal(getPlaybackState().status, 'loading')
  current.resolve()
  await replay
  assert.equal(getPlaybackState().status, 'playing')
  current.onended()
  assert.equal(getPlaybackState().status, 'idle')
})

test('a stalled load times out, permits retry and clears obsolete deadlines', async () => {
  const nativeSetTimeout = globalThis.setTimeout
  const nativeClearTimeout = globalThis.clearTimeout
  const deadlines = new Map()
  let next = 0
  globalThis.setTimeout = (callback, delay) => {
    assert.equal(delay, 10_000)
    deadlines.set(++next, callback)
    return next
  }
  globalThis.clearTimeout = (id) => { deadlines.delete(id) }
  const owner = Symbol('deadline')
  try {
    const pending = playPronunciation(owner, 'DEV ONLY stalled')
    const stalled = instances.at(-1)
    assert.equal(deadlines.size, 1)
    deadlines.values().next().value()
    assert.equal(getPlaybackState().status, 'error')
    assert.equal(stalled.paused, true)
    assert.equal(deadlines.size, 0)
    stalled.reject(Error('aborted after timeout'))
    await pending
    const retry = playPronunciation(owner, 'DEV ONLY retry deadline')
    const audio = instances.at(-1)
    const obsoleteDeadline = deadlines.values().next().value
    audio.resolve()
    await retry
    assert.equal(deadlines.size, 0)
    obsoleteDeadline()
    // Even a stale deadline cannot interrupt playback that has already started.
    assert.equal(getPlaybackState().status, 'playing')
    stopPronunciation(owner)
    const cancelled = playPronunciation(owner, 'DEV ONLY cancelled load')
    const cancelledAudio = instances.at(-1)
    const cancelledDeadline = deadlines.values().next().value
    stopPronunciation(owner)
    cancelledDeadline()
    assert.equal(getPlaybackState().status, 'idle')
    cancelledAudio.reject(Error('aborted'))
    await cancelled
    assert.equal(deadlines.size, 0)
  } finally {
    stopPronunciation(owner)
    globalThis.setTimeout = nativeSetTimeout
    globalThis.clearTimeout = nativeClearTimeout
  }
})
