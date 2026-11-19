import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createExplorerAccountProgress } from '../lib/explorer-account-progress.ts'

const flush = () => new Promise(resolve => setImmediate(resolve))
const ids = progress => [...progress.getSnapshot().ids]

test('a late response from A cannot reach B, a guest, or a later session of A', async () => {
  const loads = []
  const writes = []
  const progress = createExplorerAccountProgress({
    load: user => new Promise(resolve => loads.push({ user, resolve })),
    save: async (...args) => { writes.push(args) },
  })
  assert.equal(progress.getServerSnapshot().owner, 'checking')
  progress.setOwner(null)
  const guestScope = progress.getSnapshot().scope
  progress.consult(guestScope, 7)
  assert.deepEqual(writes, [])
  progress.setOwner('A')
  const firstA = progress.getSnapshot().scope
  await flush()
  progress.setOwner('B')
  await flush()
  loads[1].resolve([2])
  await flush()
  loads[0].resolve([1])
  progress.consult(firstA, 8)
  progress.consult(guestScope, 7)
  await flush()
  assert.deepEqual(ids(progress), [2])
  assert.deepEqual(writes, [])
  progress.setOwner(null)
  assert.deepEqual(ids(progress), [])
  assert.equal(progress.getSnapshot().owner, 'guest')
  progress.setOwner('A')
  assert.equal(progress.getSnapshot().status, 'loading')
  assert.deepEqual(ids(progress), [])
  await flush()
  loads[2].resolve([1])
  await flush()
  assert.deepEqual(ids(progress), [1])
})

test('in-flight writes are scoped to the original account and a loaded ID is not saved again', async () => {
  let failWrite
  const writes = []
  const progress = createExplorerAccountProgress({
    load: async user => user === 'A' ? [1] : [2],
    save: (user, id) => new Promise((_resolve, reject) => {
      writes.push([user, id])
      failWrite = reject
    }),
  })
  progress.setOwner('A')
  await flush()
  const a = progress.getSnapshot().scope
  progress.consult(a, 1)
  progress.consult(a, 3)
  progress.consult(a, 3)
  await flush()
  assert.deepEqual(writes, [['A', 3]])
  progress.setOwner('B')
  failWrite(new Error('old write'))
  await flush()
  assert.deepEqual(ids(progress), [2])
  assert.equal(progress.getSnapshot().saveFailed, false)
})

test('read failure keeps the account count unavailable without falling back to guest history', async () => {
  const progress = createExplorerAccountProgress({
    load: async () => { throw new Error('offline') },
    save: async () => { throw new Error('offline') },
  })
  progress.setOwner('A')
  await flush()
  assert.equal(progress.getSnapshot().owner, 'account')
  assert.equal(progress.getSnapshot().status, 'error')
  progress.consult(progress.getSnapshot().scope, 4)
  await flush()
  assert.deepEqual(ids(progress), [4])
  assert.equal(progress.getSnapshot().saveFailed, true)
})

test('optimistic visits survive a slow read and a failed save can be retried', async () => {
  let resolveLoad
  let attempts = 0
  const progress = createExplorerAccountProgress({
    load: () => new Promise(resolve => { resolveLoad = resolve }),
    save: async () => { if (++attempts === 1) throw new Error('offline') },
  })
  progress.setOwner('A')
  const a = progress.getSnapshot().scope
  progress.consult(a, 4)
  await flush()
  resolveLoad([1])
  await flush()
  assert.deepEqual(ids(progress), [4, 1])
  assert.equal(progress.getSnapshot().saveFailed, true)
  progress.consult(a, 4)
  await flush()
  assert.equal(attempts, 2)
  assert.equal(progress.getSnapshot().saveFailed, false)
})
