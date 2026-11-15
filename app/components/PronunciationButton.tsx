'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getPronunciation } from '@/lib/pronunciation'
import {
  getPlaybackState, getServerPlaybackState, playPronunciation,
  stopPronunciation, subscribePronunciation,
} from '@/lib/pronunciation-player'

type Props = { wordId: number; word: string; audioUrl?: string }

export default function PronunciationButton({ wordId, word, audioUrl }: Props) {
  const src = audioUrl ?? getPronunciation(wordId)?.path
  if (!src) return null
  // Changing words or resolved URLs disposes the previous playback owner.
  return <AvailablePronunciation key={`${wordId}:${src}`} word={word} src={src} />
}

function AvailablePronunciation({ word, src }: { word: string; src: string }) {
  const [owner] = useState(() => Symbol('pronunciation'))
  const state = useSyncExternalStore(subscribePronunciation, getPlaybackState, getServerPlaybackState)
  const status = state.owner === owner ? state.status : 'idle'
  const label = status === 'loading'
    ? `Chargement de la prononciation de ${word}`
    : status === 'playing'
      ? `Prononciation de ${word} en cours. Réécouter depuis le début`
      : status === 'error'
        ? `Réessayer la prononciation de ${word}`
        : `Écouter la prononciation de ${word}`

  useEffect(() => () => stopPronunciation(owner), [owner])

  const listen = () => {
    // Read the live store so rapid clicks cannot queue requests before React renders.
    const current = getPlaybackState()
    if (current.owner === owner && current.status === 'loading') return
    void playPronunciation(owner, src)
  }

  return (
    <div className="pronunciation-action">
      <button
        type="button"
        className="pronunciation-button"
        data-playback-state={status}
        aria-label={label}
        aria-busy={status === 'loading'}
        onClick={listen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          <g className="pronunciation-waves">
            <path d="M16 9c2 2 2 4 0 6 M19 6c4 4 4 8 0 12" />
          </g>
        </svg>
        <span>Écouter</span>
      </button>
      {status === 'error' && <span className="pronunciation-error" aria-hidden="true">Audio indisponible</span>}
      <span className="pronunciation-announcement" role="status" aria-live="polite" aria-atomic="true">
        {status === 'error'
          ? `Audio indisponible pour ${word}. Vous pouvez réessayer.`
          : status === 'loading'
            ? `Chargement de la prononciation de ${word}.`
            : status === 'playing' ? `Prononciation de ${word} en cours.` : ''}
      </span>
    </div>
  )
}
