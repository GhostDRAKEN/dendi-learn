'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { isNiveauId, type NiveauId } from '@/lib/curriculum'
import { useSoundFeedback } from './SoundProvider'

type RelationshipId = 'discover' | 'some-words' | 'speaker'

const ONBOARDING_KEY = 'dendi:onboarding-complete'
const LEVEL_KEY = 'dendi-guided-level'
const RESUME_KEY = 'dendi-guided-resume'

function subscribeToOnboarding(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('dendi-onboarding-change', callback)
  window.addEventListener('dendi-guided-resume', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('dendi-onboarding-change', callback)
    window.removeEventListener('dendi-guided-resume', callback)
  }
}

function getOnboardingSnapshot() {
  try {
    const storedLevel = window.localStorage.getItem(LEVEL_KEY)
    const returning = window.localStorage.getItem(ONBOARDING_KEY) === 'true'
      || isNiveauId(storedLevel ?? undefined)
      || Boolean(window.localStorage.getItem(RESUME_KEY))
    const href = isNiveauId(storedLevel ?? undefined)
      ? `/parcours?niveau=${storedLevel}`
      : '/parcours'
    return returning ? `returning:${href}` : 'new'
  } catch {
    return 'new'
  }
}

function getOnboardingServerSnapshot() {
  return 'new'
}

const RELATIONSHIPS: Array<{
  id: RelationshipId
  label: string
  detail: string
  recommended: NiveauId
  recommendation: string
}> = [
  {
    id: 'discover',
    label: 'Je découvre complètement la langue',
    detail: 'Commencez tranquillement par les bases.',
    recommended: 'debutant',
    recommendation: 'Débutant conseillé',
  },
  {
    id: 'some-words',
    label: 'Je connais déjà quelques mots',
    detail: 'Un point de départ intermédiaire peut vous convenir.',
    recommended: 'intermediaire',
    recommendation: 'Intermédiaire suggéré',
  },
  {
    id: 'speaker',
    label: 'Je parle déjà Dendi',
    detail: 'Choisissez librement où approfondir l’écrit et le vocabulaire.',
    recommended: 'avance',
    recommendation: 'Avancé suggéré',
  },
]

export default function WelcomeOnboarding() {
  const [step, setStep] = useState<'welcome' | 'relationship'>('welcome')
  const [relationship, setRelationship] = useState<RelationshipId | null>(null)
  const router = useRouter()
  const { playSound } = useSoundFeedback()
  const welcomeTitleRef = useRef<HTMLHeadingElement>(null)
  const relationshipTitleRef = useRef<HTMLHeadingElement>(null)
  const stepChangedRef = useRef(false)
  const onboardingState = useSyncExternalStore(
    subscribeToOnboarding,
    getOnboardingSnapshot,
    getOnboardingServerSnapshot,
  )
  const selected = RELATIONSHIPS.find((item) => item.id === relationship)

  useEffect(() => {
    if (onboardingState.startsWith('returning:')) {
      router.replace(onboardingState.slice('returning:'.length))
    }
  }, [onboardingState, router])

  useEffect(() => {
    if (!stepChangedRef.current) return
    const title = step === 'welcome' ? welcomeTitleRef.current : relationshipTitleRef.current
    title?.focus()
    stepChangedRef.current = false
  }, [step])

  const startDiscovery = () => {
    void playSound('welcome')
    stepChangedRef.current = true
    setStep('relationship')
  }

  const goBack = () => {
    stepChangedRef.current = true
    setStep('welcome')
  }

  if (onboardingState.startsWith('returning:')) {
    return (
      <section className="welcome-content" aria-live="polite">
        <p className="welcome-loading">Reprise de votre parcours…</p>
      </section>
    )
  }

  return (
    <section className="welcome-content">
      {step === 'welcome' ? (
        <div className="welcome-panel is-intro" aria-labelledby="welcome-title">
          <p className="welcome-eyebrow">Dendi-Learn</p>
          <h2 ref={welcomeTitleRef} id="welcome-title" tabIndex={-1}>Bienvenue</h2>
          <p className="welcome-lead">
            Découvrez le Dendi progressivement, avec des leçons courtes et un rythme qui vous appartient.
          </p>
          <ul className="welcome-promises" aria-label="Ce que propose Dendi-Learn">
            <li>Découvrir la langue</li>
            <li>Apprendre progressivement</li>
            <li>Avancer à votre rythme</li>
          </ul>
          <button type="button" className="welcome-primary-action" onClick={startDiscovery}>
            Commencer <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <div className="welcome-panel is-relationship" aria-labelledby="relationship-title">
          <p className="welcome-eyebrow">Votre point de départ</p>
          <h2 ref={relationshipTitleRef} id="relationship-title" tabIndex={-1}>
            Quel est votre rapport avec le Dendi&nbsp;?
          </h2>
          <p className="welcome-lead">
            Cette réponse nous aide seulement à suggérer un niveau. Vous garderez toujours le choix.
          </p>

          <div className="relationship-options" role="group" aria-labelledby="relationship-title">
            {RELATIONSHIPS.map((item) => {
              const active = item.id === relationship
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`relationship-option${active ? ' is-selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => setRelationship(item.id)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                  <small>{item.recommendation}</small>
                </button>
              )
            })}
          </div>

          <div className="welcome-actions">
            <button type="button" className="welcome-back-action" onClick={goBack}>
              <span aria-hidden="true">←</span> Retour
            </button>
            {selected ? (
              <Link
                href={`/niveaux?recommended=${selected.recommended}`}
                className="welcome-primary-action"
              >
                Choisir mon niveau <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <button type="button" className="welcome-primary-action is-disabled" disabled>
                Choisir mon niveau
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
