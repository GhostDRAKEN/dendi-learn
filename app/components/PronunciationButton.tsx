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
  const busy = status === 'playing' || status === 'loading'

  useEffect(() => () => stopPronunciation(owner), [owner])

  return (
    <div className="pronunciation-action">
      <button
        type="button"
        className="pronunciation-button"
        aria-label={`${busy ? 'Arrêter' : 'Écouter'} la prononciation de ${word}`}
        onClick={() => busy ? stopPronunciation(owner) : void playPronunciation(owner, src)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {busy ? <path d="M7 7h10v10H7z" /> : <path d="M4 9h4l5-4v14l-5-4H4z M16 9c2 2 2 4 0 6 M19 6c4 4 4 8 0 12" />}
        </svg>
        <span>{status === 'loading' ? 'Chargement… · Arrêter' : busy ? 'Arrêter' : 'Écouter'}</span>
      </button>
      <span className="pronunciation-status" role="status">
        {status === 'error' ? 'Lecture impossible. Réessayez.' : status === 'playing' ? 'Lecture en cours' : ''}
      </span>
    </div>
  )
}
