// One manual linguistic stream, independent of SoundProvider and its preference.
type PlaybackState = {
  owner: symbol | null
  status: 'idle' | 'loading' | 'playing' | 'error'
}

const idle: PlaybackState = { owner: null, status: 'idle' }
let state = idle
let active: HTMLAudioElement | null = null
let loadingTimeout: ReturnType<typeof setTimeout> | null = null
const LOADING_TIMEOUT_MS = 10_000
const listeners = new Set<() => void>()

function publish(next: PlaybackState) {
  state = next
  listeners.forEach((listener) => listener())
}

export function subscribePronunciation(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const getPlaybackState = () => state
export const getServerPlaybackState = () => idle

function clearLoadingTimeout() {
  if (loadingTimeout !== null) clearTimeout(loadingTimeout)
  loadingTimeout = null
}

export function stopPronunciation(owner?: symbol) {
  if (owner && state.owner !== owner) return
  clearLoadingTimeout()
  const previous = active
  active = null
  if (previous) {
    previous.onended = null
    previous.onerror = null
    previous.pause()
    previous.removeAttribute('src')
    previous.load()
  }
  publish(idle)
}

export async function playPronunciation(owner: symbol, src: string) {
  stopPronunciation()
  publish({ owner, status: 'loading' })
  let audio: HTMLAudioElement | null = null
  const fail = () => {
    if (state.owner !== owner || active !== audio) return
    stopPronunciation(owner)
    publish({ owner, status: 'error' })
  }
  try {
    audio = new Audio(src)
    active = audio
    audio.preload = 'none'
    audio.onended = () => { if (active === audio) stopPronunciation(owner) }
    audio.onerror = fail
    loadingTimeout = setTimeout(() => {
      if (state.status === 'loading') fail()
    }, LOADING_TIMEOUT_MS)
    await audio.play()
    if (active === audio) {
      clearLoadingTimeout()
      publish({ owner, status: 'playing' })
    }
  } catch {
    fail()
  }
}
