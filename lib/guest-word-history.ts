export const GUEST_WORD_HISTORY_KEY = 'dendi-explorer-words:v1:guest'

type GuestWordHistory = {
  ids: ReadonlySet<number>
  status: 'loading' | 'local' | 'temporary' | 'invalid'
}

const initial: GuestWordHistory = { ids: new Set(), status: 'loading' }

function isWordId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function parseHistory(raw: string | null): Set<number> | null {
  if (raw === null) return new Set()
  try {
    const { version, ids } = JSON.parse(raw)
    return version === 1 && Array.isArray(ids) ? new Set(ids.filter(isWordId)) : null
  } catch {
    return null
  }
}

export function createGuestWordHistory(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>) {
  let persisted = new Set<number>()
  const pending = new Set<number>()
  let snapshot = initial
  const listeners = new Set<() => void>()

  function update(status: GuestWordHistory['status']) {
    const ids = new Set([...persisted, ...pending])
    if (status !== snapshot.status || ids.size !== snapshot.ids.size || [...ids].some(id => !snapshot.ids.has(id))) {
      snapshot = { ids, status }
    }
    return snapshot
  }

  function refresh() {
    try {
      const ids = parseHistory(getStorage().getItem(GUEST_WORD_HISTORY_KEY))
      if (ids === null) return 'invalid' as const
      persisted = ids
      for (const id of persisted) pending.delete(id)
      return 'local' as const
    } catch {
      return 'temporary' as const
    }
  }

  function persist() {
    const ids = new Set([...persisted, ...pending])
    try {
      getStorage().setItem(GUEST_WORD_HISTORY_KEY, JSON.stringify({ version: 1, ids: [...ids] }))
      persisted = ids
      pending.clear()
      return 'local' as const
    } catch {
      return 'temporary' as const
    }
  }

  function notify(status: GuestWordHistory['status']) {
    update(status)
    listeners.forEach(listener => listener())
  }

  return {
    getServerSnapshot: () => initial,
    getSnapshot() {
      const status = refresh()
      return update(status === 'local' && pending.size > 0 ? 'temporary' : status)
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    consult(id: number) {
      if (!isWordId(id)) return
      const status = refresh()
      if (!persisted.has(id)) pending.add(id)
      notify(status === 'local' && pending.size > 0 ? persist() : status)
    },
    resetInvalidHistory() {
      // Preserve the underlying value until the user requests recovery.
      if (refresh() === 'invalid') notify(persist())
    },
  }
}

export const guestWordHistory = createGuestWordHistory(() => window.localStorage)

export function subscribeToGuestWordHistory(listener: () => void) {
  const unsubscribe = guestWordHistory.subscribe(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === GUEST_WORD_HISTORY_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    unsubscribe()
    window.removeEventListener('storage', onStorage)
  }
}
