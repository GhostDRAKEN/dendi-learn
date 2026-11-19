const emptyIds: ReadonlySet<number> = new Set()

type AccountProgress = {
  scope: number
  owner: 'checking' | 'guest' | 'account'
  status: 'loading' | 'ready' | 'error'
  ids: ReadonlySet<number>
  saveFailed: boolean
}

const initial: AccountProgress = {
  scope: 0, owner: 'checking', status: 'loading', ids: emptyIds, saveFailed: false,
}

export function createExplorerAccountProgress(api: {
  load: (userId: string) => Promise<number[]>
  save: (userId: string, wordId: number) => Promise<void>
}) {
  let snapshot = initial
  let ownerId: string | null | undefined
  let saved = new Set<number>()
  let pending = new Set<number>()
  let failed = new Set<number>()
  const listeners = new Set<() => void>()

  function publish(next: AccountProgress) {
    snapshot = next
    listeners.forEach(listener => listener())
  }

  function setOwner(userId: string | null | undefined) {
    if (ownerId === userId) return
    ownerId = userId
    saved = new Set()
    pending = new Set()
    failed = new Set()
    const scope = snapshot.scope + 1
    publish({
      ...initial,
      scope,
      owner: userId === undefined ? 'checking' : userId === null ? 'guest' : 'account',
    })
    if (userId == null) return

    // Leave the synchronous Supabase auth event before querying the client.
    void Promise.resolve().then(async () => {
      if (snapshot.scope !== scope) return
      try {
        const ids = await api.load(userId)
        if (snapshot.scope !== scope) return
        for (const id of ids) {
          saved.add(id)
          failed.delete(id)
        }
        publish({ ...snapshot, status: 'ready', ids: new Set([...snapshot.ids, ...ids]), saveFailed: failed.size > 0 })
      } catch {
        if (snapshot.scope === scope) publish({ ...snapshot, status: 'error' })
      }
    })
  }

  function consult(scope: number, id: number) {
    const userId = ownerId
    if (scope !== snapshot.scope || !userId || saved.has(id) || pending.has(id)) return
    pending.add(id)
    publish({ ...snapshot, ids: new Set([...snapshot.ids, id]) })
    void Promise.resolve().then(async () => {
      if (snapshot.scope !== scope) return
      try {
        await api.save(userId, id)
        if (snapshot.scope !== scope) return
        saved.add(id)
        failed.delete(id)
      } catch {
        if (snapshot.scope !== scope) return
        if (!saved.has(id)) failed.add(id)
      }
      pending.delete(id)
      publish({ ...snapshot, saveFailed: failed.size > 0 })
    })
  }

  return {
    getServerSnapshot: () => initial,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    setOwner,
    consult,
  }
}
