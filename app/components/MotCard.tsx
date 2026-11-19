'use client'
import { useState } from 'react'
import PronunciationButton from './PronunciationButton'
import { hasLinguisticValue, isLearningWord } from '@/lib/curriculum'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function MotCard({ mot, onVue, dejaVu, disabled, seenLabel = 'Déjà vu' }: {
  mot: Mot
  onVue?: () => void
  dejaVu?: boolean
  disabled?: boolean
  seenLabel?: string
}) {
  const [retournee, setRetournee] = useState(false)
  const [modePhon, setModePhon] = useState(false)
  if (!isLearningWord(mot)) return null

  return (
    <article className={`mot-card${retournee ? ' mot-card-revealed' : ''}${dejaVu ? ' mot-card-seen' : ''}`}>
      {!retournee ? (
        <button
          type="button"
          disabled={disabled}
          className="mot-card-face mot-card-front"
          onClick={() => {
            setRetournee(true)
            onVue?.()
          }}
          aria-label={`Révéler la traduction Dendi de ${mot.fr}`}
        >
          <span className="mot-card-french">{mot.fr}</span>
          <span className="mot-card-hint">
            {dejaVu ? `✓ ${seenLabel}` : 'Toucher pour révéler'}
          </span>
        </button>
      ) : (
        <div className="mot-card-face mot-card-back" aria-live="polite">
          <p className="mot-card-dendi">
            {modePhon && hasLinguisticValue(mot.phonetique) ? mot.phonetique : mot.dendi}
          </p>
          {hasLinguisticValue(mot.phonetique) && <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setModePhon(!modePhon) }}
            className="mot-card-text-action"
          >
            {modePhon ? 'Voir l\'écriture Dendi' : 'Voir la phonétique'}
          </button>}
          <PronunciationButton wordId={mot.id} word={mot.dendi} />
          <div className="mot-card-divider" aria-hidden="true" />
          <p className="mot-card-reminder">{mot.fr}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRetournee(false); setModePhon(false) }}
            className="mot-card-hide"
          >
            Cacher
          </button>
        </div>
      )}
    </article>
  )
}
