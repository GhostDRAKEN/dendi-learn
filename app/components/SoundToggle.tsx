'use client'

import { useSoundFeedback } from './SoundProvider'

export default function SoundToggle({ compact = false }: { compact?: boolean }) {
  const { soundEnabled, toggleSound } = useSoundFeedback()

  return (
    <button
      type="button"
      className={`site-nav-action site-sound-toggle${compact ? ' sound-toggle-compact' : ''}`}
      onClick={toggleSound}
      aria-label={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
      aria-pressed={soundEnabled}
      title={soundEnabled ? 'Son activé' : 'Son désactivé'}
    >
      <span className="sound-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 9h4l4-3.5v13L9 15H5V9Z" />
          {soundEnabled ? (
            <>
              <path d="M16 9.5c1.2 1.4 1.2 3.6 0 5" />
              <path d="M18.5 7c2.6 2.8 2.6 7.2 0 10" />
            </>
          ) : (
            <path d="m16 9 5 6m0-6-5 6" />
          )}
        </svg>
      </span>
      <span className="sound-toggle-label">{soundEnabled ? 'Son' : 'Muet'}</span>
    </button>
  )
}
