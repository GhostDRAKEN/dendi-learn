'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore } from 'react'

export type SoundEvent = 'welcome' | 'correct' | 'incorrect' | 'phase-complete' | 'lesson-complete'

const SOUND_STORAGE_KEY = 'dendi:sound-enabled'
const SOUND_CHANGE_EVENT = 'dendi-sound-change'

const SOUND_ASSETS: Record<SoundEvent, { src: string; volume: number; available: boolean }> = {
  welcome: { src: '/sounds/welcome.wav', volume: 0.34, available: true },
  correct: { src: '/sounds/correct.wav', volume: 0.28, available: true },
  incorrect: { src: '/sounds/incorrect.wav', volume: 0.22, available: true },
  'phase-complete': { src: '/sounds/phase-complete.wav', volume: 0.3, available: true },
  'lesson-complete': { src: '/sounds/lesson-complete.wav', volume: 0.38, available: true },
}

type SoundContextValue = {
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  toggleSound: () => void
  playSound: (event: SoundEvent) => Promise<void>
}

const SoundContext = createContext<SoundContextValue | null>(null)
let volatileSoundEnabled = true

function subscribeToSound(callback: () => void) {
  const syncStoredSound = (event: StorageEvent) => {
    if (event.key === SOUND_STORAGE_KEY) callback()
  }

  window.addEventListener('storage', syncStoredSound)
  window.addEventListener(SOUND_CHANGE_EVENT, callback)

  return () => {
    window.removeEventListener('storage', syncStoredSound)
    window.removeEventListener(SOUND_CHANGE_EVENT, callback)
  }
}

function getSoundSnapshot() {
  try {
    const storedValue = window.localStorage.getItem(SOUND_STORAGE_KEY)
    if (storedValue === 'true') return true
    if (storedValue === 'false') return false
    return volatileSoundEnabled
  } catch {
    return volatileSoundEnabled
  }
}

function getSoundServerSnapshot() {
  return true
}

export default function SoundProvider({ children }: { children: React.ReactNode }) {
  const soundEnabled = useSyncExternalStore(
    subscribeToSound,
    getSoundSnapshot,
    getSoundServerSnapshot,
  )
  const audioCache = useRef(new Map<SoundEvent, HTMLAudioElement>())
  const activeAudio = useRef<HTMLAudioElement | null>(null)

  const setSoundEnabled = useCallback((enabled: boolean) => {
    volatileSoundEnabled = enabled
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled))
    } catch {
      // La préférence reste utilisable pour la session si le stockage est indisponible.
    }

    if (!enabled && activeAudio.current) {
      activeAudio.current.pause()
      activeAudio.current.currentTime = 0
      activeAudio.current = null
    }

    window.dispatchEvent(new Event(SOUND_CHANGE_EVENT))
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled)
  }, [setSoundEnabled, soundEnabled])

  const playSound = useCallback(async (event: SoundEvent) => {
    if (!soundEnabled) return

    const asset = SOUND_ASSETS[event]
    if (!asset.available) return

    try {
      let audio = audioCache.current.get(event)
      if (!audio) {
        audio = new Audio(asset.src)
        audio.preload = 'auto'
        audio.volume = asset.volume
        audioCache.current.set(event, audio)
      }

      if (activeAudio.current && activeAudio.current !== audio) {
        activeAudio.current.pause()
        activeAudio.current.currentTime = 0
      }

      audio.currentTime = 0
      activeAudio.current = audio
      await audio.play()
    } catch {
      // L’audio est facultatif : un refus navigateur ou un asset absent ne bloque jamais le parcours.
    }
  }, [soundEnabled])

  const value = useMemo<SoundContextValue>(() => ({
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    playSound,
  }), [playSound, setSoundEnabled, soundEnabled, toggleSound])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSoundFeedback() {
  const context = useContext(SoundContext)
  if (!context) throw new Error('useSoundFeedback doit être utilisé dans SoundProvider')
  return context
}
