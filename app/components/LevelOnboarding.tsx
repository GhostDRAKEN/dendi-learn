'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { isNiveauId, type NiveauId } from '@/lib/curriculum'

const LEVEL_KEY = 'dendi-guided-level'
const ONBOARDING_KEY = 'dendi:onboarding-complete'
const ONBOARDING_EVENT = 'dendi-onboarding-change'

const LEVELS: Array<{
  label: string
  slug: NiveauId
  description: string
  topics: string
}> = [
  {
    label: 'Débutant',
    slug: 'debutant',
    description: 'Je débute en Dendi ou je connais seulement quelques mots.',
    topics: 'Salutations · temps essentiel · couleurs',
  },
  {
    label: 'Intermédiaire',
    slug: 'intermediaire',
    description: 'Je comprends déjà du vocabulaire courant et je veux aller plus loin.',
    topics: 'Calendrier · verbes · prépositions',
  },
  {
    label: 'Avancé',
    slug: 'avance',
    description: 'Je connais déjà beaucoup de mots et je veux consolider et enrichir mes connaissances.',
    topics: 'Corps humain · noms et adjectifs',
  },
]

function LevelMark({ level }: { level: NiveauId }) {
  if (level === 'debutant') {
    return (
      <svg viewBox="0 0 48 48" className="level-mark" aria-hidden="true">
        <path d="M24 22c-5-3-6-10 0-14 6 4 5 11 0 14Z" />
        <path d="M27 23c1-6 8-9 13-5 0 6-6 10-13 7Z" />
        <path d="M27 27c6-2 11 3 9 9-6 2-11-2-11-8Z" />
        <path d="M21 27c1 6-4 11-10 8-1-6 4-10 10-10Z" />
        <path d="M21 23c-6 2-11-2-10-8 6-3 11 1 12 7Z" />
        <circle cx="24" cy="24.5" r="3.5" className="level-mark-node" />
      </svg>
    )
  }

  if (level === 'intermediaire') {
    return (
      <svg viewBox="0 0 48 48" className="level-mark" aria-hidden="true">
        <path d="M10 37V23c0-8 6-14 14-14s14 6 14 14v14" />
        <path d="M17 37V24c0-4 3-7 7-7s7 3 7 7v13" />
        <path d="M7 37h34" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 48" className="level-mark" aria-hidden="true">
      <path d="M6 16c4-4 8-4 12 0s8 4 12 0 8-4 12 0" />
      <path d="M6 24c4-4 8-4 12 0s8 4 12 0 8-4 12 0" />
      <path d="M10 32c4-4 8-4 12 0s8 4 12 0" />
    </svg>
  )
}

let volatileLevel: NiveauId | null = null

function subscribeToLevel(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('dendi-guided-resume', callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('dendi-guided-resume', callback)
  }
}

function getStoredLevel() {
  try {
    return window.localStorage.getItem(LEVEL_KEY) ?? volatileLevel
  } catch {
    return volatileLevel
  }
}

function getStoredLevelServerSnapshot() {
  return null
}

function storeLevel(level: NiveauId) {
  volatileLevel = level
  try {
    window.localStorage.setItem(LEVEL_KEY, level)
  } catch {
    // La sélection reste utilisable pour la session si le stockage local est indisponible.
  }
  window.dispatchEvent(new Event('dendi-guided-resume'))
}

export default function LevelOnboarding({ recommendedLevel }: { recommendedLevel: NiveauId | null }) {
  const storedLevel = useSyncExternalStore(
    subscribeToLevel,
    getStoredLevel,
    getStoredLevelServerSnapshot,
  )
  const storedSelection: NiveauId | null = storedLevel && isNiveauId(storedLevel)
    ? storedLevel
    : null
  const selectedLevel = storedSelection ?? recommendedLevel
  const selectedLabel = LEVELS.find((level) => level.slug === selectedLevel)?.label

  const completeOnboarding = (level: NiveauId) => {
    storeLevel(level)
    try {
      window.localStorage.setItem(ONBOARDING_KEY, 'true')
    } catch {
      // Le parcours reste accessible si le stockage local est indisponible.
    }
    window.dispatchEvent(new Event(ONBOARDING_EVENT))
  }

  return (
    <section className="levels-content" aria-labelledby="levels-title">
      <div className="levels-intro">
        <p className="levels-eyebrow">Votre point de départ</p>
        <h2 id="levels-title" className="levels-title">Commençons par votre niveau</h2>
        <p className="levels-subtitle">
          Choisissez le point de départ qui vous correspond le mieux. Vous pourrez le changer plus tard.
        </p>
      </div>

      <div className="levels-grid" role="group" aria-label="Choisir votre niveau">
        {LEVELS.map((level) => {
          const selected = selectedLevel === level.slug

          return (
            <button
              key={level.slug}
              type="button"
              className={`level-card level-card-${level.slug}${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => storeLevel(level.slug)}
            >
              <span className="level-card-icon" aria-hidden="true">
                <LevelMark level={level.slug} />
              </span>
              <span className="level-card-heading">
                <strong className="level-card-title">{level.label}</strong>
                {level.slug === 'debutant' && (
                  <small>Recommandé si vous hésitez</small>
                )}
              </span>
              <span className="level-card-description">{level.description}</span>
              <span className="level-card-topics">{level.topics}</span>
              <span className="level-card-selection" aria-hidden="true">
                {selected ? '✓ Sélectionné' : 'Choisir'}
              </span>
            </button>
          )
        })}
      </div>

      <button type="button" className="levels-unsure-button" onClick={() => storeLevel('debutant')}>
        <span>Je ne sais pas quel niveau choisir</span>
        <strong>Commencer par les bases</strong>
      </button>

      <div className={`levels-confirmation${selectedLevel ? ' has-selection' : ''}`} aria-live="polite">
        <p>
          {selectedLabel
            ? `${selectedLabel} sélectionné — votre progression existante restera intacte.`
            : 'Sélectionnez le point de départ qui vous correspond.'}
        </p>
        {selectedLevel ? (
          <Link
            href={`/parcours?niveau=${selectedLevel}`}
            className="levels-primary-action"
            onClick={() => completeOnboarding(selectedLevel)}
          >
            Commencer mon parcours <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <button type="button" className="levels-primary-action is-disabled" disabled>
            Commencer mon parcours
          </button>
        )}
      </div>
    </section>
  )
}
