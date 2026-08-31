'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { isNiveauId } from '@/lib/curriculum'

const ONBOARDING_KEY = 'dendi:onboarding-complete'
const LEVEL_KEY = 'dendi-guided-level'
const RESUME_KEY = 'dendi-guided-resume'
const ONBOARDING_EVENT = 'dendi-onboarding-change'

type StartState = {
  returning: boolean
  href: string
}

const START_SERVER_STATE: StartState = { returning: false, href: '/bienvenue' }
let lastSnapshot = ''
let lastState: StartState = START_SERVER_STATE

function subscribeToStartState(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(ONBOARDING_EVENT, callback)
  window.addEventListener('dendi-guided-resume', callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(ONBOARDING_EVENT, callback)
    window.removeEventListener('dendi-guided-resume', callback)
  }
}

function getStartState(): StartState {
  try {
    const onboardingComplete = window.localStorage.getItem(ONBOARDING_KEY) === 'true'
    const storedLevel = window.localStorage.getItem(LEVEL_KEY)
    const resumeLesson = window.localStorage.getItem(RESUME_KEY)
    const returning = onboardingComplete || isNiveauId(storedLevel ?? undefined) || Boolean(resumeLesson)
    const href = isNiveauId(storedLevel ?? undefined)
      ? `/parcours?niveau=${storedLevel}`
      : returning ? '/parcours' : '/bienvenue'
    const snapshot = `${returning}:${href}`

    if (snapshot !== lastSnapshot) {
      lastSnapshot = snapshot
      lastState = { returning, href }
    }

    return lastState
  } catch {
    return lastState
  }
}

function getStartServerSnapshot(): StartState {
  return START_SERVER_STATE
}

export default function LearningStartLink() {
  const state = useSyncExternalStore(
    subscribeToStartState,
    getStartState,
    getStartServerSnapshot,
  )

  return (
    <Link href={state.href} className="home-cta-primary">
      {state.returning ? 'Continuer mon parcours' : 'Commencer'}
      <span aria-hidden="true">→</span>
    </Link>
  )
}
