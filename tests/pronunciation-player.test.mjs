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
